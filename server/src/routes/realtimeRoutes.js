import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { turnService } from '../services/turnService.js'

export const realtimeRoutes = Router()

realtimeRoutes.get(
  '/ice-servers',
  requireAuth,
  asyncHandler(async (_request, response) => {
    response.json({ iceServers: await turnService.getIceServers() })
  }),
)
