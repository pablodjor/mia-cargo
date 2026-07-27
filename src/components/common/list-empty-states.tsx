import {
  AlertTriangle,
  History,
  Package,
  Truck,
  UserRound,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

function ListEmpty({
  icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return <EmptyState icon={icon} title={title} description={description} />
}

export function DriversListEmpty() {
  return (
    <ListEmpty
      icon={UserRound}
      title="Sin choferes registrados"
      description="Cuando agregues choferes al sistema, van a aparecer acá con su contacto y repartos."
    />
  )
}

export function DeliveriesListEmpty({ dateLabel }: { dateLabel?: string }) {
  return (
    <ListEmpty
      icon={Truck}
      title={dateLabel ? 'Sin repartos en esa fecha' : 'Sin repartos todavía'}
      description={
        dateLabel
          ? `No hay repartos programados para ${dateLabel}. Probá otra fecha o creá uno nuevo.`
          : 'Creá un reparto para organizar entregas, asignar choferes y seguir el progreso.'
      }
    />
  )
}

export function PackagesListEmpty() {
  return (
    <ListEmpty
      icon={Package}
      title="Sin paquetes cargados"
      description="Los paquetes que registres van a listarse acá con destino, pago y estado."
    />
  )
}

export function VehiclesListEmpty() {
  return (
    <ListEmpty
      icon={Truck}
      title="Sin vehículos"
      description="Agregá furgones o utilitarios para asignarlos a repartos y choferes."
    />
  )
}

export function CouriersListEmpty() {
  return (
    <ListEmpty
      icon={Warehouse}
      title="Sin correos configurados"
      description="Registrá sucursales de Andreani, Correo Argentino u otros para repartos a correo."
    />
  )
}

export function UsersListEmpty() {
  return (
    <ListEmpty
      icon={Users}
      title="Sin usuarios"
      description="Creá cuentas para operadores, lectores y choferes que usen el sistema."
    />
  )
}

export function IncidentsListEmpty() {
  return (
    <ListEmpty
      icon={AlertTriangle}
      title="Sin incidencias"
      description="Acá vas a ver paquetes con entregas fallidas, reprogramaciones o pendientes de resolver."
    />
  )
}

export function HistoryPackageEventsEmpty() {
  return (
    <ListEmpty
      icon={History}
      title="Sin eventos para este paquete"
      description="Todavía no hay movimientos registrados para el paquete filtrado."
    />
  )
}

export function HistoryListEmpty() {
  return (
    <ListEmpty
      icon={History}
      title="Sin movimientos"
      description="Las acciones sobre paquetes, repartos y clientes quedan registradas en este historial."
    />
  )
}

export function DriverDeliveriesEmpty() {
  return (
    <ListEmpty
      icon={Truck}
      title="Sin repartos asignados"
      description="Cuando te asignen un reparto vas a verlo acá para iniciarlo y registrar entregas."
    />
  )
}

export function DriverDeliveriesFilteredEmpty({ label }: { label: string }) {
  return (
    <ListEmpty
      icon={Truck}
      title={`Sin repartos ${label}`}
      description="Probá otro filtro o volvé a Todos para ver el resto."
    />
  )
}

export function ActiveDeliveriesEmpty() {
  return (
    <ListEmpty
      icon={Truck}
      title="Nada en curso ahora"
      description="Los repartos iniciados van a mostrarse acá con su avance en tiempo real."
    />
  )
}
