import { useEffect, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'

export default function UsuariosPage() {
  const { token } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '', role: 'CORRETOR' })

  async function carregar() {
    const data = await hubService.usuarios(token)
    setUsuarios(data)
  }

  useEffect(() => { carregar().catch(() => {}) }, [])

  async function submit(e) {
    e.preventDefault()
    await hubService.criarUsuario(token, form)
    setForm({ nome: '', email: '', telefone: '', senha: '', role: 'CORRETOR' })
    await carregar()
  }

  return (
    <AppLayout title="Usuários">
      <section className="pill-card rounded-3xl p-6 mb-8">
        <h2 className="text-4xl font-semibold mb-4">Gerenciamento de usuários</h2>
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={submit}>
          <input className="input-hub rounded-xl p-3 text-xl" placeholder="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          <input className="input-hub rounded-xl p-3 text-xl" placeholder="E-mail" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input className="input-hub rounded-xl p-3 text-xl" placeholder="Telefone" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
          <input type="password" className="input-hub rounded-xl p-3 text-xl" placeholder="Senha" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} />
          <select className="input-hub rounded-xl p-3 text-xl" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="ADMIN_MASTER">ADMIN MASTER</option>
            <option value="TIME_COMERCIAL">TIME COMERCIAL</option>
            <option value="CORRETOR">CORRETOR</option>
          </select>
          <button className="bg-hubBlueDeep text-white rounded-xl p-3 text-xl">Criar usuário</button>
        </form>
      </section>

      <section className="pill-card rounded-3xl p-6">
        <div className="space-y-3 text-xl">
          {usuarios.map((u) => (
            <div key={u.id} className="border border-white/70 rounded-xl px-3 py-2 flex justify-between">
              <span>{u.nome} ({u.role})</span>
              <span>{u.email}</span>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  )
}
