import { clearSession, getAccessToken } from './session.js'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function getFriendlyMessage(status, fallback) {
  if (status === 400) return 'Your request is missing required information or contains invalid values.'
  if (status === 401) return 'Your session has expired or is invalid. Please sign in again.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'The selected record could not be found.'
  if (status === 409) return 'This action conflicts with the current state of the system.'
  if (status === 422) return 'The submitted data could not be processed.'
  if (status === 503) return 'The database service is unavailable right now.'
  if (status >= 500) return 'The server encountered an error. Please try again.'
  return fallback
}

export async function requestApi(path, options = {}) {
  const token = getAccessToken()
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 401) clearSession()
      const error = new Error(body.error || getFriendlyMessage(response.status, 'The request could not be completed.'))
      error.status = response.status
      throw error
    }
    return body
  } catch (error) {
    if (error instanceof TypeError) {
      const networkError = new Error('Network error. Please check the server and try again.')
      networkError.status = 0
      throw networkError
    }
    throw error
  }
}

export async function getHealth() {
  return requestApi('/health')
}
