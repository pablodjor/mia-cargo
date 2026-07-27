import type { Session, User } from '@/types'
import { formatFullName } from '@/utils/person-name'

export function toSession(user: User): Session {
  return {
    userId: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    name: formatFullName(user),
    email: user.email,
    role: user.role,
    driverId: user.driverId,
    loggedAt: new Date().toISOString(),
  }
}
