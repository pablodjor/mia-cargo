import { zodResolver } from '@hookform/resolvers/zod'
import { Download, Package, Pencil, UserCheck, UserX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PersonPackagesModal } from '@/components/persons/PersonPackagesModal'
import { PackageAddressExtrasFields } from '@/components/packages/PackageAddressExtrasFields'
import { DestinationBadge } from '@/components/common/DestinationBadge'
import { MoneyBadge, StatBadge } from '@/components/common/StatBadge'
import { TableRowMenu } from '@/components/common/TableActions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/PageLoader'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { DESTINATION_LABELS } from '@/constants/labels'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePagination } from '@/hooks/usePagination'
import { personSchema, type PersonFormValues } from '@/schemas'
import { packagesService } from '@/services/packages.service'
import { personsService, type PersonInput } from '@/services/persons.service'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { couriersService } from '@/services/couriers.service'
import type { DestinationType, Person, PersonSummary } from '@/types'
import { getDestinationLocationDefaults } from '@/utils/destination-location'
import { formatDateTime } from '@/utils/date'
import { formatAddressExtrasSummary, formatAddressLine, streetAddressWithUnit } from '@/utils/address-details'
import { formatUsd } from '@/utils/money'
import {
  downloadAllPersonsReportExcel,
  downloadPersonReportExcel,
} from '@/utils/person-report-export'
import { getPackagesForPerson } from '@/utils/person-stats'
import { findDuplicatePersons } from '@/utils/person-duplicate'
import { formatFullName } from '@/utils/person-name'

const destinations = Object.entries(DESTINATION_LABELS).map(([value, label]) => ({ value, label }))

const emptyValues: PersonFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
  city: 'Buenos Aires',
  province: 'CABA',
  postalCode: '',
  destinationType: 'caba',
  status: 'active',
  notes: '',
  addressUnit: '',
  addressBell: '',
  addressPlaceType: undefined,
}

const DEFAULT_SORT: TableSortState = { key: 'name', direction: 'asc' }

function compareValues(a: string | number, b: string | number) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es')
}

function getSummarySortValue(row: PersonSummary, key: string): string | number {
  switch (key) {
    case 'name':
      return formatFullName(row.person)
    case 'phone':
      return row.person.phone
    case 'address':
      return formatAddressLine({
        address: row.person.address,
        city: row.person.city,
        province: row.person.province,
        postalCode: row.person.postalCode,
        unit: row.person.addressUnit,
        bell: row.person.addressBell,
        placeType: row.person.addressPlaceType,
      })
    case 'zone':
      return DESTINATION_LABELS[row.person.destinationType]
    case 'packages':
      return row.stats.packageCount
    case 'delivered':
      return row.stats.deliveredCount
    case 'active':
      return row.stats.activeCount
    case 'totalUsd':
      return row.stats.totalUsd
    case 'totalArs':
      return row.stats.totalArs
    case 'paid':
      return row.stats.paidArs
    case 'cash':
      return row.stats.cashArs
    case 'pending':
      return row.stats.pendingArs
    case 'updated':
      return row.stats.lastPackageAt ?? ''
    case 'status':
      return row.person.status
    default:
      return formatFullName(row.person)
  }
}

export default function PersonsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data, reload, loading } = useAsyncData(async () => {
    const [summaries, packages, deliveries, drivers, couriers] = await Promise.all([
      personsService.getSummaries(),
      packagesService.getAll(),
      deliveriesService.getAll(),
      driversService.getAll(),
      couriersService.getAll(),
    ])
    return { summaries, packages, deliveries, drivers, couriers }
  })

  const [query, setQuery] = useState({
    search: '',
    destination: '',
    status: '',
    hasPackages: '',
  })
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)
  const [editing, setEditing] = useState<Person | null | undefined>(undefined)
  const [packagesPerson, setPackagesPerson] = useState<Person | null>(null)
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    payload: PersonInput
    matches: Person[]
  } | null>(null)

  useEffect(() => {
    const personId = (location.state as { openPersonId?: string } | null)?.openPersonId
    if (!personId || !data?.summaries) return
    const summary = data.summaries.find((item) => item.person.id === personId)
    if (summary) setPackagesPerson(summary.person)
    navigate(location.pathname, { replace: true, state: null })
  }, [data?.summaries, location.pathname, location.state, navigate])

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: emptyValues,
  })

  const destinationType = form.watch('destinationType')
  const previousDestinationType = useRef<DestinationType | undefined>(undefined)

  useEffect(() => {
    if (editing === undefined) return
    form.reset(
      editing
        ? {
            firstName: editing.firstName,
            lastName: editing.lastName,
            phone: editing.phone,
            address: editing.address,
            city: editing.city,
            province: editing.province,
            postalCode: editing.postalCode,
            destinationType: editing.destinationType,
            status: editing.status,
            notes: editing.notes ?? '',
            addressUnit: editing.addressUnit ?? '',
            addressBell: editing.addressBell ?? '',
            addressPlaceType: editing.addressPlaceType,
          }
        : emptyValues,
    )
    previousDestinationType.current = editing?.destinationType ?? 'caba'
  }, [editing, form])

  useEffect(() => {
    if (editing === undefined) return
    const previous = previousDestinationType.current
    if (previous === destinationType) return
    previousDestinationType.current = destinationType
    const defaults = getDestinationLocationDefaults(destinationType, previous)
    if (defaults.city !== undefined) {
      form.setValue('city', defaults.city, { shouldValidate: true, shouldDirty: true })
    }
    if (defaults.province !== undefined) {
      form.setValue('province', defaults.province, { shouldValidate: true, shouldDirty: true })
    }
  }, [destinationType, editing, form])

  const filtered = useMemo(() => {
    const search = query.search.trim().toLowerCase()
    return (data?.summaries ?? []).filter(({ person, stats }) => {
      if (query.destination && person.destinationType !== query.destination) return false
      if (query.status && person.status !== query.status) return false
      if (query.hasPackages === 'with' && stats.packageCount === 0) return false
      if (query.hasPackages === 'without' && stats.packageCount > 0) return false
      if (!search) return true
      const haystack = [
        formatFullName(person),
        person.phone,
        person.address,
        person.addressUnit,
        person.addressBell,
        person.city,
        person.province,
        person.postalCode,
        person.notes ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(search)
    })
  }, [data?.summaries, query])

  const sorted = useMemo(
    () =>
      filtered.slice().sort((a, b) => {
        const left = getSummarySortValue(a, sort.key)
        const right = getSummarySortValue(b, sort.key)
        const result = compareValues(left, right)
        return sort.direction === 'asc' ? result : -result
      }),
    [filtered, sort],
  )

  const pager = usePagination(sorted)
  const packagesForModal = useMemo(() => {
    if (!packagesPerson || !data?.packages) return []
    return getPackagesForPerson(packagesPerson, data.packages)
  }, [packagesPerson, data?.packages])

  const open = (person?: Person) => setEditing(person ?? null)

  const buildPayload = (values: PersonFormValues): PersonInput => ({
    ...values,
    notes: values.notes?.trim() || undefined,
    addressUnit: values.addressUnit?.trim() || undefined,
    addressBell: values.addressBell?.trim() || undefined,
    addressPlaceType: values.addressPlaceType || undefined,
  })

  const performSave = async (payload: PersonInput) => {
    if (editing) await personsService.update(editing.id, payload)
    else await personsService.create(payload)
    toast.success('Cliente guardado')
    setEditing(undefined)
    setDuplicateConfirm(null)
    reload()
  }

  const save = form.handleSubmit(async (values) => {
    try {
      const payload = buildPayload(values)
      const persons = (data?.summaries ?? []).map((summary) => summary.person)
      const matches = findDuplicatePersons(persons, payload, editing?.id)

      if (matches.length > 0) {
        setDuplicateConfirm({ payload, matches })
        return
      }

      await performSave(payload)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    }
  })

  const handleSort = (key: string) => {
    setSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      const defaultDesc = ['packages', 'delivered', 'active', 'totalUsd', 'totalArs', 'paid', 'cash', 'pending', 'updated'].includes(key)
      return { key, direction: defaultDesc ? 'desc' : 'asc' }
    })
  }

  const downloadPersonReport = async (person: Person) => {
    try {
      const context = await personsService.getReportContext(person.id)
      downloadPersonReportExcel(context)
      toast.success('Reporte Excel descargado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el Excel')
    }
  }

  const downloadAllReports = async () => {
    try {
      const contexts = await Promise.all(
        sorted.map(async ({ person }) => personsService.getReportContext(person.id)),
      )
      downloadAllPersonsReportExcel(contexts)
      toast.success('Reporte general descargado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el Excel')
    }
  }

  const clearFilters = () => {
    setQuery({ search: '', destination: '', status: '', hasPackages: '' })
  }

  const hasFilters = Boolean(
    query.search.trim() || query.destination || query.status || query.hasPackages,
  )

  const columns: TableColumn<PersonSummary>[] = [
    {
      key: 'name',
      header: 'Cliente',
      sortable: true,
      className: 'min-w-[220px]',
      render: ({ person }) => (
        <div>
          <strong className="text-text-primary">{formatFullName(person)}</strong>
          <p className="text-sm text-text-secondary">{person.phone}</p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Dirección',
      sortable: true,
      className: 'min-w-[300px]',
      render: ({ person }) => {
        const extras = formatAddressExtrasSummary({
          unit: person.addressUnit,
          bell: person.addressBell,
          placeType: person.addressPlaceType,
        })

        return (
          <div className="min-w-[280px] text-sm">
            <p>{streetAddressWithUnit(person.address, person.addressUnit)}</p>
            <p className="text-text-secondary">
              {person.city}, {person.province}
            </p>
            {extras ? <p className="text-xs text-text-muted">{extras}</p> : null}
          </div>
        )
      },
    },
    {
      key: 'zone',
      header: 'Zona',
      sortable: true,
      render: ({ person }) => (
        <DestinationBadge destination={person.destinationType} />
      ),
    },
    {
      key: 'packages',
      header: 'Paquetes',
      sortable: true,
      render: ({ stats }) => <StatBadge value={stats.packageCount} tone="primary" />,
    },
    {
      key: 'delivered',
      header: 'Entregados',
      sortable: true,
      render: ({ stats }) => <StatBadge value={stats.deliveredCount} tone="success" />,
    },
    {
      key: 'active',
      header: 'Activos',
      sortable: true,
      render: ({ stats }) => <StatBadge value={stats.activeCount} tone="warning" />,
    },
    {
      key: 'totalUsd',
      header: 'Total USD',
      sortable: true,
      render: ({ stats }) =>
        stats.totalUsd > 0 ? (
          <Badge tone="info">{formatUsd(stats.totalUsd)}</Badge>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
    {
      key: 'totalArs',
      header: 'Total ARS',
      sortable: true,
      render: ({ stats }) => <MoneyBadge value={stats.totalArs} tone="purple" />,
    },
    {
      key: 'paid',
      header: 'Cobrado',
      sortable: true,
      render: ({ stats }) => <MoneyBadge value={stats.paidArs} tone="success" />,
    },
    {
      key: 'cash',
      header: 'Efectivo',
      sortable: true,
      render: ({ stats }) => <MoneyBadge value={stats.cashArs} tone="warning" />,
    },
    {
      key: 'pending',
      header: 'Pendiente',
      sortable: true,
      render: ({ stats }) => <MoneyBadge value={stats.pendingArs} tone="danger" />,
    },
    {
      key: 'updated',
      header: 'Último paquete',
      sortable: true,
      render: ({ stats }) =>
        stats.lastPackageAt ? (
          <time className="text-xs text-text-muted" dateTime={stats.lastPackageAt}>
            {formatDateTime(stats.lastPackageAt)}
          </time>
        ) : (
          '—'
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: ({ person }) => (
        <Badge tone={person.status === 'active' ? 'success' : 'neutral'}>
          {person.status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      render: ({ person }) => (
        <TableRowMenu
          items={[
            { label: 'Ver paquetes', icon: Package, onClick: () => setPackagesPerson(person) },
            { label: 'Descargar Excel', icon: Download, onClick: () => void downloadPersonReport(person) },
            { label: 'Editar', icon: Pencil, onClick: () => open(person) },
            {
              label: person.status === 'active' ? 'Desactivar' : 'Activar',
              icon: person.status === 'active' ? UserX : UserCheck,
              onClick: () => {
                void (async () => {
                  await personsService.setStatus(
                    person.id,
                    person.status === 'active' ? 'inactive' : 'active',
                  )
                  reload()
                })()
              },
              tone: person.status === 'active' ? 'danger' : 'default',
            },
          ]}
        />
      ),
    },
  ]

  if (loading) return <PageLoader label="Cargando clientes…" />

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-text-secondary">
            Destinatarios registrados con historial de paquetes, pagos y cobros.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void downloadAllReports()}>
            <Download className="h-4 w-4" />
            Exportar todo
          </Button>
          <Button onClick={() => open()}>Nuevo cliente</Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-5">
        <Input
          placeholder="Buscar nombre, teléfono, dirección…"
          value={query.search}
          onChange={(event) => setQuery({ ...query, search: event.target.value })}
        />
        <Select
          options={destinations}
          placeholder="Zona"
          value={query.destination}
          onChange={(event) => setQuery({ ...query, destination: event.target.value })}
        />
        <Select
          options={[
            { value: 'active', label: 'Activo' },
            { value: 'inactive', label: 'Inactivo' },
          ]}
          placeholder="Estado"
          value={query.status}
          onChange={(event) => setQuery({ ...query, status: event.target.value })}
        />
        <Select
          options={[
            { value: 'with', label: 'Con paquetes' },
            { value: 'without', label: 'Sin paquetes' },
          ]}
          placeholder="Paquetes"
          value={query.hasPackages}
          onChange={(event) => setQuery({ ...query, hasPackages: event.target.value })}
        />
        <Button variant="outline" disabled={!hasFilters} onClick={clearFilters}>
          Limpiar filtros
        </Button>
      </div>

      <p className="text-sm text-text-secondary">
        {sorted.length} cliente{sorted.length === 1 ? '' : 's'}
        {hasFilters ? ' con los filtros aplicados' : ' registrados'}.
      </p>

      <Table
        columns={columns}
        data={pager.pageItems}
        rowKey={(row) => row.person.id}
        sort={sort}
        onSort={handleSort}
        rowClassName={({ person, stats }) =>
          person.status === 'inactive'
            ? 'bg-background/80 opacity-75'
            : stats.pendingArs > 0
              ? 'bg-warning-light/20'
              : stats.packageCount > 0
                ? 'bg-success-light/10'
                : undefined
        }
        empty={
          <p className="py-8 text-center text-sm text-text-secondary">
            {hasFilters
              ? 'No hay clientes que coincidan con la búsqueda.'
              : 'Todavía no hay clientes registrados.'}
          </p>
        }
      />
      <Pagination {...pager} onPageChange={pager.setPage} />

      <PersonPackagesModal
        person={packagesPerson}
        packages={packagesForModal}
        deliveries={data?.deliveries ?? []}
        drivers={data?.drivers ?? []}
        couriers={data?.couriers ?? []}
        onClose={() => setPackagesPerson(null)}
      />

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Editar cliente' : 'Nuevo cliente'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(undefined)}>
              Cancelar
            </Button>
            <Button onClick={() => void save()}>Guardar</Button>
          </div>
        }
      >
        <form className="grid gap-3" onSubmit={(event) => void save(event)}>
          <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Nombre" error={form.formState.errors.firstName?.message} {...form.register('firstName')} />
            <Input label="Apellido" error={form.formState.errors.lastName?.message} {...form.register('lastName')} />
          </div>
            <Input label="Teléfono" error={form.formState.errors.phone?.message} {...form.register('phone')} />
          </div>
          <Input label="Dirección" error={form.formState.errors.address?.message} {...form.register('address')} />
          <PackageAddressExtrasFields
            values={{
              addressUnit: form.watch('addressUnit'),
              addressBell: form.watch('addressBell'),
              addressPlaceType: form.watch('addressPlaceType'),
            }}
            onChange={(patch) => {
              if (patch.addressUnit !== undefined) {
                form.setValue('addressUnit', patch.addressUnit, { shouldDirty: true })
              }
              if (patch.addressBell !== undefined) {
                form.setValue('addressBell', patch.addressBell, { shouldDirty: true })
              }
              if (patch.addressPlaceType !== undefined) {
                form.setValue('addressPlaceType', patch.addressPlaceType || undefined, {
                  shouldDirty: true,
                })
              }
            }}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Localidad" error={form.formState.errors.city?.message} {...form.register('city')} />
            <Input
              label="Provincia"
              error={form.formState.errors.province?.message}
              {...form.register('province')}
            />
            <Input
              label="Código postal"
              error={form.formState.errors.postalCode?.message}
              {...form.register('postalCode')}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Zona de destino"
              options={destinations}
              error={form.formState.errors.destinationType?.message}
              {...form.register('destinationType')}
            />
            <Select
              label="Estado"
              options={[
                { value: 'active', label: 'Activo' },
                { value: 'inactive', label: 'Inactivo' },
              ]}
              {...form.register('status')}
            />
          </div>
          <Textarea label="Notas" {...form.register('notes')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={duplicateConfirm !== null}
        title="Cliente duplicado"
        description={
          duplicateConfirm
            ? `Ya existe ${duplicateConfirm.matches.length === 1 ? 'un cliente' : `${duplicateConfirm.matches.length} clientes`} con los mismos datos (${duplicateConfirm.matches.map((person) => `${formatFullName(person)} · ${person.phone}`).join('; ')}). ¿Querés continuar igual?`
            : ''
        }
        confirmLabel="Sí, guardar igual"
        onCancel={() => setDuplicateConfirm(null)}
        onConfirm={() => {
          if (!duplicateConfirm) return
          void performSave(duplicateConfirm.payload).catch((error) => {
            toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
          })
        }}
      />
    </div>
  )
}
