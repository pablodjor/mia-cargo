import {
  Car,
  Loader2,
  Package as PackageIcon,
  Search,
  Truck,
  UserRound,
  Users,
  Warehouse,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageDetailModal } from '@/components/common/PackageDetailModal'
import { Modal } from '@/components/ui/Modal'
import { couriersService } from '@/services/couriers.service'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { packagesService } from '@/services/packages.service'
import { personsService } from '@/services/persons.service'
import { vehiclesService } from '@/services/vehicles.service'
import type { Courier, Delivery, Driver, Package, Person, Vehicle } from '@/types'
import { cn } from '@/utils/cn'
import {
  countGlobalSearchResults,
  searchGlobal,
  type GlobalSearchResult,
  type GlobalSearchResultType,
} from '@/utils/global-search'

interface GlobalSearchModalProps {
  open: boolean
  onClose: () => void
}

const TYPE_ICONS: Record<GlobalSearchResultType, typeof PackageIcon> = {
  person: Users,
  package: PackageIcon,
  driver: UserRound,
  delivery: Truck,
  courier: Warehouse,
  vehicle: Car,
}

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [detailPackage, setDetailPackage] = useState<Package | null>(null)
  const [data, setData] = useState<{
    persons: Person[]
    packages: Package[]
    drivers: Driver[]
    deliveries: Delivery[]
    couriers: Courier[]
    vehicles: Vehicle[]
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setData(null)
      setLoading(false)
      return
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    const trimmed = query.trim()
    if (!open || !trimmed || data) return

    let active = true
    setLoading(true)

    Promise.all([
      personsService.getAll(),
      packagesService.getAll(),
      driversService.getAll(),
      deliveriesService.getAll(),
      couriersService.getAll(),
      vehiclesService.getAll(),
    ])
      .then(([persons, packages, drivers, deliveries, couriers, vehicles]) => {
        if (active) setData({ persons, packages, drivers, deliveries, couriers, vehicles })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [open, query, data])

  const groups = useMemo(() => {
    if (!data || !query.trim()) return []
    return searchGlobal(query, data)
  }, [data, query])

  const totalResults = countGlobalSearchResults(groups)

  const handleSelect = (result: GlobalSearchResult) => {
    switch (result.type) {
      case 'person':
        if (result.person) {
          onClose()
          navigate('/clientes', { state: { openPersonId: result.person.id } })
        }
        return
      case 'package':
        if (result.package) {
          onClose()
          setDetailPackage(result.package)
        }
        return
      case 'driver':
        if (result.driver) {
          onClose()
          navigate('/drivers', { state: { openHistoryDriverId: result.driver.id } })
        }
        return
      case 'delivery':
        if (result.delivery) {
          onClose()
          navigate(`/deliveries/${result.delivery.id}`)
        }
        return
      case 'courier':
        onClose()
        navigate('/couriers')
        return
      case 'vehicle':
        onClose()
        navigate('/vehicles')
        return
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Buscar en el sistema"
        description="Código SH, destinatario, teléfono, chofer, reparto, correo o vehículo."
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej: SH10005, Juan Pérez, 11 5555-1234, chofer…"
              className="h-11 w-full rounded-[10px] border border-border bg-surface pr-3 pl-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {!query.trim() ? (
            <div className="rounded-[10px] border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-text-secondary">
              Escribí al menos un carácter para buscar en paquetes, clientes, choferes, repartos y
              más.
            </div>
          ) : loading ? (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-border bg-background px-4 py-10 text-sm text-text-secondary"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
              <span>Buscando…</span>
            </div>
          ) : totalResults === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-text-secondary">
              No encontramos resultados para <strong className="text-text-primary">“{query.trim()}”</strong>.
            </div>
          ) : (
            <div className="max-h-[min(60vh,420px)] space-y-5 overflow-auto pr-1">
              {groups.map((group) => (
                <section key={group.type}>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
                    {group.label}
                  </p>
                  <ul className="space-y-1">
                    {group.results.map((result) => {
                      const Icon = TYPE_ICONS[result.type]
                      return (
                        <li key={result.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(result)}
                            className={cn(
                              'flex w-full items-start gap-3 rounded-[10px] border border-transparent px-3 py-2.5 text-left transition',
                              'hover:border-border hover:bg-background',
                            )}
                          >
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-text-primary">
                                {result.title}
                              </span>
                              <span className="block truncate text-sm text-text-secondary">
                                {result.subtitle}
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <p className="text-xs text-text-muted">
            Tip: probá con un código SH, nombre del destinatario, DNI del chofer o código de reparto.
          </p>
        </div>
      </Modal>

      <PackageDetailModal pkg={detailPackage} onClose={() => setDetailPackage(null)} />
    </>
  )
}
