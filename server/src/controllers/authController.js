import { asyncHandler } from '../middleware/asyncHandler.js'
import { authService } from '../services/authService.js'
import { validateLogin, validateRegistration } from '../validation/authValidation.js'

export const registerPatient = asyncHandler(async (request, response) => {
  const result = await authService.registerPatient(validateRegistration(request.body))
  response.status(201).json(result)
})

export const login = asyncHandler(async (request, response) => {
  const result = await authService.login(validateLogin(request.body))
  response.json(result)
})

export const getCurrentUser = asyncHandler(async (request, response) => {
  const user = await authService.getCurrentUser(request.auth.userId)
  response.json({ user })
})