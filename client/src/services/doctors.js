import { requestApi } from './api.js'

export async function getDoctors({ search = '', specialty = '', available = true } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (specialty) params.set('specialty', specialty)
  if (available) params.set('available', 'true')
  const result = await requestApi(`/doctors?${params.toString()}`)
  return result.doctors
}

export async function getDoctorSchedule(doctorId) {
  const result = await requestApi(`/doctors/${doctorId}/schedule`)
  return result.appointments
}

export async function createDoctor(input) {
  const result = await requestApi('/doctors', { method: 'POST', body: JSON.stringify(input) })
  return result.doctor
}

export async function updateDoctor(doctorId, input) {
  const result = await requestApi(`/doctors/${doctorId}`, { method: 'PATCH', body: JSON.stringify(input) })
  return result.doctor
}