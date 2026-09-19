import { Router } from 'express'
import { createDoctor, getDoctor, getDoctorSchedule, listDoctors, updateDoctor } from '../controllers/doctorController.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'

export const doctorRoutes = Router()
doctorRoutes.get('/', listDoctors)
doctorRoutes.get('/:doctorId', getDoctor)
doctorRoutes.get('/:doctorId/schedule', requireAuth, getDoctorSchedule)
doctorRoutes.post('/', requireAuth, authorizeRoles('RECEPTIONIST', 'ADMIN'), createDoctor)
doctorRoutes.patch('/:doctorId', requireAuth, updateDoctor)