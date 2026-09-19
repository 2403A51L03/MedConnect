import { verifyAccessToken } from '../utilities/jwt.js'
import { prisma } from '../database/prisma.js'
import { emitToUser } from '../realtime/hub.js'

const validRoles = new Set(['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN'])

function isConsultationParticipant(socket, queueEntry) {
  if (!queueEntry?.appointment) return false
  if (socket.auth.role === 'PATIENT') return queueEntry.appointment.patientId === socket.auth.userId
  if (socket.auth.role === 'DOCTOR') return queueEntry.appointment.doctor.userId === socket.auth.userId
  return ['RECEPTIONIST', 'ADMIN'].includes(socket.auth.role)
}

export function configureSocketAuthentication(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload = verifyAccessToken(token)
      if (typeof payload.sub !== 'string' || !validRoles.has(payload.role)) return next(new Error('Invalid authentication token'))
      socket.auth = { userId: payload.sub, role: payload.role, email: payload.email }
      return next()
    } catch {
      return next(new Error('Invalid or expired authentication token'))
    }
  })
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.join(`user:${socket.auth.userId}`)
    socket.emit('connection:ready', { socketId: socket.id })
    if (socket.auth.role === 'DOCTOR') {
      prisma.doctorProfile.findUnique({ where: { userId: socket.auth.userId }, select: { id: true } })
        .then((doctor) => doctor && socket.join(`doctor:${socket.auth.userId}`))
        .catch(() => emitToUser(socket.auth.userId, 'connection:warning', { message: 'Doctor room could not be joined' }))
    }

    socket.on('join-consultation', async ({ queueEntryId }) => {
      if (!queueEntryId) {
        socket.emit('consultation:error', { message: 'A queue entry ID is required.' })
        return
      }

      try {
        const queueEntry = await prisma.queueEntry.findUnique({
          where: { id: queueEntryId },
          select: {
            id: true,
            status: true,
            appointmentId: true,
            appointment: {
              select: {
                patientId: true,
                doctor: { select: { userId: true } },
              },
            },
          },
        })

        if (!queueEntry) {
          socket.emit('consultation:error', { message: 'Consultation session was not found.' })
          return
        }

        if (!isConsultationParticipant(socket, queueEntry)) {
          socket.emit('consultation:error', { message: 'You are not authorized to join this consultation.' })
          return
        }

        socket.join(`consultation:${queueEntryId}`)
        socket.emit('consultation:joined', { queueEntryId: queueEntry.id, appointmentId: queueEntry.appointmentId })
        socket.to(`consultation:${queueEntryId}`).emit('consultation:participant-joined', {
          userId: socket.auth.userId,
          role: socket.auth.role,
          queueEntryId: queueEntry.id,
        })
      } catch (error) {
        socket.emit('consultation:error', { message: 'Unable to join this consultation.' })
      }
    })

    socket.on('webrtc-offer', ({ queueEntryId, offer }) => {
      if (!queueEntryId || !offer) return
      socket.to(`consultation:${queueEntryId}`).emit('webrtc-offer', { fromUserId: socket.auth.userId, offer })
    })

    socket.on('webrtc-answer', ({ queueEntryId, answer }) => {
      if (!queueEntryId || !answer) return
      socket.to(`consultation:${queueEntryId}`).emit('webrtc-answer', { fromUserId: socket.auth.userId, answer })
    })

    socket.on('webrtc-ice-candidate', ({ queueEntryId, candidate }) => {
      if (!queueEntryId || !candidate) return
      socket.to(`consultation:${queueEntryId}`).emit('webrtc-ice-candidate', { fromUserId: socket.auth.userId, candidate })
    })

    socket.on('leave-consultation', ({ queueEntryId }) => {
      if (!queueEntryId) return
      socket.leave(`consultation:${queueEntryId}`)
      socket.to(`consultation:${queueEntryId}`).emit('consultation:ended', { queueEntryId, endedBy: socket.auth.userId })
    })
  })
}
