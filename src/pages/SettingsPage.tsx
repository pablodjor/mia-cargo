import { useState } from 'react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/PageLoader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { MetricCard } from '@/components/ui/MetricCard'
import { useTheme } from '@/contexts/ThemeContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { settingsService } from '@/services/settings.service'

type Action = 'restore' | 'clear' | 'reload' | null

export default function SettingsPage() {
  const { theme } = useTheme()
  const { data, reload, loading } = useAsyncData(async () => ({
    info: await settingsService.getVersionInfo(),
    counts: await settingsService.getCounts(),
  }))
  const [action, setAction] = useState<Action>(null)

  const execute = async () => {
    try {
      if (action === 'restore') await settingsService.restoreMocks()
      if (action === 'clear') await settingsService.clearLocalData()
      if (action === 'reload') await settingsService.reloadDemo()
      toast.success('Datos actualizados')
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
    } finally {
      setAction(null)
      reload()
    }
  }

  const title =
    action === 'restore'
      ? 'Restaurar datos demo'
      : action === 'clear'
        ? 'Borrar datos locales'
        : 'Recargar demo'

  if (loading) return <PageLoader label="Cargando configuración…" />

  return (
    <div className="space-y-5 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <Card title="Apariencia">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Tema de la interfaz</p>
            <p className="text-sm text-text-secondary">
              Modo actual: {theme === 'dark' ? 'Oscuro' : 'Claro'} (por defecto: claro)
            </p>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      <Card title="Versión">
        <p>Aplicación: {data?.info.appVersion ?? '…'}</p>
        <p>
          Base local: v{data?.info.dbVersion ?? '…'} ·{' '}
          {data?.info.compatible ? 'Compatible' : 'Incompatible'}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(data?.counts ?? {}).map(([label, value]) => (
          <MetricCard key={label} label={label} value={value} />
        ))}
      </div>

      <Card title="Datos locales">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAction('restore')}>Restaurar mocks</Button>
          <Button variant="danger" onClick={() => setAction('clear')}>
            Borrar datos
          </Button>
          <Button variant="outline" onClick={() => setAction('reload')}>
            Recargar demo
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={action !== null}
        title={title}
        description="Esta acción modifica los datos guardados en este navegador."
        tone={action === 'clear' ? 'danger' : 'primary'}
        onCancel={() => setAction(null)}
        onConfirm={() => void execute()}
      />
    </div>
  )
}
