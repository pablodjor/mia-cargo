import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/Alert'
import { DELIVERY_STATUS_LABELS } from '@/constants/labels'
import type { PackageDeliveryAssignment } from '@/utils/package-delivery-info'

interface PackageDeliveryAssignmentAlertProps {
  assignment: PackageDeliveryAssignment
}

export function PackageDeliveryAssignmentAlert({ assignment }: PackageDeliveryAssignmentAlertProps) {
  return (
    <Alert tone="info" title="Reparto asignado">
      <p className="text-sm">
        Este paquete está en el reparto{' '}
        <Link
          to={`/deliveries/${assignment.deliveryId}`}
          className="font-mono font-semibold text-primary hover:underline"
        >
          {assignment.deliveryCode}
        </Link>
        {assignment.driverName ? ` · chofer ${assignment.driverName}` : null}
        {' · '}
        {DELIVERY_STATUS_LABELS[assignment.deliveryStatus]}
      </p>
    </Alert>
  )
}
