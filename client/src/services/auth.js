import { requestApi } from './api.js'
import { clearSession, getStoredUser, saveSession } from './session.js'

export { getStoredUser }

export async function registerPatient(input) {
  const result = await requestApi('/auth/register', { method: 'POST', body: JSON.stringify(input) })
  saveSession(result)
  return result.user
}

export async function login(input) {
  const result = await requestApi('/auth/login', { method: 'POST', body: JSON.stringify(input) })
  saveSession(result)
  return result.user
}

export async function getCurrentUser() {
  const result = await requestApi('/auth/me')
  saveSession({ token: window.localStorage.getItem('medconnect.accessToken'), user: result.user })
  return result.user
}

export function logout() {
  clearSession()
}
