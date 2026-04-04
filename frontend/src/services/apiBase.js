export function getApiBaseUrl() {
  if (import.meta.env.PROD) {
    return ''
  }

  return import.meta.env.VITE_API_URL || ''
}
