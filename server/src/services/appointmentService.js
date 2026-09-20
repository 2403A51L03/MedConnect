import { prisma } from '../database/prisma.js'
import { httpError } from '../utilities/httpError.js'
import { issueQueueEntryForAppointment, isTodayUtc } from './queueService.js'
import { createNotification } from './notificationService.js'
import { emitToQueue } from '../realtime/hub.js'

const activeStatuses = { notIn: ['CANCELLED', 'NO_SHOW'] }
const appointmentInclude = {
  patient: { select: { id: true, name: true, email: true } },
  doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
  queueEntry: true,
  consultation: true,
}

function doctorCanReceiveAppointments(doctor) {
  return doctor.availability === 'AVAILABLE'
}

export function createAppointmentService(database = prisma) {
  return {
    async create(patientId, input) {
      const result = await database.$transaction(async (transaction) => {
        const doctor = await transaction.doctorProfile.findUnique({
          where: { id: input.doctorId },
          select: { id: true, availability: true },
        })
        if (!doctor) throw httpError(404, 'Doctor not found')
        if (!doctorCanReceiveAppointments(doctor)) throw httpError(409, 'This doctor is currently unavailable')

        const [doctorConflict, patientConflict] = await Promise.all([
          transaction.appointment.findFirst({ where: { doctorId: input.doctorId, scheduledAt: input.scheduledAt, status: activeStatuses }, select: { id: true } }),
          transaction.appointment.findFirst({ where: { patientId, scheduledAt: input.scheduledAt, status: activeStatuses }, select: { id: true } }),
        ])
        if (doctorConflict) throw httpError(409, 'This doctor already has an appointment at that time')
        if (patientConflict) throw httpError(409, 'You already have an appointment at that time')

        const appointment = await transaction.appointment.create({
          data: { patientId, doctorId: input.doctorId, scheduledAt: input.scheduledAt },
          include: appointmentInclude,
        })
        const queueEntry = isTodayUtc(input.scheduledAt)
          ? await issueQueueEntryForAppointment(appointment, transaction)
          : null
        return { ...appointment, queueEntry }
      })
      await createNotification(patientId, { type: 'APPOINTMENT', title: 'Appointment confirmed', message: `Your appointment with the doctor is confirmed.` })
      if (result.queueEntry) emitToQueue(result.doctor.user.id, result.queueEntry.queueDate, 'queue:updated', { appointmentId: result.id })
      return result
    },

    async createWalkIn(patientId, doctorId) {
      const scheduledAt = new Date()
      const result = await database.$transaction(async (transaction) => {
        const patient = await transaction.user.findUnique({
          where: { id: patientId },
          select: { id: true, role: true, patient: { select: { userId: true } } },
        })
        if (!patient || patient.role !== 'PATIENT' || !patient.patient) {
          throw httpError(400, 'Walk-ins can only be registered for patient accounts')
        }
        const doctor = await transaction.doctorProfile.findUnique({ where: { id: doctorId }, select: { id: true, availability: true } })
        if (!doctor) throw httpError(404, 'Doctor not found')
        if (!doctorCanReceiveAppointments(doctor)) throw httpError(409, 'This doctor is currently unavailable')
        const appointment = await transaction.appointment.create({
          data: { patientId, doctorId, scheduledAt, status: 'CHECKED_IN' },
          include: appointmentInclude,
        })
        const queueEntry = await issueQueueEntryForAppointment(appointment, transaction)
        return { ...appointment, queueEntry }
      })
      await createNotification(patientId, { type: 'APPOINTMENT', title: 'Walk-in registered', message: `Your walk-in appointment has token ${result.queueEntry.tokenNumber}.` })
      emitToQueue(result.doctor.user.id, result.queueEntry.queueDate, 'queue:updated', { appointmentId: result.id })
      return result
    },

    async listForUser(auth) {
      const where = auth.role === 'PATIENT'
        ? { patientId: auth.userId }
        : auth.role === 'DOCTOR'
          ? { doctor: { userId: auth.userId } }
          : {}
      return database.appointment.findMany({ where, orderBy: { scheduledAt: 'asc' }, include: appointmentInclude })
    },

    async cancel(appointment, auth) {
      const isOwner = appointment.patientId === auth.userId
      const isStaff = auth.role === 'RECEPTIONIST' || auth.role === 'ADMIN'
      if (!isOwner && !isStaff) throw httpError(403, 'You do not have permission to cancel this appointment')
      if (['CANCELLED', 'COMPLETED', 'IN_PROGRESS', 'NO_SHOW'].includes(appointment.status)) {
        throw httpError(409, 'This appointment cannot be cancelled in its current state')
      }
      return database.$transaction(async (transaction) => {
        const updated = await transaction.appointment.update({
          where: { id: appointment.id },
          data: { status: 'CANCELLED' },
          include: appointmentInclude,
        })
        if (appointment.queueEntry) {
          await transaction.queueEntry.update({ where: { id: appointment.queueEntry.id }, data: { status: 'CANCELLED' } })
        }
        await createNotification(appointment.patientId, { type: 'APPOINTMENT', title: 'Appointment cancelled', message: 'Your appointment has been cancelled.' }, transaction)
        return updated
      })
    },
  }
}

export const appointmentService = createAppointmentService()