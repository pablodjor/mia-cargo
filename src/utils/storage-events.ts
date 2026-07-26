let revision = 0
const listeners = new Set<() => void>()

export function getStorageRevision(): number {
  return revision
}

export function bumpStorageRevision(): void {
  revision += 1
  listeners.forEach((listener) => listener())
}

export function subscribeStorageRevision(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
