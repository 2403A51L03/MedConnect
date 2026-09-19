import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAppointmentService } from '../src/services/appointmentService.js'
import { issueQueueEntryForAppointment, isTodayUtc } from '../src/services/queueService.js'
import { validateAppointmentCreation } from '../src/validation/appointmentValidation.js'

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)

function databaseFor({ doctor = { id: 'doctor-1', isAvailable: true }, doctorConflict = null, patientConflict = null } = {}) {
  const appointment = {
    id: 'appointment-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    scheduledAt: futureDate,
    status: 'BOOKED',
    doctor: { user: { id: 'doctor-user-1', name: 'Dr. Rao', email: 'doctor@example.com' } },
    queueEntry: null,
    consultation: null,
  }
  return {
    $transaction: async (callback) => callback({
      doctorProfile: { findUnique: async () => doctor },
      appointment: {
        findFirst: async ({ where }) => where.doctorId ? doctorConflict : patientConflict,
        create: async () => appointment,
      },
      queueEntry: {
        aggregate: async () => ({ _max: { tokenNumber: 1 } }),
        create: async ({ data }) => ({ id: 'queue-1', ...data }),
      },
    }),
  }
}

test('appointment validation rejects invalid and past times', () => {
  assert.throws(() => validateAppointmentCreation({ doctorId: '', scheduledAt: futureDate.toISOString() }), (error) => error.statusCode === 400)
  assert.throws(() => validateAppointmentCreation({ doctorId: 'doctor-1', scheduledAt: 'not-a-date' }), (error) => error.statusCode === 400)
  assert.throws(() => validateAppointmentCreation({ doctorId: 'doctor-1', scheduledAt: new Date(Date.now() - 1000).toISOString() }), (error) => error.statusCode === 400)
})

test('booking rejects invalid doctor, unavailable doctors, and conflicts', async () => {
  await assert.rejects(createAppointmentService(databaseFor({ doctor: null })).create('patient-1', { doctorId: 'doctor-1', scheduledAt: futureDate }), (error) => error.statusCode === 404)
  await assert.rejects(createAppointmentService(databaseFor({ doctor: { id: 'doctor-1', isAvailable: false } })).create('patient-1', { doctorId: 'doctor-1', scheduledAt: futureDate }), (error) => error.statusCode === 409)
  await assert.rejects(createAppointmentService(databaseFor({ doctorConflict: { id: 'existing' } })).create('patient-1', { doctorId: 'doctor-1', scheduledAt: futureDate }), (error) => error.statusCode === 409)
  await assert.rejects(createAppointmentService(databaseFor({ patientConflict: { id: 'existing' } })).create('patient-1', { doctorId: 'doctor-1', scheduledAt: futureDate }), (error) => error.statusCode === 409)
})

test('queue service issues a separate daily token and identifies today', async () => {
  let createdData
  const queueEntry = await issueQueueEntryForAppointment({ id: 'appointment-1', scheduledAt: new Date() }, {
    queueEntry: {
      aggregate: async () => ({ _max: { tokenNumber: 4 } }),
      create: async ({ data }) => { createdData = data; return data },
    },
  })
  assert.equal(queueEntry.tokenNumber, 5)
  assert.equal(isTodayUtc(new Date()), true)
  assert.equal(createdData.appointmentId, 'appointment-1')
})
