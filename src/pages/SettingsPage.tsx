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
import type { MockDataPreset } from '@/mocks'
import { settingsService } from '@/services/settings.service'

type Action = MockDataPreset | 'clear' | null

const PRESET_COPY: Record<
  MockDataPreset,
  { title: string; description: string; button: string; variant?: 'primary' | 'outline' | 'secondary' }
> = {
  empty: {
    title: 'Cargar base vacía',
    description:
      'Queda solo la configuración mínima (usuarios y motivos de fallo). Podés cargar tus propios paquetes, clientes y repartos.',
    button: 'Vacío',
    variant: 'outline',
  },
  full: {
    title: 'Cargar base completa',
    description: 'Restaura el conjunto de datos de ejemplo actual, con paquetes, repartos e historial.',
    button: 'Completo',
    variant: 'primary',
  },
  minimal: {
    title: 'Cargar base reducida',
    description:
      'Un subconjunto chico para probar rápido: pocos clientes, 6 paquetes y 1 reparto.',
    button: 'Reducido',
    variant: 'outline',
  },
}

export default function SettingsPage() {
  const { theme } = useTheme()
  const { data, reload, loading } = useAsyncData(async () => ({
    info: await settingsService.getVersionInfo(),
    counts: await settingsService.getCounts(),
  }))
  const [action, setAction] = useState<Action>(null)
  const [saving, setSaving] = useState(false)

  const execute = async () => {
    setSaving(true)
    try {
      if (action === 'empty' || action === 'full' || action === 'minimal') {
        await settingsService.applyMockPreset(action)
      }
      if (action === 'clear') await settingsService.clearLocalData()
      toast.success('Datos actualizados')
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
    } finally {
      setSaving(false)
      setAction(null)
      reload()
    }
  }

  const title =
    action === 'clear'
      ? 'Borrar todos los datos'
      : action
        ? PRESET_COPY[action].title
        : ''

  const description =
    action === 'clear'
      ? data?.info.remoteDemo
        ? 'Se borran los datos compartidos para todos los usuarios conectados.'
        : 'Se borran los datos guardados en este navegador.'
      : action
        ? PRESET_COPY[action].description
        : ''

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
          Base de datos: v{data?.info.dbVersion ?? '…'} ·{' '}
          {data?.info.compatible ? 'Compatible' : 'Incompatible'}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(data?.counts ?? {}).map(([label, value]) => (
          <MetricCard key={label} label={label} value={value} />
        ))}
      </div>

      <Card title="Conjunto de datos">
        <p className="mb-4 text-sm text-text-secondary">
          Elegí con qué datos arrancar. Cada opción reemplaza paquetes, clientes, repartos e historial.
          {data?.info.remoteDemo ? ' En este entorno los cambios los ven todos los dispositivos.' : null}
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESET_COPY) as MockDataPreset[]).map((preset) => (
            <Button
              key={preset}
              variant={PRESET_COPY[preset].variant ?? 'outline'}
              onClick={() => setAction(preset)}
            >
              {PRESET_COPY[preset].button}
            </Button>
          ))}
          <Button variant="danger" onClick={() => setAction('clear')}>
            Borrar todo
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={action !== null}
        title={title}
        description={description}
        tone={action === 'clear' ? 'danger' : 'primary'}
        loading={saving}
        onCancel={() => {
          if (saving) return
          setAction(null)
        }}
        onConfirm={() => void execute()}
      />
    </div>
  )
}
