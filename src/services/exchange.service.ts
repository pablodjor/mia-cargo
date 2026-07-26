import type { OfficialUsdRate } from '@/types/exchange'

const FALLBACK_RATE = 1501

export const exchangeService = {
  async getOfficialUsd(): Promise<OfficialUsdRate> {
    try {
      const response = await fetch('https://api.bluelytics.com.ar/v2/latest', {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error('No se pudo obtener la cotización')
      }

      const data = (await response.json()) as {
        oficial?: { value_sell?: number; value_buy?: number; value_avg?: number }
        last_update?: string
      }

      const sell = data.oficial?.value_sell
      if (typeof sell !== 'number' || !Number.isFinite(sell)) {
        throw new Error('Cotización inválida')
      }

      return {
        sell,
        buy: data.oficial?.value_buy ?? sell,
        average: data.oficial?.value_avg ?? sell,
        updatedAt: data.last_update ?? new Date().toISOString(),
        source: 'bluelytics',
        isFallback: false,
      }
    } catch {
      return {
        sell: FALLBACK_RATE,
        buy: FALLBACK_RATE - 50,
        average: FALLBACK_RATE - 25,
        updatedAt: new Date().toISOString(),
        source: 'fallback',
        isFallback: true,
      }
    }
  },
}
