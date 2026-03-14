const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

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
    const message = errorBody.message || 'Erro ao processar requisição'
    throw new Error(message)
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  request
}
