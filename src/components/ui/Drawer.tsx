import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BrandLogo } from '@/components/common/BrandLogo'
import { IconButton } from './IconButton'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Drawer({ open, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-secondary/50" onClick={onClose} />
      <aside className="absolute top-0 left-0 flex h-full w-[300px] flex-col bg-secondary text-white shadow-xl animate-fade-in">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-5">
          <BrandLogo />
          <IconButton label="Cerrar" className="shrink-0 text-white hover:bg-white/10" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-auto p-3">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
