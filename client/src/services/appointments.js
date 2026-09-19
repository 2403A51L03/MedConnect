import { requestApi } from './api.js'

export async function createAppointment(input) {
  return requestApi('/appointments', { method: 'POST', body: JSON.stringify(input) })
}

export async function getAppointments() {
  const result = await requestApi('/appointments')
  return result.appointments
}

export async function cancelAppointment(appointmentId) {
  const result = await requestApi(`/appointments/${appointmentId}/cancel`, { method: 'PATCH' })
  return result.appointment
}