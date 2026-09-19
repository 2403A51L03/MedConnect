import { asyncHandler } from '../middleware/asyncHandler.js'
import { prisma } from '../database/prisma.js'
import { getAuthorizedAppointment } from '../services/accessService.js'
import { queueService } from '../services/queueService.js'

export const getAppointment = asyncHandler(async (request, response) => {
  const appointment = await getAuthorizedAppointment(request.params.appointmentId, request.auth)
  response.json({ appointment })
})

export const getQueueEntry = asyncHandler(async (request, response) => {
  const queue = await queueService.getForAppointment(request.params.appointmentId, request.auth)
  response.json(queue)
})

export const getConsultationHistory = asyncHandler(async (request, response) => {
  const { userId } = request.params
  if (request.auth.role === 'PATIENT' && request.auth.userId !== userId) {
    throw Object.assign(new Error('You do not have permission to access this consultation history'), { statusCode: 403 })
  }
  if (request.auth.role === 'DOCTOR' && request.auth.userId !== userId) {
    throw Object.assign(new Error('You do not have permission to access this consultation history'), { statusCode: 403 })
  }

  const consultations = await prisma.consultation.findMany({
    where: { appointment: { patientId: userId } },
    orderBy: { createdAt: 'desc' },
    include: {
      appointment: {
        include: {
          doctor: { include: { user: { select: { id: true, name: true } } } },
          patient: { select: { id: true, name: true, email: true } },
        },
      },
      doctor: { include: { user: { select: { id: true, name: true } } } },
      queueEntry: true,
    },
  })

  response.json({ consultations })
})

export const updateDoctorAvailability = asyncHandler(async (request, response) => {
  const profile = await prisma.doctorProfile.findUnique({ where: { userId: request.params.userId } })
  if (!profile) return response.status(404).json({ error: 'Doctor profile not found' })
  if (!['AVAILABLE', 'BUSY', 'UNAVAILABLE'].includes(request.body.availability)) {
    return response.status(400).json({ error: 'availability must be AVAILABLE, BUSY, or UNAVAILABLE' })
  }
  const updated = await prisma.doctorProfile.update({
    where: { userId: request.params.userId },
    data: { availability: request.body.availability },
    select: { id: true, userId: true, availability: true },
  })
  response.json({ doctor: updated })
})

export const callNextPatient = asyncHandler(async (request, response) => {
  const doctorUserId = ['RECEPTIONIST', 'ADMIN'].includes(request.auth.role)
    ? request.body.doctorUserId
    : request.auth.userId
  if (typeof doctorUserId !== 'string' || doctorUserId.trim() === '') {
    return response.status(400).json({ error: 'doctorUserId is required for staff queue actions' })
  }
  const queueEntry = await queueService.callNext(doctorUserId)
  response.json({ queueEntry })
})

export const listUserAppointments = asyncHandler(async (request, response) => {
  const appointments = await prisma.appointment.findMany({
    where: {
      OR: [
        { patientId: request.params.userId },
        { doctor: { userId: request.params.userId } },
      ],
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      doctor: { include: { user: { select: { id: true, name: true } } } },
      queueEntry: true,
      consultation: true,
    },
  })
  response.json({ appointments })
})

export const listDoctorQueue = asyncHandler(async (request, response) => {
  const queue = await queueService.listForDoctor(request.params.userId)
  response.json({ queue })
})

export const startConsultation = asyncHandler(async (request, response) => {
  response.json(await queueService.startConsultation(request.auth.userId, request.params.queueEntryId))
})

export const completeConsultation = asyncHandler(async (request, response) => {
  response.json(await queueService.completeConsultation(request.auth.userId, request.params.queueEntryId, request.body.notes))
})

export const getNotifications = asyncHandler(async (request, response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: request.params.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, type: true, title: true, message: true, readAt: true, createdAt: true },
  })
  response.json({ notifications })
})

export const listPatients = asyncHandler(async (request, response) => {
  const patients = await prisma.user.findMany({
    where: { role: 'PATIENT' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  })
  response.json({ patients })
})