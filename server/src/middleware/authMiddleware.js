import { verifyAccessToken } from '../utilities/jwt.js'
import { httpError } from '../utilities/httpError.js'

const validRoles = new Set(['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN'])

export function requireAuth(request, response, next) {
  const header = request.get('authorization')
  if (!header || !header.startsWith('Bearer ')) return next(httpError(401, 'Authentication required'))

  const token = header.slice('Bearer '.length).trim()
  if (!token) return next(httpError(401, 'Authentication required'))

  try {
    const payload = verifyAccessToken(token)
    if (typeof payload.sub !== 'string' || !validRoles.has(payload.role)) {
      return next(httpError(401, 'Invalid or expired token'))
    }
    request.auth = { userId: payload.sub, role: payload.role, email: payload.email }
    return next()
  } catch {
    return next(httpError(401, 'Invalid or expired token'))
  }
}

export function authorizeRoles(...allowedRoles) {
  const allowed = new Set(allowedRoles)
  return (request, response, next) => {
    if (!request.auth) return next(httpError(401, 'Authentication required'))
    if (!allowed.has(request.auth.role)) return next(httpError(403, 'You do not have permission to access this resource'))
    return next()
  }
}

export function authorizeSelfOrRoles(parameterName, ...allowedRoles) {
  const allowed = new Set(allowedRoles)
  return (request, response, next) => {
    if (!request.auth) return next(httpError(401, 'Authentication required'))
    if (request.auth.userId === request.params[parameterName] || allowed.has(request.auth.role)) return next()
    return next(httpError(403, 'You do not have permission to access this resource'))
  }
}