import { getApiBaseUrl } from './apiBase'

const BASE_URL = getApiBaseUrl()

async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
  const isFormData = body instanceof FormData

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const validationMessage = errorBody.errors
      ? Object.values(errorBody.errors)[0]
      : null
    const message = errorBody.message || validationMessage || 'Erro ao processar requisição'
    throw new Error(message)
  }

  if (response.status === 204) return null
  const raw = await response.text()
  if (!raw) return null
  return JSON.parse(raw)
}

export const api = {
  request
}
