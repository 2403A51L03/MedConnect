import assert from 'node:assert/strict'
import { test } from 'node:test'
import jwt from 'jsonwebtoken'
import { env } from '../src/config/env.js'
import { authorizeRoles, authorizeSelfOrRoles, requireAuth } from '../src/middleware/authMiddleware.js'
import { createAuthService } from '../src/services/authService.js'
import { createAccessToken } from '../src/utilities/jwt.js'
import { hashPassword } from '../src/utilities/password.js'

const baseUser = {
  id: 'user-1',
  name: 'Test Patient',
  email: 'patient@example.com',
  role: 'PATIENT',
  phone: null,
  createdAt: new Date('2026-09-06T00:00:00.000Z'),
}

function createFakeDatabase(user = null) {
  return {
    user: {
      findUnique: async () => user,
      create: async ({ data, select }) => ({ ...baseUser, ...data, passwordHash: undefined, ...select }),
    },
    patientProfile: { create: async () => ({}) },
    $transaction: async (callback) => callback({
      user: {
        create: async ({ data }) => ({ ...baseUser, ...data }),
      },
      patientProfile: { create: async () => ({}) },
    }),
  }
}

function runMiddleware(token) {
  const request = { get: () => token ? `Bearer ${token}` : undefined }
  let nextError
  const next = (error) => { nextError = error }
  requireAuth(request, {}, next)
  return { request, nextError }
}

test('valid patient registration returns a token and safe user data', async () => {
  const service = createAuthService(createFakeDatabase())
  const result = await service.registerPatient({ name: 'New Patient', email: 'new@example.com', password: 'Password123!', phone: null })
  assert.ok(result.token)
  assert.equal(result.user.role, 'PATIENT')
  assert.equal('passwordHash' in result.user, false)
})

test('duplicate registration is rejected', async () => {
  const service = createAuthService(createFakeDatabase({ id: 'existing-user' }))
  await assert.rejects(
    service.registerPatient({ name: 'Existing', email: 'patient@example.com', password: 'Password123!' }),
    (error) => error.statusCode === 409,
  )
})

test('valid login works and invalid passwords fail', async () => {
  const passwordHash = await hashPassword('Password123!')
  for (const role of ['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN']) {
    const service = createAuthService(createFakeDatabase({ ...baseUser, role, passwordHash }))
    const result = await service.login({ email: baseUser.email, password: 'Password123!' })
    assert.equal(result.user.role, role)
    assert.equal(result.user.email, baseUser.email)
  }

  const service = createAuthService(createFakeDatabase({ ...baseUser, passwordHash }))
  await assert.rejects(
    service.login({ email: baseUser.email, password: 'WrongPassword!' }),
    (error) => error.statusCode === 401,
  )
})

test('valid, missing, invalid, and expired tokens are handled', () => {
  const valid = runMiddleware(createAccessToken(baseUser))
  assert.equal(valid.nextError, undefined)
  assert.equal(valid.request.auth.userId, baseUser.id)

  assert.equal(runMiddleware().nextError.statusCode, 401)
  assert.equal(runMiddleware('not-a-token').nextError.statusCode, 401)

  const expired = jwt.sign({ role: baseUser.role }, env.jwtSecret, { subject: baseUser.id, expiresIn: -1 })
  assert.equal(runMiddleware(expired).nextError.statusCode, 401)
})

function runPolicy(policy, auth, params = {}) {
  let nextError
  policy({ auth, params }, {}, (error) => { nextError = error })
  return nextError
}

test('role policies allow every supported role only where intended', () => {
  const roles = ['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN']
  for (const role of roles) {
    const auth = { userId: `${role.toLowerCase()}-1`, role }
    const queueMutationError = runPolicy(authorizeRoles('DOCTOR', 'RECEPTIONIST', 'ADMIN'), auth)
    if (role === 'PATIENT') assert.equal(queueMutationError.statusCode, 403)
    else assert.equal(queueMutationError, undefined)

    const consultationHistoryError = runPolicy(
      authorizeSelfOrRoles('userId', 'RECEPTIONIST', 'ADMIN'),
      auth,
      { userId: auth.userId },
    )
    assert.equal(consultationHistoryError, undefined)
  }
})

test('ownership policies prevent cross-user access', () => {
  const patient = { userId: 'patient-1', role: 'PATIENT' }
  const doctor = { userId: 'doctor-1', role: 'DOCTOR' }
  assert.equal(runPolicy(authorizeSelfOrRoles('userId', 'RECEPTIONIST', 'ADMIN'), patient, { userId: 'patient-1' }), undefined)
  assert.equal(runPolicy(authorizeSelfOrRoles('userId', 'RECEPTIONIST', 'ADMIN'), patient, { userId: 'patient-2' }).statusCode, 403)
  assert.equal(runPolicy(authorizeSelfOrRoles('userId', 'RECEPTIONIST', 'ADMIN'), doctor, { userId: 'patient-1' }).statusCode, 403)
  assert.equal(runPolicy(authorizeSelfOrRoles('userId', 'RECEPTIONIST', 'ADMIN'), { userId: 'admin-1', role: 'ADMIN' }, { userId: 'patient-1' }), undefined)
})