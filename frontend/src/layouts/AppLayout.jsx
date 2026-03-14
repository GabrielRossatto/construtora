import Sidebar from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'

export default function AppLayout({ title, action, children }) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-pageGray text-slate-900 flex">
      <Sidebar user={user} />
      <main className="flex-1 px-8 py-7 overflow-x-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-semibold">{title}</h1>
          {action}
        </div>
        {children}
      </main>
    </div>
  )
}
