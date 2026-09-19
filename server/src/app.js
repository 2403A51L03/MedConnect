import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { apiRouter } from './routes/index.js'

export const app = express()

const allowedOrigins = new Set(env.allowedOrigins)

app.disable('x-powered-by')
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use('/api', apiRouter)
app.use(notFoundHandler)
app.use(errorHandler)
