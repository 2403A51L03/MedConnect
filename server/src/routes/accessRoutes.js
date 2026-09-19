import { Router } from 'express'
import { callNextPatient, completeConsultation, getConsultationHistory, getNotifications, getQueueEntry, listDoctorQueue, listPatients, listUserAppointments, startConsultation, updateDoctorAvailability } from '../controllers/accessController.js'
import { authorizeRoles, authorizeSelfOrRoles, requireAuth } from '../middleware/authMiddleware.js'

export const accessRoutes = Router()

accessRoutes.get('/appointments/:appointmentId/queue', requireAuth, getQueueEntry)
accessRoutes.get(
  '/users/:userId/appointments',
  requireAuth,
  authorizeSelfOrRoles('userId', 'RECEPTIONIST', 'ADMIN'),
  listUserAppointments,
)
accessRoutes.get(
  '/doctors/:userId/queue',
  requireAuth,
  authorizeRoles('DOCTOR', 'RECEPTIONIST', 'ADMIN'),
  authorizeSelfOrRoles('userId', 'RECEPTIONIST', 'ADMIN'),
  listDoctorQueue,
)
accessRoutes.get(
  '/users/:userId/consultations',
  requireAuth,
  authorizeSelfOrRoles('userId', 'RECEPTIONIST', 'ADMIN'),
  getConsultationHistory,
)
accessRoutes.get('/users/:userId/notifications', requireAuth, authorizeSelfOrRoles('userId', 'RECEPTIONIST', 'ADMIN'), getNotifications)
accessRoutes.get('/patients', requireAuth, authorizeRoles('RECEPTIONIST', 'ADMIN'), listPatients)
accessRoutes.patch(
  '/doctors/:userId/availability',
  requireAuth,
  authorizeRoles('DOCTOR', 'RECEPTIONIST', 'ADMIN'),
  authorizeSelfOrRoles('userId', 'RECEPTIONIST', 'ADMIN'),
  updateDoctorAvailability,
)
accessRoutes.post(
  '/queue/call-next',
  requireAuth,
  authorizeRoles('DOCTOR', 'RECEPTIONIST', 'ADMIN'),
  callNextPatient,
)
accessRoutes.post('/queue/:queueEntryId/start', requireAuth, authorizeRoles('DOCTOR'), startConsultation)
accessRoutes.post('/queue/:queueEntryId/complete', requireAuth, authorizeRoles('DOCTOR'), completeConsultation)