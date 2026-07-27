import { PAYMENT_STATUS_LABELS, translateHistoryStatus } from '@/constants/labels'
import type { HistoryEntry } from '@/types'

const STATUS_TOKEN_PATTERN =
  /\b(pending|assigned|in_route|delivered|not_delivered|rescheduled|cancelled|draft|prepared|in_progress|completed|paid|cash|usd_cash|transfer|active|inactive)\b/g

function replaceStatusToken(token: string): string {
  return translateHistoryStatus(token) ?? PAYMENT_STATUS_LABELS[token as keyof typeof PAYMENT_STATUS_LABELS] ?? token
}

/** Muestra descripciones del historial con estados traducidos (p. ej. in_progress → En curso). */
export function formatHistoryDescription(entry: HistoryEntry): string {
  let text = entry.description

  if (entry.newStatus) {
    const label = translateHistoryStatus(entry.newStatus)
    if (label && label !== entry.newStatus) {
      text = text.replace(new RegExp(`\\b${entry.newStatus}\\b`, 'g'), label)
    }
  }

  if (entry.previousStatus) {
    const label = translateHistoryStatus(entry.previousStatus)
    if (label && label !== entry.previousStatus) {
      text = text.replace(new RegExp(`\\b${entry.previousStatus}\\b`, 'g'), label)
    }
  }

  return text.replace(STATUS_TOKEN_PATTERN, (token) => replaceStatusToken(token))
}
