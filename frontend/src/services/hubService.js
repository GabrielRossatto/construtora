import { api } from './api'

export const hubService = {
  dashboard(token) {
    return api.request('/api/dashboard', { token })
  },
  empreendimentos(token) {
    return api.request('/api/empreendimentos', { token })
  },
  criarEmpreendimento(token, payload, fotoPerfil) {
    if (fotoPerfil) {
      const formData = new FormData()
      formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
      formData.append('fotoPerfil', fotoPerfil)
      return api.request('/api/empreendimentos', { method: 'POST', token, body: formData })
    }
    return api.request('/api/empreendimentos', { method: 'POST', token, body: payload })
  },
  materiais(token) {
    return api.request('/api/materiais', { token })
  },
  criarMaterial(token, payload, file) {
    const formData = new FormData()
    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    formData.append('file', file)
    return api.request('/api/materiais', { method: 'POST', token, body: formData })
  },
  campanhas(token) {
    return api.request('/api/campanhas', { token })
  },
  criarCampanha(token, payload) {
    return api.request('/api/campanhas', { method: 'POST', token, body: payload })
  },
  usuarios(token) {
    return api.request('/api/users', { token })
  },
  criarUsuario(token, payload) {
    return api.request('/api/users', { method: 'POST', token, body: payload })
  },
  publicMateriais(publicToken) {
    return api.request(`/api/public/empreendimentos/${publicToken}/materiais`)
  }
}
