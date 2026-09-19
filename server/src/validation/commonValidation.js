import { httpError } from '../utilities/httpError.js'

export function validateId(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw httpError(400, `${fieldName} is required`)
  }
  const trimmed = value.trim()
  if (trimmed.length < 3) {
    throw httpError(400, `${fieldName} is invalid`)
  }
  return trimmed
}

export function validateUserId(value) {
  return validateId(value, 'userId')
}

export function validateDoctorId(value) {
  return validateId(value, 'doctorId')
}

export function validateAppointmentId(value) {
  return validateId(value, 'appointmentId')
}

export function validateQueueEntryId(value) {
  return validateId(value, 'queueEntryId')
}
