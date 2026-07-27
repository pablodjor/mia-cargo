import { useMemo, useState } from 'react'
import { PackageDetailModal } from '@/components/common/PackageDetailModal'
import type { Package } from '@/types'
import { cn } from '@/utils/cn'

interface PackageShCodeButtonProps {
  pkg?: Package | null
  packageId?: string
  packages?: Package[]
  packagesById?: Map<string, Package>
  shCode?: string
  className?: string
  stopPropagation?: boolean
}

function resolvePackage({
  pkg,
  packageId,
  packages,
  packagesById,
}: Pick<PackageShCodeButtonProps, 'pkg' | 'packageId' | 'packages' | 'packagesById'>): Package | null {
  if (pkg) return pkg
  if (packageId && packagesById?.has(packageId)) return packagesById.get(packageId) ?? null
  if (packageId && packages) return packages.find((item) => item.id === packageId) ?? null
  return null
}

export function PackageShCodeButton({
  pkg,
  packageId,
  packages,
  packagesById,
  shCode,
  className,
  stopPropagation = true,
}: PackageShCodeButtonProps) {
  const [detail, setDetail] = useState<Package | null>(null)
  const resolved = useMemo(
    () => resolvePackage({ pkg, packageId, packages, packagesById }),
    [pkg, packageId, packages, packagesById],
  )
  const label = shCode ?? resolved?.shCode ?? '—'

  if (!resolved) {
    return <span className={cn('font-mono text-sm font-semibold', className)}>{label}</span>
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          'font-mono text-sm font-semibold text-primary underline-offset-2 hover:underline',
          className,
        )}
        onClick={(event) => {
          if (stopPropagation) event.stopPropagation()
          setDetail(resolved)
        }}
      >
        {label}
      </button>
      <PackageDetailModal pkg={detail} onClose={() => setDetail(null)} />
    </>
  )
}
