import { prisma } from '../database/prisma.js'
import { httpError } from '../utilities/httpError.js'
import { createNotification } from './notificationService.js'
import { emitToQueue, emitToUser } from '../realtime/hub.js'

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function isTodayUtc(date) {
  return startOfUtcDay(date).getTime() === startOfUtcDay(new Date()).getTime()
}

export async function issueQueueEntryForAppointment(appointment, database) {
  const queueDate = startOfUtcDay(appointment.scheduledAt)
  const latest = await database.queueEntry.aggregate({ where: { queueDate }, _max: { tokenNumber: true } })
  const tokenNumber = (latest._max.tokenNumber || 0) + 1
  try {
    return await database.queueEntry.create({ data: { appointmentId: appointment.id, tokenNumber, queueDate } })
  } catch (error) {
    if (error.code === 'P2002') throw httpError(409, 'A queue token conflict occurred; please retry the booking')
    throw error
  }
}

const queueInclude = {
  appointment: {
    include: {
      patient: { select: { id: true, name: true, email: true } },
      doctor: { include: { user: { select: { id: true, name: true } } } },
    },
  },
  consultation: true,
}

function doctorIsAvailable(doctor) {
  return doctor.availability !== undefined ? doctor.availability === 'AVAILABLE' : doctor.isAvailable
}

async function assignedQueueEntry(doctorUserId, queueEntryId, database) {
  const entry = await database.queueEntry.findUnique({ where: { id: queueEntryId }, include: queueInclude })
  if (!entry) throw httpError(404, 'Queue entry not found')
  if (entry.appointment.doctor.user.id !== doctorUserId) throw httpError(403, 'This queue entry is assigned to another doctor')
  return entry
}

async function emitQueueUpdates(doctorId, queueDate, database) {
  if (!database?.queueEntry?.findMany) return
  const entries = await database.queueEntry.findMany({
    where: { queueDate, appointment: { doctorId, status: { notIn: ['CANCELLED', 'NO_SHOW'] } } },
    select: { id: true, appointment: { select: { patientId: true } } },
  })
  for (const entry of entries) emitToUser(entry.appointment.patientId, 'queue:updated', { queueEntryId: entry.id })
}

export function createQueueService(database = prisma) {
  return {
    async getForAppointment(appointmentId, auth) {
      const entry = await database.queueEntry.findUnique({ where: { appointmentId }, include: queueInclude })
      if (!entry) throw httpError(404, 'Queue entry not found')
      const isPatient = entry.appointment.patient.id === auth.userId
      const isDoctor = entry.appointment.doctor.user.id === auth.userId
      const isStaff = auth.role === 'RECEPTIONIST' || auth.role === 'ADMIN'
      if (!isPatient && !isDoctor && !isStaff) throw httpError(403, 'You do not have permission to view this queue entry')
      return this.getStatus(entry, database)
    },

    async getStatus(entry, databaseOverride = database) {
      const ahead = await databaseOverride.queueEntry.count({
        where: {
          queueDate: entry.queueDate,
          status: 'WAITING',
          tokenNumber: { lt: entry.tokenNumber },
          appointment: { doctorId: entry.appointment.doctorId, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
        },
      })
      const current = await databaseOverride.queueEntry.findFirst({
        where: { queueDate: entry.queueDate, status: { in: ['CALLED', 'IN_PROGRESS'] }, appointment: { doctorId: entry.appointment.doctorId } },
        orderBy: { tokenNumber: 'asc' },
        include: queueInclude,
      })
      const next = await databaseOverride.queueEntry.findFirst({
        where: { queueDate: entry.queueDate, status: 'WAITING', appointment: { doctorId: entry.appointment.doctorId, status: { notIn: ['CANCELLED', 'NO_SHOW'] } } },
        orderBy: { tokenNumber: 'asc' },
        include: queueInclude,
      })
      return { queueEntry: entry, position: entry.status === 'WAITING' ? ahead + 1 : null, currentPatient: current?.appointment.patient || null, nextPatient: next?.appointment.patient || null }
    },

    async listForDoctor(doctorUserId, databaseOverride = database) {
      const doctor = await databaseOverride.doctorProfile.findUnique({ where: { userId: doctorUserId }, select: { id: true, availability: true } })
      if (!doctor) throw httpError(404, 'Doctor profile not found')
      return databaseOverride.queueEntry.findMany({ where: { appointment: { doctorId: doctor.id }, queueDate: startOfUtcDay(new Date()) }, orderBy: { tokenNumber: 'asc' }, include: queueInclude })
    },

    async callNext(doctorUserId, databaseOverride = database) {
      const doctor = await databaseOverride.doctorProfile.findUnique({ where: { userId: doctorUserId }, select: { id: true, availability: true } })
      if (!doctor) throw httpError(404, 'Doctor profile not found')
      if (!doctorIsAvailable(doctor)) throw httpError(409, 'Doctor is unavailable and cannot call the queue')
      return databaseOverride.$transaction(async (transaction) => {
        const current = await transaction.queueEntry.findFirst({ where: { queueDate: startOfUtcDay(new Date()), status: 'IN_PROGRESS', appointment: { doctorId: doctor.id } }, select: { id: true } })
        if (current) throw httpError(409, 'Complete the current consultation before calling the next patient')
        const next = await transaction.queueEntry.findFirst({ where: { queueDate: startOfUtcDay(new Date()), status: 'WAITING', appointment: { doctorId: doctor.id, status: { notIn: ['CANCELLED', 'NO_SHOW'] } } }, orderBy: { tokenNumber: 'asc' }, select: { id: true } })
        if (!next) throw httpError(404, 'No waiting patients in the queue')
        const called = await transaction.queueEntry.update({ where: { id: next.id }, data: { status: 'CALLED', calledAt: new Date() }, include: queueInclude })
        await createNotification(called.appointment.patient.id, { type: 'QUEUE', title: 'Your turn is ready', message: `Token ${called.tokenNumber} has been called.` }, transaction)
        emitToUser(called.appointment.patient.id, 'queue:called', { queueEntryId: called.id, tokenNumber: called.tokenNumber })
        emitToQueue(doctorUserId, called.queueDate, 'queue:updated', { queueEntryId: called.id })
        await emitQueueUpdates(doctor.id, called.queueDate, databaseOverride)
        return called
      })
    },

    async startConsultation(doctorUserId, queueEntryId, databaseOverride = database) {
      const entry = await assignedQueueEntry(doctorUserId, queueEntryId, databaseOverride)
      if (entry.status !== 'CALLED') throw httpError(409, 'Only a called patient can start a consultation')
      return databaseOverride.$transaction(async (transaction) => {
        const now = new Date()
        const updatedEntry = await transaction.queueEntry.update({ where: { id: queueEntryId }, data: { status: 'IN_PROGRESS', startedAt: now } })
        const consultation = await transaction.consultation.upsert({ where: { appointmentId: entry.appointmentId }, update: { status: 'IN_PROGRESS', startedAt: now }, create: { appointmentId: entry.appointmentId, queueEntryId, doctorId: entry.appointment.doctorId, status: 'IN_PROGRESS', startedAt: now } })
        await transaction.appointment.update({ where: { id: entry.appointmentId }, data: { status: 'IN_PROGRESS' } })
        if (transaction.doctorProfile?.update) await transaction.doctorProfile.update({ where: { id: entry.appointment.doctorId }, data: { availability: 'BUSY' } })
        await createNotification(entry.appointment.patient.id, { type: 'CONSULTATION', title: 'Consultation started', message: 'Your consultation has started.' }, transaction)
        emitToUser(entry.appointment.patient.id, 'consultation:available', { queueEntryId })
        emitToQueue(doctorUserId, entry.queueDate, 'queue:updated', { queueEntryId })
        await emitQueueUpdates(entry.appointment.doctorId, entry.queueDate, databaseOverride)
        return { queueEntry: updatedEntry, consultation }
      })
    },

    async completeConsultation(doctorUserId, queueEntryId, notes, databaseOverride = database) {
      const entry = await assignedQueueEntry(doctorUserId, queueEntryId, databaseOverride)
      if (entry.status !== 'IN_PROGRESS' || !entry.consultation) throw httpError(409, 'Only an active consultation can be completed')
      return databaseOverride.$transaction(async (transaction) => {
        const completedAt = new Date()
        const queueEntry = await transaction.queueEntry.update({ where: { id: queueEntryId }, data: { status: 'COMPLETED', completedAt } })
        const consultation = await transaction.consultation.update({ where: { id: entry.consultation.id }, data: { status: 'COMPLETED', endedAt: completedAt, ...(notes !== undefined && { notes }) } })
        const appointment = await transaction.appointment.update({ where: { id: entry.appointmentId }, data: { status: 'COMPLETED' } })
        if (transaction.doctorProfile?.update) await transaction.doctorProfile.update({ where: { id: entry.appointment.doctorId }, data: { availability: 'AVAILABLE' } })
        const nextQueueEntry = await transaction.queueEntry.findFirst({
          where: { queueDate: entry.queueDate, status: 'WAITING', appointment: { doctorId: entry.appointment.doctorId, status: { notIn: ['CANCELLED', 'NO_SHOW'] } } },
          orderBy: { tokenNumber: 'asc' },
          include: queueInclude,
        })
        const advancedQueueEntry = nextQueueEntry
          ? await transaction.queueEntry.update({ where: { id: nextQueueEntry.id }, data: { status: 'CALLED', calledAt: completedAt }, include: queueInclude })
          : null
        if (advancedQueueEntry?.appointment?.patient) {
          await createNotification(advancedQueueEntry.appointment.patient.id, { type: 'QUEUE', title: 'Your turn is ready', message: `Token ${advancedQueueEntry.tokenNumber} has been called.` }, transaction)
          emitToUser(advancedQueueEntry.appointment.patient.id, 'queue:called', { queueEntryId: advancedQueueEntry.id, tokenNumber: advancedQueueEntry.tokenNumber })
        }
        await createNotification(entry.appointment.patient.id, { type: 'CONSULTATION', title: 'Consultation completed', message: 'Your consultation has been completed.' }, transaction)
        emitToQueue(doctorUserId, entry.queueDate, 'queue:updated', { queueEntryId, nextQueueEntryId: advancedQueueEntry?.id || null })
        await emitQueueUpdates(entry.appointment.doctorId, entry.queueDate, databaseOverride)
        return { queueEntry, consultation, appointment, nextQueueEntry: advancedQueueEntry }
      })
    },
  }
}

export const queueService = createQueueService()
