import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createQueueService } from '../src/services/queueService.js'

const today = new Date()
const queueDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

function queueEntry(id, tokenNumber, status = 'WAITING') {
  return {
    id,
    tokenNumber,
    status,
    queueDate,
    appointmentId: `appointment-${id}`,
    appointment: {
      doctorId: 'doctor-profile-1',
      patient: { id: `patient-${id}`, name: `Patient ${id}` },
      doctor: { user: { id: 'doctor-user-1', name: 'Dr. Rao' } },
    },
    consultation: status === 'IN_PROGRESS' ? { id: `consultation-${id}` } : null,
  }
}

test('call next selects the lowest waiting token and advances after completion', async () => {
  const waiting = [queueEntry('two', 2), queueEntry('one', 1), queueEntry('cancelled', 3, 'CANCELLED')]
  let updatedId
  const database = {
    doctorProfile: { findUnique: async () => ({ id: 'doctor-profile-1', availability: 'AVAILABLE' }) },
    $transaction: async (callback) => callback({
      queueEntry: {
        findFirst: async ({ where }) => where.status === 'IN_PROGRESS' ? null : { id: waiting[1].id },
        update: async ({ where }) => { updatedId = where.id; return waiting[1] },
      },
    }),
  }
  const service = createQueueService(database)
  const called = await service.callNext('doctor-user-1')
  assert.equal(updatedId, 'one')
  assert.equal(called.id, 'one')
})

test('call next refuses unavailable doctors and active consultations', async () => {
  const unavailable = createQueueService({ doctorProfile: { findUnique: async () => ({ id: 'doctor-profile-1', availability: 'UNAVAILABLE' }) } })
  await assert.rejects(unavailable.callNext('doctor-user-1'), (error) => error.statusCode === 409)

  const active = createQueueService({
    doctorProfile: { findUnique: async () => ({ id: 'doctor-profile-1', availability: 'AVAILABLE' }) },
    $transaction: async (callback) => callback({ queueEntry: { findFirst: async () => ({ id: 'current' }) } }),
  })
  await assert.rejects(active.callNext('doctor-user-1'), (error) => error.statusCode === 409)
})

test('queue position ignores cancelled entries and exposes current and next patients', async () => {
  const entry = queueEntry('three', 3)
  const database = {
    queueEntry: {
      count: async ({ where }) => { assert.equal(where.tokenNumber.lt, 3); return 1 },
      findFirst: async ({ where }) => where.status.in ? queueEntry('two', 2, 'IN_PROGRESS') : queueEntry('four', 4),
    },
  }
  const status = await createQueueService(database).getStatus(entry)
  assert.equal(status.position, 2)
  assert.equal(status.currentPatient.id, 'patient-two')
  assert.equal(status.nextPatient.id, 'patient-four')
})

test('completing a consultation automatically calls the next eligible patient', async () => {
  const current = queueEntry('one', 1, 'IN_PROGRESS')
  current.consultation = { id: 'consultation-one' }
  let advancedId
  const database = {
    queueEntry: {
      findUnique: async () => current,
    },
    $transaction: async (callback) => callback({
      queueEntry: {
        update: async ({ where }) => ({ id: where.id, status: 'COMPLETED' }),
        findFirst: async () => ({ id: 'two' }),
      },
      consultation: { update: async () => ({ id: 'consultation-one', status: 'COMPLETED' }) },
      appointment: { update: async () => ({ id: 'appointment-one', status: 'COMPLETED' }) },
    }),
  }
  const transaction = database.$transaction
  database.$transaction = async (callback) => transaction(async (client) => {
    const originalUpdate = client.queueEntry.update
    client.queueEntry.update = async ({ where, data }) => {
      if (data.status === 'CALLED') advancedId = where.id
      return originalUpdate({ where, data })
    }
    return callback(client)
  })
  const result = await createQueueService(database).completeConsultation('doctor-user-1', 'one')
  assert.equal(result.appointment.status, 'COMPLETED')
  assert.equal(advancedId, 'two')
})
