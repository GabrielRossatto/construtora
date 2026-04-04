import { api } from './api'

const MOCK_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_MOCK_LOGIN === 'true'
const MOCK_USER = {
  id: 1,
  nome: 'Administrador Demo',
  email: 'demo@hubio.local',
  role: 'ADMIN_MASTER',
  empresaId: 1,
  permissions: [
    'CREATE_DEVELOPMENT',
    'CREATE_USER',
    'CREATE_MATERIAL',
    'VIEW_USER'
  ]
}

export const authService = {
  async login(payload) {
    if (MOCK_LOGIN_ENABLED) {
      return {
        token: 'mock-token',
        user: {
          ...MOCK_USER,
          email: payload?.email?.trim()?.toLowerCase() || MOCK_USER.email
        },
        expiresAt: null
      }
    }
    return api.request('/api/auth/login', {
      method: 'POST',
      body: payload
    })
  }
}
