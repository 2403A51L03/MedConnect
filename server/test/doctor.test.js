import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDoctorService } from '../src/services/doctorService.js'
import { validateDoctorCreation, validateDoctorUpdate } from '../src/validation/doctorValidation.js'

const profile = {
  id: 'doctor-profile-1',
  specialization: 'General Medicine',
  isAvailable: true,
  user: { id: 'doctor-user-1', name: 'Dr. Maya Rao', email: 'maya@example.com', phone: null },
}

function listDatabase() {
  return {
    doctorProfile: {
      findMany: async ({ where }) => {
        assert.equal(where.availability, 'AVAILABLE')
        assert.equal(where.specialization.contains, 'medicine')
        assert.equal(where.user.name.contains, 'maya')
        return [profile]
      },
    },
  }
}

test('doctor directory applies availability and search filters with safe profile data', async () => {
  const service = createDoctorService(listDatabase())
  const doctors = await service.list({ available: true, specialty: 'medicine', search: 'maya' })
  assert.deepEqual(doctors, [{
    id: 'doctor-profile-1',
    userId: 'doctor-user-1',
    name: 'Dr. Maya Rao',
    email: 'maya@example.com',
    phone: null,
    specialization: 'General Medicine',
    availability: 'AVAILABLE',
    isAvailable: true,
  }])
  assert.equal('passwordHash' in doctors[0], false)
})

test('doctor management validation accepts complete input and rejects weak credentials', () => {
  assert.deepEqual(validateDoctorCreation({
    name: 'Dr. Maya Rao',
    email: 'Maya@Example.com',
    password: 'Password123!',
    specialization: 'Cardiology',
    isAvailable: false,
  }), {
    name: 'Dr. Maya Rao',
    email: 'maya@example.com',
    password: 'Password123!',
    phone: null,
    specialization: 'Cardiology',
    isAvailable: false,
  })
  assert.deepEqual(validateDoctorUpdate({ isAvailable: true }), { isAvailable: true })
  assert.throws(
    () => validateDoctorCreation({ name: 'Doctor', email: 'doctor@example.com', password: 'short' }),
    (error) => error.statusCode === 400,
  )
})
