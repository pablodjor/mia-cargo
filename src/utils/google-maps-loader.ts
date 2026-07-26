let loadPromise: Promise<void> | null = null

export function getGoogleMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  return key || undefined
}

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof google !== 'undefined' && google.maps) {
    return Promise.resolve()
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=es&region=AR`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      loadPromise = null
      reject(new Error('No se pudo cargar Google Maps'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
