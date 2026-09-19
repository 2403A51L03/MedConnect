import { asyncHandler } from '../middleware/asyncHandler.js'
import { authService } from '../services/authService.js'
import { validateRegistration } from '../validation/authValidation.js'

export const registerPatientByStaff = asyncHandler(async (request, response) => {
  const result = await authService.registerPatient(validateRegistration(request.body))
  response.status(201).json({ user: result.user })
})