import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { app } from './app.js'
import { env } from './config/env.js'
import { setRealtimeServer } from './realtime/hub.js'
import { configureSocketAuthentication, registerSocketHandlers } from './socket/index.js'

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: env.allowedOrigins } })
setRealtimeServer(io)
configureSocketAuthentication(io)
registerSocketHandlers(io)

const host = env.nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1'

httpServer.listen(env.port, host, () => {
  console.log(`MedConnect API listening on http://localhost:${env.port}`)
})
