let io

export function setRealtimeServer(server) {
  io = server
}

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload)
}

export function emitToDoctor(doctorUserId, event, payload) {
  io?.to(`doctor:${doctorUserId}`).emit(event, payload)
}

export function emitToDoctors(doctorUserId, queueDate, event, payload) {
  emitToDoctor(doctorUserId, event, payload)
  emitToQueue(doctorUserId, queueDate, event, payload)
}

export function emitToQueue(doctorUserId, queueDate, event, payload) {
  io?.to(`queue:${doctorUserId}:${queueDate.toISOString().slice(0, 10)}`).emit(event, payload)
}