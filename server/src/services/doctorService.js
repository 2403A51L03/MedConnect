import { prisma } from '../database/prisma.js'
import { httpError } from '../utilities/httpError.js'
import { hashPassword } from '../utilities/password.js'
import { emitToUser } from '../realtime/hub.js'

const doctorSelect = {
  id: true,
  specialization: true,
  availability: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
}

function toDoctorSummary(profile) {
  const availability = profile.availability ?? (profile.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE')
  return {
    id: profile.id,
    userId: profile.user.id,
    name: profile.user.name,
    email: profile.user.email,
    phone: profile.user.phone,
    specialization: profile.specialization,
    availability,
    isAvailable: availability === 'AVAILABLE',
  }
}

export function createDoctorService(database = prisma) {
  return {
    async list({ search, specialty, available }) {
      const where = {}
      if (available !== undefined) where.availability = available ? 'AVAILABLE' : { not: 'AVAILABLE' }
      if (specialty) where.specialization = { contains: specialty, mode: 'insensitive' }
      if (search) {
        where.user = { name: { contains: search, mode: 'insensitive' } }
      }
      const profiles = await database.doctorProfile.findMany({ where, orderBy: { user: { name: 'asc' } }, select: doctorSelect })
      return profiles.map(toDoctorSummary)
    },

    async getById(id) {
      const profile = await database.doctorProfile.findUnique({ where: { id }, select: doctorSelect })
      if (!profile) throw httpError(404, 'Doctor not found')
      return toDoctorSummary(profile)
    },

    async create(input) {
      const existing = await database.user.findUnique({ where: { email: input.email }, select: { id: true } })
      if (existing) throw httpError(409, 'An account with that email already exists')
      const normalizedAvailability = input.availability ?? (input.isAvailable === false ? 'UNAVAILABLE' : 'AVAILABLE')
      const passwordHash = await hashPassword(input.password)
      const profile = await database.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: { name: input.name, email: input.email, passwordHash, role: 'DOCTOR', phone: input.phone },
        })
        return transaction.doctorProfile.create({
          data: { userId: user.id, specialization: input.specialization, availability: normalizedAvailability },
          select: doctorSelect,
        })
      })
      return toDoctorSummary(profile)
    },

    async update(id, input) {
      const profile = await database.doctorProfile.findUnique({ where: { id }, select: { userId: true } })
      if (!profile) throw httpError(404, 'Doctor not found')
      const { name, phone, specialization } = input
      const availability = input.availability ?? (input.isAvailable !== undefined ? (input.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE') : undefined)
      await database.user.update({ where: { id: profile.userId }, data: { ...(name !== undefined && { name }), ...(phone !== undefined && { phone }) } })
      const updated = await database.doctorProfile.update({
        where: { id },
        data: { ...(specialization !== undefined && { specialization }), ...(availability !== undefined && { availability }) },
        select: doctorSelect,
      })
      const summary = toDoctorSummary(updated)
      emitToUser(summary.userId, 'doctor:availability-changed', { doctor: summary })
      return summary
    },

    async schedule(id, databaseOverride = database) {
      const doctor = await databaseOverride.doctorProfile.findUnique({ where: { id }, select: { id: true } })
      if (!doctor) throw httpError(404, 'Doctor not found')
      return databaseOverride.appointment.findMany({
        where: { doctorId: id },
        orderBy: { scheduledAt: 'asc' },
        select: { id: true, scheduledAt: true, status: true },
      })
    },
  }
}

export const doctorService = createDoctorService()