import { Router } from 'express'
import { accessRoutes } from './accessRoutes.js'
import { appointmentRoutes } from './appointmentRoutes.js'
import { authRoutes } from './authRoutes.js'
import { doctorRoutes } from './doctorRoutes.js'
import { healthRoutes } from './healthRoutes.js'
import { patientRoutes } from './patientRoutes.js'

export const apiRouter = Router()
apiRouter.use('/appointments', appointmentRoutes)
apiRouter.use(accessRoutes)
apiRouter.use('/auth', authRoutes)
apiRouter.use('/doctors', doctorRoutes)
apiRouter.use('/patients', patientRoutes)
apiRouter.use('/health', healthRoutes)
