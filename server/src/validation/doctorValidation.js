import { httpError } from '../utilities/httpError.js'

function optionalString(value, field) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.trim() === '') throw httpError(400, `${field} must be a non-empty string`)
  return value.trim()
}

export function validateDoctorCreation(body = {}) {
  const name = optionalString(body.name, 'name')
  const email = optionalString(body.email, 'email')?.toLowerCase()
  const password = optionalString(body.password, 'password')
  if (!name || !email || !password) throw httpError(400, 'name, email, and password are required')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'A valid email is required')
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters')

  const payload = {
    name,
    email,
    password,
    phone: optionalString(body.phone, 'phone') ?? null,
    specialization: optionalString(body.specialization, 'specialization') ?? null,
  }

  if (body.availability !== undefined) {
    if (!['AVAILABLE', 'BUSY', 'UNAVAILABLE'].includes(body.availability)) throw httpError(400, 'Invalid availability status')
    payload.availability = body.availability
  } else if (body.isAvailable !== undefined) {
    payload.isAvailable = Boolean(body.isAvailable)
  } else {
    payload.isAvailable = true
  }

  return payload
}

export function validateDoctorUpdate(body = {}) {
  const update = {}
  for (const field of ['name', 'phone', 'specialization']) {
    const value = optionalString(body[field], field)
    if (value !== undefined) update[field] = value
  }

  if (body.availability !== undefined) {
    if (!['AVAILABLE', 'BUSY', 'UNAVAILABLE'].includes(body.availability)) throw httpError(400, 'Invalid availability status')
    update.availability = body.availability
  } else if (body.isAvailable !== undefined) {
    update.isAvailable = Boolean(body.isAvailable)
  }

  if (Object.keys(update).length === 0) throw httpError(400, 'At least one doctor field must be provided')
  return update
}