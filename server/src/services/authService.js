import { prisma } from '../database/prisma.js'
import { httpError } from '../utilities/httpError.js'
import { createAccessToken } from '../utilities/jwt.js'
import { hashPassword, verifyPassword } from '../utilities/password.js'
import { toSafeUser } from '../utilities/safeUser.js'

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  createdAt: true,
}

const loginUserSelect = { ...publicUserSelect, passwordHash: true }

export function createAuthService(database = prisma) {
  return {
    async registerPatient(input) {
      const existingUser = await database.user.findUnique({ where: { email: input.email }, select: { id: true } })
      if (existingUser) throw httpError(409, 'An account with that email already exists')

      const passwordHash = await hashPassword(input.password)
      const user = await database.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: { name: input.name, email: input.email, passwordHash, role: 'PATIENT', phone: input.phone },
          select: publicUserSelect,
        })
        await transaction.patientProfile.create({ data: { userId: createdUser.id } })
        return createdUser
      })

      return { user: toSafeUser(user), token: createAccessToken(user) }
    },

    async login(input) {
      const user = await database.user.findUnique({ where: { email: input.email }, select: loginUserSelect })
      const validPassword = user ? await verifyPassword(input.password, user.passwordHash) : false
      if (!user || !validPassword) throw httpError(401, 'Invalid email or password')

      return { user: toSafeUser(user), token: createAccessToken(user) }
    },

    async getCurrentUser(userId) {
      const user = await database.user.findUnique({ where: { id: userId }, select: publicUserSelect })
      if (!user) throw httpError(401, 'Authentication is no longer valid')
      return toSafeUser(user)
    },
  }
}

export const authService = createAuthService()