import { Router } from 'express'
import { cancelAppointment, createAppointment, createWalkInAppointment, getAppointmentDetails, listAppointments } from '../controllers/appointmentController.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'

export const appointmentRoutes = Router()
appointmentRoutes.post('/', requireAuth, authorizeRoles('PATIENT'), createAppointment)
appointmentRoutes.post('/walk-in', requireAuth, authorizeRoles('RECEPTIONIST', 'ADMIN'), createWalkInAppointment)
appointmentRoutes.get('/', requireAuth, listAppointments)
appointmentRoutes.get('/:appointmentId', requireAuth, getAppointmentDetails)
appointmentRoutes.patch('/:appointmentId/cancel', requireAuth, cancelAppointment)