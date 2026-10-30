import { env } from '../config/env.js'
import { httpError } from '../utilities/httpError.js'

function isIceServer(server) {
  if (!server || typeof server !== 'object') return false
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
  if (!urls.length || !urls.every((url) => typeof url === 'string' && /^(stun|stuns|turn|turns):/i.test(url))) return false
  if (!urls.some((url) => /^(turn|turns):/i.test(url))) return true
  return typeof server.username === 'string'
    && server.username.length > 0
    && typeof server.credential === 'string'
    && server.credential.length > 0
}

function hasTurnUrl(server) {
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
  return urls.some((url) => /^(turn|turns):/i.test(url))
}

export function createTurnService({ appUrl, apiKey, fetchImpl = fetch }) {
  return {
    async getIceServers() {
      if (!appUrl && !apiKey) return []
      if (!appUrl || !apiKey) throw httpError(503, 'TURN relay settings are incomplete')

      let providerUrl
      try {
        providerUrl = new URL(appUrl)
      } catch {
        throw httpError(500, 'TURN relay application URL is invalid')
      }

      if (providerUrl.protocol !== 'https:' || !providerUrl.hostname.endsWith('.metered.live')) {
        throw httpError(500, 'TURN relay application URL must use an HTTPS Metered domain')
      }

      const credentialsUrl = new URL('/api/v1/turn/credentials', providerUrl)
      credentialsUrl.searchParams.set('apiKey', apiKey)

      let response
      try {
        response = await fetchImpl(credentialsUrl, { signal: AbortSignal.timeout(8000) })
      } catch {
        throw httpError(502, 'TURN relay provider could not be reached')
      }

      if (!response.ok) throw httpError(502, 'TURN relay provider rejected the credentials request')

      let iceServers
      try {
        iceServers = await response.json()
      } catch {
        throw httpError(502, 'TURN relay provider returned an invalid response')
      }

      if (!Array.isArray(iceServers)) throw httpError(502, 'TURN relay provider returned an invalid response')

      const validIceServers = iceServers.filter(isIceServer)
      if (!validIceServers.some(hasTurnUrl)) {
        throw httpError(502, 'TURN relay provider returned no usable TURN servers')
      }

      return validIceServers
    },
  }
}

export const turnService = createTurnService({
  appUrl: env.meteredTurnAppUrl,
  apiKey: env.meteredTurnApiKey,
})
