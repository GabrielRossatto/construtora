import { useEffect, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'

export default function MeusDadosPage() {
  const { token, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '', role: '' })

  useEffect(() => {
    hubService.meuPerfil(token)
      .then((data) => {
        setForm({
          nome: data.nome || '',
          email: data.email || '',
          telefone: data.telefone || '',
          senha: '',
          role: data.role || ''
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const payload = {
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        senha: form.senha.trim() ? form.senha : null
      }
      const updated = await hubService.atualizarMeuPerfil(token, payload)
      updateUser({
        nome: updated.nome,
        email: updated.email,
        role: updated.role
      })
      setForm((current) => ({ ...current, senha: '', role: updated.role || current.role }))
      alert('Dados atualizados com sucesso')
    } catch (error) {
      alert(error.message || 'Não foi possível atualizar seus dados')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="Meus dados">
      <section className="dashboard-card rounded-3xl p-6">
        {loading ? (
          <p className="text-xl">Carregando dados...</p>
        ) : (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="block mb-1">Nome</span>
              <input className="input-hub rounded-xl p-3 text-xl w-full" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </label>
            <label className="block">
              <span className="block mb-1">E-mail</span>
              <input className="input-hub rounded-xl p-3 text-xl w-full" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="block">
              <span className="block mb-1">Telefone</span>
              <input className="input-hub rounded-xl p-3 text-xl w-full" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
            </label>
            <label className="block">
              <span className="block mb-1">Perfil</span>
              <input className="input-hub rounded-xl p-3 text-xl w-full opacity-80" value={form.role} disabled readOnly />
            </label>
            <label className="block md:col-span-2">
              <span className="block mb-1">Nova senha (opcional)</span>
              <input type="password" minLength={8} className="input-hub rounded-xl p-3 text-xl w-full" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} />
            </label>
            <div className="md:col-span-2">
              <button disabled={saving} className="bg-hubBlueDeep text-white rounded-xl p-3 text-xl">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        )}
      </section>
    </AppLayout>
  )
}
