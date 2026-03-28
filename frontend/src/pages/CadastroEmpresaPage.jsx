import { useState } from 'react'
import { Link } from 'react-router-dom'
import { hubService } from '../services/hubService'
import logoCommercialHub from '../assets/logo-commercial-hub.jpeg'

const PLAN_OPTIONS = [
  { value: 'BASIC', label: 'Basic' },
  { value: 'PRO', label: 'Pro' }
]

function onlyDigits(value) {
  return value.replace(/\D+/g, '')
}

function formatCnpj(value) {
  const digits = onlyDigits(value).slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export default function CadastroEmpresaPage() {
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    plano: 'BASIC',
    adminNome: '',
    adminEmail: '',
    adminTelefone: '',
    adminSenha: ''
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setErro('')
    setSucesso('')
    setLoading(true)
    try {
      await hubService.criarEmpresa({
        ...form,
        cnpj: onlyDigits(form.cnpj),
        adminTelefone: onlyDigits(form.adminTelefone)
      })
      setSucesso('Empresa cadastrada com sucesso. Você já pode fazer login.')
    } catch (error) {
      setErro(error.message || 'Não foi possível cadastrar a empresa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-background min-h-screen text-white flex items-center justify-center p-8">
      <div className="w-full max-w-[1320px] grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="pl-4 lg:pl-12">
          <p className="mb-5 text-4xl font-light">Cadastro da</p>
          <img
            src={logoCommercialHub}
            alt="Commercial HUB"
            className="h-32 w-auto max-w-full object-contain"
          />
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/80">
            Cadastre uma nova construtora e já crie o usuário administrador inicial da empresa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-[2rem] p-8 max-w-[620px] w-full justify-self-center">
          <div className="mb-8 flex items-center justify-between gap-4">
            <button type="button" className="pill-tab w-full rounded-full py-2 text-2xl">Nova empresa</button>
            <Link to="/login" className="rounded-full border border-white/20 px-5 py-2 text-base text-white/85">
              Voltar
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 text-base md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xl font-semibold">Nome da empresa</span>
              <input
                className="input-hub w-full rounded-2xl p-3 text-lg"
                value={form.nome}
                onChange={(e) => setForm((current) => ({ ...current, nome: e.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xl font-semibold">CNPJ</span>
              <input
                className="input-hub w-full rounded-2xl p-3 text-lg"
                value={form.cnpj}
                onChange={(e) => setForm((current) => ({ ...current, cnpj: formatCnpj(e.target.value) }))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xl font-semibold">Plano</span>
              <select
                className="input-hub w-full rounded-2xl p-3 text-lg"
                value={form.plano}
                onChange={(e) => setForm((current) => ({ ...current, plano: e.target.value }))}
              >
                {PLAN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xl font-semibold">Nome do administrador</span>
              <input
                className="input-hub w-full rounded-2xl p-3 text-lg"
                value={form.adminNome}
                onChange={(e) => setForm((current) => ({ ...current, adminNome: e.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xl font-semibold">E-mail do administrador</span>
              <input
                type="email"
                className="input-hub w-full rounded-2xl p-3 text-lg"
                value={form.adminEmail}
                onChange={(e) => setForm((current) => ({ ...current, adminEmail: e.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xl font-semibold">Telefone</span>
              <input
                className="input-hub w-full rounded-2xl p-3 text-lg"
                value={form.adminTelefone}
                onChange={(e) => setForm((current) => ({ ...current, adminTelefone: formatPhone(e.target.value) }))}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xl font-semibold">Senha inicial</span>
              <input
                type="password"
                className="input-hub w-full rounded-2xl p-3 text-lg"
                value={form.adminSenha}
                onChange={(e) => setForm((current) => ({ ...current, adminSenha: e.target.value }))}
              />
            </label>
          </div>

          {erro && <p className="mt-5 rounded-xl bg-red-600/30 px-4 py-3 text-base text-red-100">{erro}</p>}
          {sucesso && <p className="mt-5 rounded-xl bg-emerald-600/30 px-4 py-3 text-base text-emerald-100">{sucesso}</p>}

          <div className="mt-8">
            <button disabled={loading} className="rounded-xl bg-hubBlueDeep px-5 py-3 text-xl font-semibold">
              {loading ? 'CADASTRANDO...' : 'CRIAR EMPRESA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
