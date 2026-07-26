export interface OfficialUsdRate {
  sell: number
  buy: number
  average: number
  updatedAt: string
  source: 'bluelytics' | 'fallback'
  isFallback: boolean
}
