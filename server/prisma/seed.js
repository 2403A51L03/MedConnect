import { randomBytes, scryptSync } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

async function upsertUser({ name, email, role, passwordHash }) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { name, email, role, passwordHash },
  })
}

async function upsertPatient({ name, email, id }) {
  const user = await upsertUser({ name, email, role: 'PATIENT', passwordHash })
  await prisma.patientProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
  return user
}

const passwordHash = hashPassword('MedConnect123!')

async function main() {
  const admin = await upsertUser({ name: 'Clinic Admin', email: 'admin@medconnect.local', role: 'ADMIN', passwordHash })
  const receptionist = await upsertUser({ name: 'Front Desk', email: 'reception@medconnect.local', role: 'RECEPTIONIST', passwordHash })
  const doctorUser = await upsertUser({ name: 'Dr. Maya Rao', email: 'doctor@medconnect.local', role: 'DOCTOR', passwordHash })
  const doctor = await prisma.doctorProfile.upsert({ where: { userId: doctorUser.id }, update: { specialization: 'General Medicine', availability: 'AVAILABLE' }, create: { userId: doctorUser.id, specialization: 'General Medicine', availability: 'AVAILABLE' } })

  const patients = await Promise.all([
    upsertPatient({ id: 'patient-1', name: 'Aarav Mehta', email: 'patient@medconnect.local' }),
    upsertPatient({ id: 'patient-2', name: 'Diya Shah', email: 'patient2@medconnect.local' }),
    upsertPatient({ id: 'patient-3', name: 'Kabir Singh', email: 'patient3@medconnect.local' }),
  ])

  const now = new Date()
  const queueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const appointments = []
  for (const [index, patient] of patients.entries()) {
    const scheduledAt = new Date(now.getTime() + (index + 1) * 30 * 60 * 1000)
    const appointment = await prisma.appointment.upsert({
      where: { id: `seed-appointment-${index + 1}` },
      update: { patientId: patient.id, doctorId: doctor.id, scheduledAt, status: 'BOOKED' },
      create: { id: `seed-appointment-${index + 1}`, patientId: patient.id, doctorId: doctor.id, scheduledAt },
    })
    await prisma.queueEntry.upsert({ where: { appointmentId: appointment.id }, update: { tokenNumber: index + 1, queueDate, status: 'WAITING' }, create: { appointmentId: appointment.id, tokenNumber: index + 1, queueDate } })
    appointments.push(appointment)
  }

  console.log('Review-2 demo data ready')
  console.log(`Admin: ${admin.email}`)
  console.log(`Receptionist: ${receptionist.email}`)
  console.log(`Doctor: ${doctorUser.email}`)
  console.log(`Patients: ${patients.map((patient) => patient.email).join(', ')}`)
  console.log(`Password for all seeded users: MedConnect123!`)
  console.log(`Doctor profile id: ${doctor.id}`)
  console.log(`Queue appointments: ${appointments.map((appointment) => appointment.id).join(', ')}`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
