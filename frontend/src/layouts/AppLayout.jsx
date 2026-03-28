import Sidebar from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'
import hubioLogo from '../assets/hubio-logo.png'

export default function AppLayout({ title, action, children }) {
  const { user } = useAuth()
  const showHeader = Boolean(title || action)

  return (
    <div className="app-theme min-h-screen bg-pageGray text-white flex">
      <Sidebar user={user} />
      <main className="flex-1 px-8 py-7 overflow-x-auto flex flex-col min-h-screen text-white">
        <div className="flex-1">
          {showHeader && (
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-4xl font-semibold">{title}</h1>
              {action}
            </div>
          )}
          {children}
        </div>
        <footer className="mt-10 border-t border-white/20 pt-5">
          <div className="flex items-end justify-between gap-4 text-sm text-white/70">
            <p>&copy; 2026 Hubio. Todos os direitos reservados.</p>
            <img
              src={hubioLogo}
              alt="Hubio"
              className="relative z-10 -mt-3 h-14 w-auto object-contain"
            />
          </div>
        </footer>
      </main>
    </div>
  )
}
