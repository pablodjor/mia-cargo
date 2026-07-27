export interface NameLike {
  firstName?: string
  lastName?: string
  name?: string
}

export interface PackageOwnerLike extends NameLike {
  ownerFirstName?: string
  ownerLastName?: string
  ownerName?: string
}

export function splitLegacyName(full?: string): { firstName: string; lastName: string } {
  const trimmed = full?.trim() ?? ''
  if (!trimmed) return { firstName: '', lastName: '' }
  const parts = trimmed.split(/\s+/)
  const firstName = parts[0] ?? ''
  const lastName = parts.slice(1).join(' ')
  return { firstName, lastName }
}

export function formatFullName(input: NameLike): string {
  const firstName = input.firstName?.trim()
  const lastName = input.lastName?.trim()
  if (firstName) return [firstName, lastName].filter(Boolean).join(' ')
  return input.name?.trim() ?? ''
}

export function getPackageOwnerName(pkg: PackageOwnerLike): string {
  const firstName = pkg.ownerFirstName?.trim()
  const lastName = pkg.ownerLastName?.trim()
  if (firstName) return [firstName, lastName].filter(Boolean).join(' ')
  return pkg.ownerName?.trim() ?? ''
}

export function getNameInitials(input: NameLike): string {
  const firstName = input.firstName?.trim() || splitLegacyName(input.name).firstName
  const lastName = input.lastName?.trim() || splitLegacyName(input.name).lastName
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  return initials || '??'
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function usernameFromEmail(email?: string): string | undefined {
  if (!email?.trim()) return undefined
  const local = email.split('@')[0]?.trim()
  return local ? normalizeUsername(local) : undefined
}

export function resolveNameFields(input: NameLike): { firstName: string; lastName: string; name: string } {
  if (input.firstName?.trim()) {
    const firstName = input.firstName.trim()
    const lastName = input.lastName?.trim() ?? ''
    return { firstName, lastName, name: formatFullName({ firstName, lastName }) }
  }
  const split = splitLegacyName(input.name)
  return {
    firstName: split.firstName,
    lastName: split.lastName,
    name: formatFullName(split),
  }
}

export function resolvePackageOwnerFields(input: PackageOwnerLike): {
  ownerFirstName: string
  ownerLastName: string
  ownerName: string
} {
  if (input.ownerFirstName?.trim()) {
    const ownerFirstName = input.ownerFirstName.trim()
    const ownerLastName = input.ownerLastName?.trim() ?? ''
    return {
      ownerFirstName,
      ownerLastName,
      ownerName: [ownerFirstName, ownerLastName].filter(Boolean).join(' '),
    }
  }
  const split = splitLegacyName(input.ownerName)
  return {
    ownerFirstName: split.firstName,
    ownerLastName: split.lastName,
    ownerName: formatFullName(split),
  }
}
