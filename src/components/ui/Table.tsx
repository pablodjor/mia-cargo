import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type TableSortDirection = 'asc' | 'desc'

export interface TableColumn<T> {
  key: string
  header: string
  className?: string
  render: (row: T) => ReactNode
  sortable?: boolean
}

export interface TableSortState {
  key: string
  direction: TableSortDirection
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string
  rowClassName?: (row: T) => string | undefined
  empty?: ReactNode
  sort?: TableSortState
  onSort?: (key: string) => void
}

export function Table<T>({
  columns,
  data,
  rowKey,
  rowClassName,
  empty,
  sort,
  onSort,
}: TableProps<T>) {
  if (data.length === 0) {
    return <>{empty}</>
  }

  return (
    <div className="w-full overflow-x-auto rounded-[12px] border border-border">
      <table className="min-w-full divide-y divide-border text-left text-sm">
        <thead className="bg-background">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-3 py-3 text-xs font-semibold tracking-wide text-text-secondary uppercase',
                  column.className,
                )}
              >
                {column.sortable && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    className={cn(
                      'inline-flex items-center gap-1 transition hover:text-text-primary',
                      sort?.key === column.key && 'text-text-primary',
                    )}
                  >
                    {column.header}
                    {sort?.key === column.key ? (
                      sort.direction === 'asc' ? (
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn('hover:bg-primary-light/40', rowClassName?.(row))}
            >
              {columns.map((column) => (
                <td key={column.key} className={cn('px-3 py-3 align-middle text-text-primary', column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
