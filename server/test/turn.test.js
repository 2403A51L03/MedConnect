import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTurnService } from '../src/services/turnService.js'

const relayServers = [{
  urls: ['turn:relay.example.test:80?transport=tcp', 'turns:relay.example.test:443'],
  username: 'temporary-user',
  credential: 'temporary-password',
}]

test('unconfigured TURN service allows STUN-only calls', async () => {
  const service = createTurnService({ appUrl: '', apiKey: '', fetchImpl: () => assert.fail('Unexpected provider request') })
  assert.deepEqual(await service.getIceServers(), [])
})

test('Metered TURN credentials are fetched server-side and validated', async () => {
  let requestedUrl
  const service = createTurnService({
    appUrl: 'https://medconnect.metered.live',
    apiKey: 'server-only-key',
    fetchImpl: async (url) => {
      requestedUrl = new URL(url)
      return { ok: true, json: async () => relayServers }
    },
  })

  assert.deepEqual(await service.getIceServers(), relayServers)
  assert.equal(requestedUrl.origin, 'https://medconnect.metered.live')
  assert.equal(requestedUrl.pathname, '/api/v1/turn/credentials')
  assert.equal(requestedUrl.searchParams.get('apiKey'), 'server-only-key')
})

test('partial configuration and provider failures return explicit errors', async () => {
  const partial = createTurnService({ appUrl: 'https://medconnect.metered.live', apiKey: '' })
  await assert.rejects(partial.getIceServers(), (error) => error.statusCode === 503)

  const rejected = createTurnService({
    appUrl: 'https://medconnect.metered.live',
    apiKey: 'server-only-key',
    fetchImpl: async () => ({ ok: false }),
  })
  await assert.rejects(rejected.getIceServers(), (error) => error.statusCode === 502)
})

test('provider configuration must use HTTPS and include a TURN server', async () => {
  const insecure = createTurnService({ appUrl: 'http://medconnect.metered.live', apiKey: 'key' })
  await assert.rejects(insecure.getIceServers(), (error) => error.statusCode === 500)

  const stunOnly = createTurnService({
    appUrl: 'https://medconnect.metered.live',
    apiKey: 'key',
    fetchImpl: async () => ({ ok: true, json: async () => [{ urls: 'stun:stun.example.test' }] }),
  })
  await assert.rejects(stunOnly.getIceServers(), (error) => error.statusCode === 502)

  const missingCredentials = createTurnService({
    appUrl: 'https://medconnect.metered.live',
    apiKey: 'key',
    fetchImpl: async () => ({ ok: true, json: async () => [{ urls: 'turn:relay.example.test:80' }] }),
  })
  await assert.rejects(missingCredentials.getIceServers(), (error) => error.statusCode === 502)
})
