import { httpError } from '../utilities/httpError.js'

const roles = new Set(['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN'])

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw httpError(400, `${field} is required`)
  }
  return value.trim()
}

export function validateRegistration(body = {}) {
  const name = requiredString(body.name, 'name')
  const email = requiredString(body.email, 'email').toLowerCase()
  const password = requiredString(body.password, 'password')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'A valid email is required')
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters')
  return { name, email, password, phone: typeof body.phone === 'string' ? body.phone.trim() : null }
}

export function validateLogin(body = {}) {
  return {
    email: requiredString(body.email, 'email').toLowerCase(),
    password: requiredString(body.password, 'password'),
  }
}

export function validateRole(role) {
  if (role && !roles.has(role)) throw httpError(400, 'Invalid role')
  return role
}