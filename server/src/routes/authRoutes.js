import { Router } from 'express'
import { getCurrentUser, login, registerPatient } from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

export const authRoutes = Router()
authRoutes.post('/register', registerPatient)
authRoutes.post('/login', login)
authRoutes.get('/me', requireAuth, getCurrentUser)