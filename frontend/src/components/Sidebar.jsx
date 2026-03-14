import { Link, useLocation } from 'react-router-dom'

const menu = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Empreendimentos', to: '/empreendimentos' },
  { label: 'Cadastros', to: '/cadastros' },
  { label: 'Usuários', to: '/usuarios' },
  { label: 'Campanhas', to: '/campanhas' },
  { label: 'IA HUB', to: '/ia-hub' }
]

export default function Sidebar({ user }) {
  const location = useLocation()

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

      <nav className="px-8 mt-6 text-[1.5rem] leading-tight space-y-2">
        {menu.map((item) => {
          const active = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`block px-5 py-1 rounded-full transition-transform duration-200 ease-out hover:scale-[1.04] ${active ? 'pill-tab text-hubBlueDeep' : ''}`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="absolute left-0 right-0 bottom-6 text-center text-[1.35rem] opacity-85">Suporte</div>
    </aside>
  )
}
