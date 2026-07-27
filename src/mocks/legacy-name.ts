import type { Driver, Package, Person, User } from '@/types'
import {
  getNameInitials,
  normalizeUsername,
  resolveNameFields,
  resolvePackageOwnerFields,
  usernameFromEmail,
} from '@/utils/person-name'

type LegacyNamed = { name?: string; firstName?: string; lastName?: string }

export function withPersonNames<T extends LegacyNamed>(item: T): T & Pick<Person, 'firstName' | 'lastName' | 'name'> {
  const names = resolveNameFields(item)
  return { ...item, ...names }
}

export function withDriverNames<T extends LegacyNamed>(item: T): T & Pick<Driver, 'firstName' | 'lastName' | 'name'> {
  const names = resolveNameFields(item)
  return { ...item, ...names }
}

export function withUserAccount<T extends LegacyNamed & Partial<User>>(
  item: T & { password: string; role: User['role']; active: boolean },
): User {
  const names = resolveNameFields(item)
  const username = item.username?.trim()
    ? normalizeUsername(item.username)
    : usernameFromEmail(item.email) ?? normalizeUsername(names.firstName)
  return {
    ...item,
    ...names,
    username,
    email: item.email?.trim() || undefined,
    avatarInitials: item.avatarInitials ?? getNameInitials(names),
  } as User
}

export function withPackageOwner<T extends { ownerName?: string; ownerFirstName?: string; ownerLastName?: string }>(
  item: T,
): T & Pick<Package, 'ownerFirstName' | 'ownerLastName' | 'ownerName'> {
  const owner = resolvePackageOwnerFields(item)
  return { ...item, ...owner }
}
