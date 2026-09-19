import { prisma } from '../database/prisma.js'
import { emitToUser } from '../realtime/hub.js'

export async function createNotification(userId, { type, title, message }, database = prisma) {
  if (!database?.notification?.create) return null
  const notification = await database.notification.create({ data: { userId, type, title, message } })
  emitToUser(userId, 'notification:new', { notification })
  return notification
}

export async function createNotifications(notifications, database = prisma) {
  return Promise.all(notifications.map(({ userId, ...content }) => createNotification(userId, content, database)))
}