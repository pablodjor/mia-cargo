import { useCallback, useEffect, useState } from 'react'
import { getStorageRevision, subscribeStorageRevision } from '@/utils/storage-events'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [storageRevision, setStorageRevision] = useState(getStorageRevision())

  const reload = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => subscribeStorageRevision(() => setStorageRevision(getStorageRevision())), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loader()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Error inesperado')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, storageRevision, ...deps])

  return { data, loading, error, reload }
}
