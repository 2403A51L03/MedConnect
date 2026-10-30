import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const testUsers = [
  { id: 'cmvurieo30003ga1v02mzc6xm', name: 'Deploy Check Patient 20261030-1447', email: 'medconnect.patient.20261030-1447@example.com', role: 'PATIENT' },
  { id: 'cmvurwh86002kga1v8nwvl09o', name: 'Deploy Check UI Patient 20261030-1447', email: 'medconnect.ui-patient.20261030-1447@example.com', role: 'PATIENT' },
  { id: 'cmvuri7i90000ga1vvyhoxaw9', name: 'Deploy Check Doctor 20261030-1447', email: 'medconnect.doctor.20261030-1447@example.com', role: 'DOCTOR' },
  { id: 'cmvurw67s002hga1v875roufc', name: 'Deploy Check UI Doctor 20261030-1447', email: 'medconnect.ui-doctor.20261030-1447@example.com', role: 'DOCTOR' },
]

const patientIds = testUsers.filter(({ role }) => role === 'PATIENT').map(({ id }) => id)
const doctorUserIds = testUsers.filter(({ role }) => role === 'DOCTOR').map(({ id }) => id)
const doctorProfileIds = ['cmvuri7wa0002ga1vtoofai4i', 'cmvurw6kx002jga1vv2zxy3df']
const appointmentIds = [
  'cmvurj6qq0009ga1vbx2l2vqz',
  'cmvurok5f000yga1vck6vrrw9',
  'cmvurv37u002cga1vi2xb7649',
  'cmvurqrt5001iga1vcew47rs7',
  'cmvurr8ik001oga1v08ldugi4',
]
const relatedNotificationIds = [
  'cmvuru97q002aga1vvvnv0h7e',
  'cmvuru1ks0028ga1v5we9hh8e',
  'cmvurrq85001yga1vuyipi9gr',
  'cmvurrkrs001uga1vxcp7zheh',
  'cmvurrabn001sga1v7f5e0g5e',
  'cmvurqtm8001mga1vx8xgpxkb',
  'cmvurmroj000uga1vefeeud23',
  'cmvurmoaj000sga1vaqynt48',
]
const existingPatientId = 'cmvurmhqd000mga1vfl1c86n7'
const testWindowStart = new Date('2026-10-30T09:15:00.000Z')
const testWindowEnd = new Date('2026-10-30T10:00:00.000Z')

async function main() {
  const users = await prisma.user.findMany({
    where: { id: { in: testUsers.map(({ id }) => id) } },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  for (const user of users) {
    const expected = testUsers.find(({ id }) => id === user.id)
    if (!expected
      || user.name !== expected.name
      || user.email !== expected.email
      || user.role !== expected.role
      || user.createdAt < testWindowStart
      || user.createdAt >= testWindowEnd) {
      throw new Error(`Refusing to delete an unexpected account: ${user.id}`)
    }
  }

  const appointments = await prisma.appointment.findMany({
    where: { id: { in: appointmentIds } },
    select: { id: true, patientId: true, doctorId: true, createdAt: true },
  })

  for (const appointment of appointments) {
    if (!doctorProfileIds.includes(appointment.doctorId)
      || (!patientIds.includes(appointment.patientId) && appointment.patientId !== existingPatientId)
      || appointment.createdAt < testWindowStart
      || appointment.createdAt >= testWindowEnd) {
      throw new Error(`Refusing to delete an unexpected appointment: ${appointment.id}`)
    }
  }

  const notifications = await prisma.notification.findMany({
    where: { id: { in: relatedNotificationIds } },
    select: { id: true, userId: true, createdAt: true },
  })

  for (const notification of notifications) {
    if (notification.userId !== existingPatientId
      || notification.createdAt < testWindowStart
      || notification.createdAt >= testWindowEnd) {
      throw new Error(`Refusing to delete an unexpected notification: ${notification.id}`)
    }
  }

  const counts = await prisma.$transaction(async (transaction) => {
    const consultations = await transaction.consultation.deleteMany({ where: { appointmentId: { in: appointmentIds } } })
    const queueEntries = await transaction.queueEntry.deleteMany({ where: { appointmentId: { in: appointmentIds } } })
    const deletedAppointments = await transaction.appointment.deleteMany({ where: { id: { in: appointmentIds } } })
    const notifications = await transaction.notification.deleteMany({
      where: {
        OR: [
          { userId: { in: patientIds } },
          { id: { in: relatedNotificationIds } },
        ],
      },
    })
    const doctorProfiles = await transaction.doctorProfile.deleteMany({ where: { userId: { in: doctorUserIds } } })
    const patientProfiles = await transaction.patientProfile.deleteMany({ where: { userId: { in: patientIds } } })
    const deletedUsers = await transaction.user.deleteMany({ where: { id: { in: testUsers.map(({ id }) => id) } } })

    return {
      users: deletedUsers.count,
      doctorProfiles: doctorProfiles.count,
      patientProfiles: patientProfiles.count,
      appointments: deletedAppointments.count,
      queueEntries: queueEntries.count,
      consultations: consultations.count,
      notifications: notifications.count,
    }
  })

  console.log(`Session test data cleanup complete: ${JSON.stringify(counts)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
