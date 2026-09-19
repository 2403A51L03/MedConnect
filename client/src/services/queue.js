import { requestApi } from './api.js'

export async function getQueueStatus(appointmentId) {
  return requestApi(`/appointments/${appointmentId}/queue`)
}
