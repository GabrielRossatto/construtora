import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/authService'
import logoCommercialHub from '../assets/logo-commercial-hub.jpeg'

const MOCK_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_MOCK_LOGIN === 'true'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const result = await authService.login({ email: email.trim().toLowerCase(), senha })
      login({ token: result.token, user: result.user, expiresAt: result.expiresAt })
      navigate('/dashboard')
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-background min-h-screen text-white flex items-center justify-center p-8">
      <div className="w-full max-w-[1300px] grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="pl-4 lg:pl-12">
          <p className="mb-5 text-4xl font-light">Bem vindo ao</p>
          <img
            src={logoCommercialHub}
            alt="Commercial HUB"
            className="h-32 w-auto max-w-full object-contain"
          />
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-[2rem] p-8 max-w-[520px] w-full justify-self-center">
          <div className="mb-10">
            <button type="button" className="pill-tab w-full rounded-full py-2 text-2xl">Login</button>
          </div>

          <label className="mb-6 block text-2xl font-semibold">
            E-mail
            <input className="input-hub mt-2 w-full rounded-2xl p-3 text-lg" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="mb-7 block text-2xl font-semibold">
            Senha
            <input type="password" className="input-hub mt-2 w-full rounded-2xl p-3 text-lg" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>

          {erro && <p className="mb-4 rounded-xl bg-red-600/30 px-4 py-2 text-base text-red-100">{erro}</p>}
          {MOCK_LOGIN_ENABLED && (
            <p className="mb-4 rounded-xl bg-amber-500/20 px-4 py-3 text-sm text-amber-100">
              Modo demonstracao ativo. O login funciona sem backend real.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button disabled={loading} className="rounded-xl bg-hubBlueDeep px-5 py-2 text-2xl font-semibold">
              {loading ? 'ENTRANDO...' : 'ENTRAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
