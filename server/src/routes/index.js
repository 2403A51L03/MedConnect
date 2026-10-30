import { Router } from 'express'
import { accessRoutes } from './accessRoutes.js'
import { appointmentRoutes } from './appointmentRoutes.js'
import { authRoutes } from './authRoutes.js'
import { doctorRoutes } from './doctorRoutes.js'
import { healthRoutes } from './healthRoutes.js'
import { patientRoutes } from './patientRoutes.js'
import { realtimeRoutes } from './realtimeRoutes.js'

export const apiRouter = Router()
apiRouter.use('/appointments', appointmentRoutes)
apiRouter.use(accessRoutes)
apiRouter.use('/auth', authRoutes)
apiRouter.use('/doctors', doctorRoutes)
apiRouter.use('/patients', patientRoutes)
apiRouter.use('/realtime', realtimeRoutes)
apiRouter.use('/health', healthRoutes)
