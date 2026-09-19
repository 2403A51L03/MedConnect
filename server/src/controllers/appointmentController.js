import { asyncHandler } from '../middleware/asyncHandler.js'
import { getAuthorizedAppointment } from '../services/accessService.js'
import { appointmentService } from '../services/appointmentService.js'
import { validateAppointmentCreation } from '../validation/appointmentValidation.js'

export const createAppointment = asyncHandler(async (request, response) => {
  const appointment = await appointmentService.create(request.auth.userId, validateAppointmentCreation(request.body))
  response.status(201).json({ appointment, confirmation: { appointmentId: appointment.id, queueToken: appointment.queueEntry?.tokenNumber || null } })
})

export const listAppointments = asyncHandler(async (request, response) => {
  response.json({ appointments: await appointmentService.listForUser(request.auth) })
})

export const getAppointmentDetails = asyncHandler(async (request, response) => {
  response.json({ appointment: await getAuthorizedAppointment(request.params.appointmentId, request.auth) })
})

export const cancelAppointment = asyncHandler(async (request, response) => {
  const appointment = await getAuthorizedAppointment(request.params.appointmentId, request.auth)
  response.json({ appointment: await appointmentService.cancel(appointment, request.auth) })
})

export const createWalkInAppointment = asyncHandler(async (request, response) => {
  const { patientId, doctorId } = request.body
  if (typeof patientId !== 'string' || typeof doctorId !== 'string') {
    return response.status(400).json({ error: 'patientId and doctorId are required' })
  }
  const appointment = await appointmentService.createWalkIn(patientId, doctorId)
  response.status(201).json({ appointment, confirmation: { appointmentId: appointment.id, queueToken: appointment.queueEntry.tokenNumber } })
})