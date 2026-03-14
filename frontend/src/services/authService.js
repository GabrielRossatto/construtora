import { api } from './api'

export const authService = {
  login(payload) {
    return api.request('/api/auth/login', {
      method: 'POST',
      body: payload
    })
  }
}
