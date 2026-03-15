import { useEffect, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'

const USER_PERMISSION_OPTIONS = [
  { code: 'CREATE_DEVELOPMENT', label: 'Cadastrar empreendimentos' },
  { code: 'CREATE_USER', label: 'Cadastrar usuários' },
  { code: 'CREATE_MATERIAL', label: 'Cadastrar materiais' }
]

export default function UsuariosPage() {
  const { token, user, hasPermission } = useAuth()
  const isAdminMaster = user?.role === 'ADMIN_MASTER'
  const canCreateUser = hasPermission('CREATE_USER')
  const [usuarios, setUsuarios] = useState([])
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '', role: 'CORRETOR', permissionCodes: [] })

  async function carregar() {
    const data = await hubService.usuarios(token)
    setUsuarios(data)
  }

  useEffect(() => { carregar().catch(() => {}) }, [])

  async function submit(e) {
    e.preventDefault()
    try {
      const payload = isAdminMaster ? form : { ...form, permissionCodes: [] }
      await hubService.criarUsuario(token, payload)
      setForm({ nome: '', email: '', telefone: '', senha: '', role: 'CORRETOR', permissionCodes: [] })
      await carregar()
      alert('Usuário criado com sucesso')
    } catch (error) {
      alert(error.message || 'Não foi possível criar o usuário')
    }
  }

  return (
    <AppLayout title="Usuários">
      <section className="pill-card rounded-3xl p-6 mb-8">
        <h2 className="text-4xl font-semibold mb-4">Gerenciamento de usuários</h2>
        {canCreateUser ? (
          <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={submit}>
            <input className="input-hub rounded-xl p-3 text-xl" placeholder="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            <input className="input-hub rounded-xl p-3 text-xl" placeholder="E-mail" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input className="input-hub rounded-xl p-3 text-xl" placeholder="Telefone" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
            <input type="password" minLength={8} className="input-hub rounded-xl p-3 text-xl" placeholder="Senha" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} />
            <select className="input-hub rounded-xl p-3 text-xl" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="ADMIN_MASTER">ADMIN MASTER</option>
              <option value="TIME_COMERCIAL">TIME COMERCIAL</option>
              <option value="CORRETOR">CORRETOR</option>
            </select>
            {isAdminMaster && (
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {USER_PERMISSION_OPTIONS.map((option) => {
                  const checked = form.permissionCodes.includes(option.code)
                  return (
                    <label key={option.code} className="input-hub rounded-xl p-3 text-lg flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setForm((current) => ({
                            ...current,
                            permissionCodes: e.target.checked
                              ? [...current.permissionCodes, option.code]
                              : current.permissionCodes.filter((code) => code !== option.code)
                          }))
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
            )}
            <button className="bg-hubBlueDeep text-white rounded-xl p-3 text-xl">Criar usuário</button>
          </form>
        ) : (
          <p className="text-xl">Você não tem permissão para cadastrar usuários.</p>
        )}
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
