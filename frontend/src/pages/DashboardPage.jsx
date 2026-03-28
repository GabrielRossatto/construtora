import { useEffect, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'

export default function DashboardPage() {
  const { token } = useAuth()
  const [data, setData] = useState({ metrics: { empreendimentos: 0, usuarios: 0 } })

  useEffect(() => {
    hubService.dashboard(token).then(setData).catch(() => {})
  }, [token])

  return (
    <AppLayout
      title="Dashboard"
      action={<button className="pill-tab px-6 py-2 rounded-full text-xl font-semibold text-hubBlueDeep">Atualizar métricas</button>}
    >
      <section className="dashboard-card rounded-[3rem] p-6 mb-8">
        <h2 className="text-5xl font-bold text-center">Visão comercial</h2>
        <p className="text-2xl text-center">Centralize materiais, padronize abordagem e acompanhe a distribuição comercial em tempo real.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <MetricCard title="Empreendimentos" value={data.metrics.empreendimentos} />
        <MetricCard title="Usuários" value={data.metrics.usuarios} />
      </section>
    </AppLayout>
  )
}

function MetricCard({ title, value }) {
  return (
    <div className="dashboard-card rounded-3xl p-6 text-center">
      <h4 className="text-3xl font-semibold">{title}</h4>
      <p className="text-5xl mt-2">{String(value).padStart(2, '0')}</p>
    </div>
  )
}
