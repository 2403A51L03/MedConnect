import { env } from '../config/env.js'
import { prisma } from '../database/prisma.js'

export function getHealth(request, response) {
  response.json({
    status: 'ok',
    service: 'medconnect-api',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  })
}

export async function getReadiness(request, response) {
  try {
    await prisma.$queryRaw`SELECT 1`
    response.json({ status: 'ready', service: 'medconnect-api', database: 'connected' })
  } catch (error) {
    response.status(503).json({ status: 'not_ready', service: 'medconnect-api', database: 'unavailable' })
  }
}
