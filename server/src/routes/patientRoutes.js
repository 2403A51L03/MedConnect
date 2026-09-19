import { Router } from 'express'
import { registerPatientByStaff } from '../controllers/patientController.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'

export const patientRoutes = Router()
patientRoutes.post('/', requireAuth, authorizeRoles('RECEPTIONIST', 'ADMIN'), registerPatientByStaff)