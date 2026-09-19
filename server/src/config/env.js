import 'dotenv/config'

const required = ['DATABASE_URL', 'JWT_SECRET']
const missing = required.filter((name) => !process.env[name])

if (missing.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
}

const configuredOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  clientOrigin: configuredOrigins[0],
  allowedOrigins: [...new Set([...configuredOrigins, 'http://127.0.0.1:5173'])],
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
}
