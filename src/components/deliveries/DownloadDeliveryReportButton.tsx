import { FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import type { DeliveryReportContext } from '@/utils/delivery-report-export'
import { downloadDeliveryReportExcel } from '@/utils/delivery-report-export'
import { cn } from '@/utils/cn'

interface DownloadDeliveryReportButtonProps {
  context: DeliveryReportContext
  className?: string
  variant?: 'primary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export function DownloadDeliveryReportButton({
  context,
  className,
  variant = 'outline',
  size = 'md',
  fullWidth = false,
}: DownloadDeliveryReportButtonProps) {
  const handleDownload = () => {
    try {
      downloadDeliveryReportExcel(context)
      toast.success('Reporte Excel descargado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el Excel')
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(fullWidth && 'w-full', className)}
      onClick={handleDownload}
    >
      <FileSpreadsheet className="h-4 w-4" />
      Descargar Excel
    </Button>
  )
}
