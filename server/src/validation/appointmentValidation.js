import { httpError } from '../utilities/httpError.js'

export function validateAppointmentCreation(body = {}) {
  if (typeof body.doctorId !== 'string' || body.doctorId.trim() === '') throw httpError(400, 'doctorId is required')
  if (typeof body.scheduledAt !== 'string' || body.scheduledAt.trim() === '') throw httpError(400, 'scheduledAt is required')

  const scheduledAt = new Date(body.scheduledAt)
  if (Number.isNaN(scheduledAt.getTime())) throw httpError(400, 'scheduledAt must be a valid date and time')
  if (scheduledAt.getTime() <= Date.now()) throw httpError(400, 'Appointments must be scheduled in the future')

  return { doctorId: body.doctorId.trim(), scheduledAt }
}