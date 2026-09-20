import 'dotenv/config'
import { randomBytes, scryptSync } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

async function upsertUser({ name, email, role, passwordHash, phone = null }) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, phone },
    create: { name, email, role, passwordHash, phone },
  })
}

async function upsertPatient(patient) {
  const user = await upsertUser({ ...patient, role: 'PATIENT', passwordHash })
  await prisma.patientProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
  return user
}

async function upsertDoctor(doctor) {
  const user = await upsertUser({ ...doctor, role: 'DOCTOR', passwordHash })
  const profile = await prisma.doctorProfile.upsert({
    where: { userId: user.id },
    update: { specialization: doctor.specialization, availability: doctor.availability || 'AVAILABLE' },
    create: { userId: user.id, specialization: doctor.specialization, availability: doctor.availability || 'AVAILABLE' },
  })
  return { user, profile }
}

const passwordHash = hashPassword('MedConnect123!')

async function main() {
  const admin = await upsertUser({ name: 'Clinic Admin', email: 'admin@medconnect.local', role: 'ADMIN', passwordHash, phone: '+91 98765 10001' })
  const receptionist = await upsertUser({ name: 'Ananya Kulkarni', email: 'reception@medconnect.local', role: 'RECEPTIONIST', passwordHash, phone: '+91 98765 10002' })
  const doctors = await Promise.all([
    upsertDoctor({ name: 'Dr. Maya Rao', email: 'doctor@medconnect.local', phone: '+91 98765 11001', specialization: 'General Medicine' }),
    upsertDoctor({ name: 'Dr. Arjun Mehta', email: 'arjun.mehta@medconnect.local', phone: '+91 98765 11002', specialization: 'Cardiology' }),
    upsertDoctor({ name: 'Dr. Priya Nair', email: 'priya.nair@medconnect.local', phone: '+91 98765 11003', specialization: 'Paediatrics' }),
    upsertDoctor({ name: 'Dr. Rohan Iyer', email: 'rohan.iyer@medconnect.local', phone: '+91 98765 11004', specialization: 'Dermatology' }),
  ])

  const patients = await Promise.all([
    upsertPatient({ name: 'Aarav Mehta', email: 'patient@medconnect.local', phone: '+91 98765 12001' }),
    upsertPatient({ name: 'Diya Shah', email: 'patient2@medconnect.local', phone: '+91 98765 12002' }),
    upsertPatient({ name: 'Kabir Singh', email: 'patient3@medconnect.local', phone: '+91 98765 12003' }),
    upsertPatient({ name: 'Ishita Banerjee', email: 'ishita.banerjee@medconnect.local', phone: '+91 98765 12004' }),
    upsertPatient({ name: 'Vikram Joshi', email: 'vikram.joshi@medconnect.local', phone: '+91 98765 12005' }),
    upsertPatient({ name: 'Meera Krishnan', email: 'meera.krishnan@medconnect.local', phone: '+91 98765 12006' }),
    upsertPatient({ name: 'Aditya Patil', email: 'aditya.patil@medconnect.local', phone: '+91 98765 12007' }),
    upsertPatient({ name: 'Sneha Reddy', email: 'sneha.reddy@medconnect.local', phone: '+91 98765 12008' }),
  ])

  const now = new Date()
  const queueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const appointments = []
  for (const [index, patient] of patients.entries()) {
    const scheduledAt = new Date(now.getTime() + (index + 1) * 30 * 60 * 1000)
    const doctor = doctors[index % doctors.length]
    const appointment = await prisma.appointment.upsert({
      where: { id: `seed-appointment-${index + 1}` },
      update: { patientId: patient.id, doctorId: doctor.profile.id, scheduledAt, status: 'BOOKED' },
      create: { id: `seed-appointment-${index + 1}`, patientId: patient.id, doctorId: doctor.profile.id, scheduledAt },
    })
    await prisma.queueEntry.upsert({ where: { appointmentId: appointment.id }, update: { tokenNumber: index + 1, queueDate, status: 'WAITING' }, create: { appointmentId: appointment.id, tokenNumber: index + 1, queueDate } })
    appointments.push(appointment)
    await prisma.notification.upsert({
      where: { id: `seed-notification-${index + 1}` },
      update: { userId: patient.id, title: 'Appointment confirmed', message: `Your appointment with ${doctor.user.name} is confirmed.` },
      create: { id: `seed-notification-${index + 1}`, userId: patient.id, type: 'APPOINTMENT', title: 'Appointment confirmed', message: `Your appointment with ${doctor.user.name} is confirmed.` },
    })
  }

  console.log('Review-2 demo data ready')
  console.log(`Admin: ${admin.email}`)
  console.log(`Receptionist: ${receptionist.email}`)
  console.log(`Doctors: ${doctors.map(({ user }) => user.email).join(', ')}`)
  console.log(`Patients: ${patients.map((patient) => patient.email).join(', ')}`)
  console.log(`Password for all seeded users: MedConnect123!`)
  console.log(`Doctor profile ids: ${doctors.map(({ profile }) => profile.id).join(', ')}`)
  console.log(`Queue appointments: ${appointments.map((appointment) => appointment.id).join(', ')}`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
