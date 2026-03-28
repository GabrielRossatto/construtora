import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/authService'
import logoCommercialHub from '../assets/logo-commercial-hub.jpeg'

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
      const result = await authService.login({ email, senha })
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
          <p className="text-5xl font-light mb-6">Bem vindo ao</p>
          <img
            src={logoCommercialHub}
            alt="Commercial HUB"
            className="h-36 w-auto max-w-full object-contain"
          />
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-[2rem] p-8 max-w-[520px] w-full justify-self-center">
          <div className="mb-10">
            <button type="button" className="pill-tab rounded-full py-2 text-3xl w-full">Login</button>
          </div>

          <label className="block mb-6 text-4xl font-semibold">
            E-mail
            <input className="input-hub w-full rounded-2xl mt-2 p-3 text-2xl" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="block mb-7 text-4xl font-semibold">
            Senha
            <input type="password" className="input-hub w-full rounded-2xl mt-2 p-3 text-2xl" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>

          {erro && <p className="text-red-100 bg-red-600/30 px-4 py-2 rounded-xl mb-4 text-xl">{erro}</p>}

          <button disabled={loading} className="bg-hubBlueDeep px-5 py-2 rounded-xl text-3xl font-semibold">
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  )
}
