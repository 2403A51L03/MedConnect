const tokenKey = 'medconnect.accessToken'
const userKey = 'medconnect.user'

export function getAccessToken() {
  return window.localStorage.getItem(tokenKey)
}

export function getStoredUser() {
  const value = window.localStorage.getItem(userKey)
  try {
    return value ? JSON.parse(value) : null
  } catch {
    clearSession()
    return null
  }
}

export function saveSession({ token, user }) {
  window.localStorage.setItem(tokenKey, token)
  window.localStorage.setItem(userKey, JSON.stringify(user))
}

export function clearSession() {
  window.localStorage.removeItem(tokenKey)
  window.localStorage.removeItem(userKey)
}