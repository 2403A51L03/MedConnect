import { Router } from 'express'
import { getHealth, getReadiness } from '../controllers/healthController.js'

export const healthRoutes = Router()
healthRoutes.get('/', getHealth)
healthRoutes.get('/ready', getReadiness)
