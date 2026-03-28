import { api } from './api'

export const hubService = {
  criarEmpresa(payload) {
    return api.request('/api/empresas', { method: 'POST', body: payload })
  },
  minhaEmpresa(token) {
    return api.request('/api/empresas/me', { token })
  },
  atualizarIconeEmpresa(token, file) {
    const formData = new FormData()
    formData.append('icone', file)
    return api.request('/api/empresas/me/icone', { method: 'PUT', token, body: formData })
  },
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
      if (fotoPerfil) {
        formData.append('fotoPerfil', fotoPerfil)
      }
      return api.request('/api/empreendimentos', { method: 'POST', token, body: formData })
    }
    return api.request('/api/empreendimentos', { method: 'POST', token, body: payload })
  },
  atualizarEmpreendimento(token, id, payload, fotoPerfil) {
    if (fotoPerfil) {
      const formData = new FormData()
      formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
      formData.append('fotoPerfil', fotoPerfil)
      return api.request(`/api/empreendimentos/${id}`, { method: 'PUT', token, body: formData })
    }
    return api.request(`/api/empreendimentos/${id}`, { method: 'PUT', token, body: payload })
  },
  reajustarValoresEmpreendimento(token, id, payload) {
    return api.request(`/api/empreendimentos/${id}/reajuste-valores`, { method: 'PATCH', token, body: payload })
  },
  institucional(token) {
    return api.request('/api/institucional', { token })
  },
  criarInstitucionalArquivo(token, payload, arquivo) {
    const formData = new FormData()
    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    if (arquivo) formData.append('arquivo', arquivo)
    return api.request('/api/institucional', { method: 'POST', token, body: formData })
  },
  atualizarInstitucionalArquivo(token, id, payload, arquivo) {
    const formData = new FormData()
    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    if (arquivo) formData.append('arquivo', arquivo)
    return api.request(`/api/institucional/${id}`, { method: 'PUT', token, body: formData })
  },
  excluirInstitucionalArquivo(token, id) {
    return api.request(`/api/institucional/${id}`, { method: 'DELETE', token })
  },
  excluirEmpreendimento(token, id) {
    return api.request(`/api/empreendimentos/${id}`, { method: 'DELETE', token })
  },
  materiais(token) {
    return api.request('/api/materiais', { token })
  },
  atualizarMaterial(token, id, payload) {
    return api.request(`/api/materiais/${id}`, { method: 'PUT', token, body: payload })
  },
  excluirMaterial(token, id) {
    return api.request(`/api/materiais/${id}`, { method: 'DELETE', token })
  },
  uploadMaterialArquivo(token, file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.request('/api/materiais/upload', { method: 'POST', token, body: formData })
  },
  async criarMaterial(token, payload, file) {
    const upload = await hubService.uploadMaterialArquivo(token, file)
    const materialPayload = {
      ...payload,
      arquivoUrl: upload.arquivoUrl,
      tamanhoBytes: upload.tamanhoBytes
    }
    return api.request('/api/materiais', { method: 'POST', token, body: materialPayload })
  },
  usuarios(token) {
    return api.request('/api/users', { token })
  },
  criarUsuario(token, payload) {
    return api.request('/api/users', { method: 'POST', token, body: payload })
  },
  meuPerfil(token) {
    return api.request('/api/users/me', { token })
  },
  atualizarMeuPerfil(token, payload) {
    return api.request('/api/users/me', { method: 'PUT', token, body: payload })
  },
  publicMateriais(publicToken) {
    return api.request(`/api/public/empreendimentos/${publicToken}/materiais`)
  },
  publicMateriaisZip(publicToken) {
    const baseUrl = import.meta.env.VITE_API_URL || ''
    return `${baseUrl}/api/public/empreendimentos/${publicToken}/materiais/zip`
  },
  publicMateriaisFolderZip(publicToken, pastaDestino) {
    const baseUrl = import.meta.env.VITE_API_URL || ''
    return `${baseUrl}/api/public/empreendimentos/${publicToken}/materiais/pastas/${encodeURIComponent(pastaDestino)}/zip`
  }
}
