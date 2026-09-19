import { env } from '../config/env.js'

export function getHealth(request, response) {
  response.json({
    status: 'ok',
    service: 'medconnect-api',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  })
}
