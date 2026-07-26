import { Cloud } from 'lucide-react'
import { storageService } from '@/services/storage.service'

export function DemoRemoteBanner() {
  if (!storageService.isRemoteDemo()) return null

  return (
    <div className="border-b border-primary/20 bg-primary-light/80 px-4 py-2 text-center text-xs text-primary-hover">
      <Cloud className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
      <strong>Demo compartida</strong> · los datos se guardan en la nube y se ven en PC y celular
    </div>
  )
}
