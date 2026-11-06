import { useCallback, useEffect, useState } from 'react'
import { getQueuedReviews } from '@/lib/offlineQueue'
import { syncOfflineReviews } from '@/lib/api/reviews'

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(() => getQueuedReviews().length)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  const trySync = useCallback(async () => {
    if (!navigator.onLine || getQueuedReviews().length === 0) return
    const { remaining } = await syncOfflineReviews()
    setPendingCount(remaining)
  }, [])

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      void trySync()
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    void trySync()
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [trySync])

  const notePending = useCallback(() => {
    setPendingCount(getQueuedReviews().length)
  }, [])

  return { pendingCount, isOnline, notePending, trySync }
}
