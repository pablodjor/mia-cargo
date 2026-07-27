import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getStorageRevision, subscribeStorageRevision } from '@/utils/storage-events'

interface AsyncState<T> {
  data: T | null
  /** True only on the first load or after route/filter deps change (no cached data yet). */
  loading: boolean
  /** True when refreshing in background while keeping previous data visible. */
  isRefreshing: boolean
  error: string | null
  reload: () => void
}

const MAX_ATTEMPTS = 2

export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [storageRevision, setStorageRevision] = useState(getStorageRevision())
  const requestIdRef = useRef(0)
  const prevDepsKeyRef = useRef<string | null>(null)

  const depsKey = useMemo(() => JSON.stringify(deps), [deps])

  const reload = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => subscribeStorageRevision(() => setStorageRevision(getStorageRevision())), [])

  useEffect(() => {
    const depsChanged =
      prevDepsKeyRef.current !== null && prevDepsKeyRef.current !== depsKey
    prevDepsKeyRef.current = depsKey

    if (depsChanged) {
      setData(null)
    }

    const requestId = ++requestIdRef.current
    setPending(true)
    setError(null)

    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const finish = () => {
      if (requestIdRef.current !== requestId) return
      setPending(false)
    }

    const execute = () => {
      attempt += 1
      void loader()
        .then((result) => {
          if (requestIdRef.current !== requestId) return
          setData(result)
          setError(null)
          finish()
        })
        .catch((err: unknown) => {
          if (requestIdRef.current !== requestId) return
          if (attempt < MAX_ATTEMPTS) {
            retryTimer = setTimeout(execute, 350 * attempt)
            return
          }
          setError(err instanceof Error ? err.message : 'Error inesperado')
          finish()
        })
    }

    execute()

    return () => {
      requestIdRef.current += 1
      if (retryTimer) clearTimeout(retryTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, storageRevision, depsKey])

  return {
    data,
    loading: pending && data === null && error === null,
    isRefreshing: pending && data !== null,
    error,
    reload,
  }
}
