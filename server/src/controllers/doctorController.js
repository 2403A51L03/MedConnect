import { asyncHandler } from '../middleware/asyncHandler.js'
import { doctorService } from '../services/doctorService.js'
import { validateDoctorCreation, validateDoctorUpdate } from '../validation/doctorValidation.js'
import { httpError } from '../utilities/httpError.js'

export const listDoctors = asyncHandler(async (request, response) => {
  const available = request.query.available === undefined ? undefined : request.query.available === 'true'
  const doctors = await doctorService.list({ search: request.query.search?.trim(), specialty: request.query.specialty?.trim(), available })
  response.json({ doctors })
})

export const getDoctor = asyncHandler(async (request, response) => {
  response.json({ doctor: await doctorService.getById(request.params.doctorId) })
})

export const getDoctorSchedule = asyncHandler(async (request, response) => {
  response.json({ appointments: await doctorService.schedule(request.params.doctorId) })
})

export const createDoctor = asyncHandler(async (request, response) => {
  response.status(201).json({ doctor: await doctorService.create(validateDoctorCreation(request.body)) })
})

export const updateDoctor = asyncHandler(async (request, response) => {
  const doctor = await doctorService.getById(request.params.doctorId)
  const isStaff = request.auth.role === 'RECEPTIONIST' || request.auth.role === 'ADMIN'
  if (!isStaff && !(request.auth.role === 'DOCTOR' && doctor.userId === request.auth.userId)) {
    throw httpError(403, 'You do not have permission to manage this doctor')
  }
  response.json({ doctor: await doctorService.update(request.params.doctorId, validateDoctorUpdate(request.body)) })
})