import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'

const CREATE_PERMISSIONS = ['CREATE_DEVELOPMENT', 'CREATE_USER', 'CREATE_MATERIAL']

export default function Sidebar({ user }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, hasPermission, token } = useAuth()
  const [iconeUrl, setIconeUrl] = useState(null)
  const canAccessCadastros = CREATE_PERMISSIONS.some(hasPermission)
  const canAccessUsuarios = hasPermission('VIEW_USER')
  const menu = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Institucional', to: '/institucional' },
    { label: 'Empreendimentos', to: '/empreendimentos' },
    ...(canAccessCadastros ? [{ label: 'Cadastros', to: '/cadastros' }] : []),
    { label: 'IA HUB', to: '/ia-hub' },
    ...(canAccessUsuarios ? [{ label: 'Usuários', to: '/usuarios' }] : []),
    { label: 'Meus dados', to: '/meus-dados' }
  ]

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    hubService.minhaEmpresa(token)
      .then((data) => setIconeUrl(data?.iconeUrl || null))
      .catch(() => setIconeUrl(null))
  }, [token])

  return (
    <aside className="sidebar-gradient w-72 min-h-screen text-white relative">
      <div className="p-5">
        <div className="rounded-2xl px-0 py-4">
          <div className="mx-auto h-56 w-56 overflow-hidden rounded-full">
            {iconeUrl ? (
              <img
                src={iconeUrl}
                alt="Ícone da empresa"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        </div>
      </div>

      <nav className="px-[14px] mt-6 text-[1.3rem] leading-tight space-y-2">
        {menu.map((item) => {
          const active = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`block w-full px-[34px] py-1 rounded-full transition-transform duration-200 ease-out hover:scale-[1.04] ${active ? 'pill-tab text-hubBlueDeep' : ''}`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="absolute left-0 right-0 bottom-6 text-center">
        <div className="text-[1.35rem] opacity-85">Suporte</div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 px-6 py-1 rounded-full pill-tab text-hubBlueDeep text-[1.2rem] font-semibold transition-transform duration-200 ease-out hover:scale-[1.04]"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
