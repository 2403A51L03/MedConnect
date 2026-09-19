import { prisma } from '../database/prisma.js'
import { httpError } from '../utilities/httpError.js'

const staffRoles = new Set(['RECEPTIONIST', 'ADMIN'])

export async function getAuthorizedAppointment(appointmentId, auth, database = prisma) {
  const appointment = await database.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true } },
      doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
      queueEntry: true,
      consultation: true,
    },
  })

  if (!appointment) throw httpError(404, 'Appointment not found')
  const isPatient = appointment.patientId === auth.userId
  const isAssignedDoctor = appointment.doctor.userId === auth.userId
  if (!isPatient && !isAssignedDoctor && !staffRoles.has(auth.role)) {
    throw httpError(403, 'You do not have permission to access this appointment')
  }
  return appointment
}

export async function getAuthorizedQueueEntry(appointmentId, auth, database = prisma) {
  const appointment = await getAuthorizedAppointment(appointmentId, auth, database)
  if (!appointment.queueEntry) throw httpError(404, 'Queue entry not found')
  return appointment.queueEntry
}