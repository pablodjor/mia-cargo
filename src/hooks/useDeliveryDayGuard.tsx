import { useCallback, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate, isSameDayISO, todayISODate } from '@/utils/date'

export interface WhileGuardHandlers {
  suspend: () => void
  restore: () => void
}

interface GuardDeliveryDayOptions {
  whileGuard?: WhileGuardHandlers
}

interface PendingDeliveryDayAction {
  deliveryDate: string
  run: () => void | Promise<void>
  resolve: (confirmed: boolean) => void
  whileGuard?: WhileGuardHandlers
}

export function useDeliveryDayGuard() {
  const [pending, setPending] = useState<PendingDeliveryDayAction | null>(null)
  const isGuardOpen = Boolean(pending)

  const guardDeliveryDayAction = useCallback(
    (
      deliveryDate: string,
      run: () => void | Promise<void>,
      options?: GuardDeliveryDayOptions,
    ): Promise<boolean> => {
      if (isSameDayISO(deliveryDate, todayISODate())) {
        void Promise.resolve(run())
        return Promise.resolve(true)
      }
      options?.whileGuard?.suspend()
      return new Promise((resolve) => {
        setPending({ deliveryDate, run, resolve, whileGuard: options?.whileGuard })
      })
    },
    [],
  )

  const deliveryDayGuardDialog = (
    <ConfirmDialog
      open={isGuardOpen}
      layer="top"
      tone="warning"
      title="Hoy no es el día del reparto"
      description={
        pending
          ? `Este reparto es del ${formatDate(pending.deliveryDate)} y hoy es ${formatDate(todayISODate())}. ¿Querés continuar igual?`
          : ''
      }
      confirmLabel="Sí, continuar"
      onCancel={() => {
        pending?.whileGuard?.restore()
        pending?.resolve(false)
        setPending(null)
      }}
      onConfirm={() => {
        if (!pending) return
        const { run, resolve, whileGuard } = pending
        void Promise.resolve(run())
          .then(() => resolve(true))
          .catch(() => {
            whileGuard?.restore()
            resolve(false)
          })
          .finally(() => setPending(null))
      }}
    />
  )

  return { guardDeliveryDayAction, deliveryDayGuardDialog, isGuardOpen }
}

export function deliveryDateById(
  deliveries: Array<{ id: string; date: string }>,
  deliveryId: string | null | undefined,
): string | null {
  if (!deliveryId) return null
  return deliveries.find((item) => item.id === deliveryId)?.date ?? null
}
