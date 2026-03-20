import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const CREATE_PERMISSIONS = ['CREATE_DEVELOPMENT', 'CREATE_USER', 'CREATE_MATERIAL']

export default function Sidebar({ user }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, hasPermission } = useAuth()
  const canAccessCadastros = CREATE_PERMISSIONS.some(hasPermission)
  const canAccessUsuarios = hasPermission('VIEW_USER')
  const menu = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Empreendimentos', to: '/empreendimentos' },
    ...(canAccessCadastros ? [{ label: 'Cadastros', to: '/cadastros' }] : []),
    ...(canAccessUsuarios ? [{ label: 'Usuários', to: '/usuarios' }] : []),
    { label: 'Campanhas', to: '/campanhas' },
    { label: 'Meus dados', to: '/meus-dados' },
    { label: 'IA HUB', to: '/ia-hub' }
  ]

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar-gradient w-72 min-h-screen text-white relative">
      <div className="p-5">
        <div className="glass-panel rounded-2xl p-7 text-center">
          <h2 className="text-[1.95rem] font-light italic leading-8">Commercial</h2>
          <h2 className="text-[1.95rem] font-bold leading-8">HUB</h2>
          <p className="mt-5 font-semibold text-base">{user?.nome || 'Neymar Jr.'}</p>
          <p className="text-base leading-6">Gestor Comercial</p>
          <p className="text-base leading-6">Acesso master</p>
        </div>
      </div>

      <nav className="px-[14px] mt-6 text-[1.5rem] leading-tight space-y-2">
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
