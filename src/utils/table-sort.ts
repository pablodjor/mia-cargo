import type { TableSortState } from '@/components/ui/Table'

export function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es')
}

export function sortRows<T>(
  rows: T[],
  sort: TableSortState,
  getValue: (row: T, key: string) => string | number,
): T[] {
  return rows.slice().sort((a, b) => {
    const result = compareValues(getValue(a, sort.key), getValue(b, sort.key))
    return sort.direction === 'asc' ? result : -result
  })
}

export function toggleTableSort(
  current: TableSortState,
  key: string,
  defaultDescKeys: string[] = [],
): TableSortState {
  if (current.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  }
  return { key, direction: defaultDescKeys.includes(key) ? 'desc' : 'asc' }
}
