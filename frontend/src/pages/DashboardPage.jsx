import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'
import { useToast } from '../hooks/useToast'

export default function DashboardPage() {
  const { token } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [data, setData] = useState({ metrics: { empreendimentos: 0, usuarios: 0 } })

  async function refreshDashboard(showFeedback = false) {
    try {
      const dashboard = await hubService.dashboard(token)
      setData(dashboard)
      if (showFeedback) {
        toast.success('Painel atualizado com os dados mais recentes.')
      }
    } catch {
      if (showFeedback) {
        toast.error('Não foi possível atualizar o painel agora.')
      }
    }
  }

  useEffect(() => {
    refreshDashboard()
  }, [token])

  const quickActions = [
    {
      title: 'Nova consulta comercial',
      description: 'Abra a IA já com o contexto do empreendimento ativo.',
      cta: 'Ir para IA HUB',
      onClick: () => navigate('/ia-hub')
    },
    {
      title: 'Cadastrar material',
      description: 'Suba flyer, catálogo e apoio comercial com menos cliques.',
      cta: 'Abrir cadastros',
      onClick: () => navigate('/cadastros')
    },
    {
      title: 'Atualizar vitrine pública',
      description: 'Confira tabela pública e materiais antes de compartilhar.',
      cta: 'Ver empreendimentos',
      onClick: () => navigate('/empreendimentos')
    }
  ]

  return (
    <AppLayout
      title="Dashboard"
      action={(
        <button
          type="button"
          onClick={() => refreshDashboard(true)}
          className="pill-tab px-6 py-2 rounded-full text-xl font-semibold text-hubBlueDeep"
        >
          Atualizar métricas
        </button>
      )}
    >
      <section className="dashboard-card rounded-[3rem] p-6 mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55 text-center">Hub comercial</p>
        <h2 className="text-5xl font-bold text-center">Visão comercial</h2>
        <p className="text-2xl text-center">Centralize materiais, padronize abordagem e acompanhe a distribuição comercial em tempo real.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <MetricCard title="Empreendimentos" value={data.metrics.empreendimentos} />
        <MetricCard title="Usuários" value={data.metrics.usuarios} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {quickActions.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={item.onClick}
            className="dashboard-card rounded-[2rem] p-6 text-left transition hover:translate-y-[-2px]"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Ação rápida</p>
            <h3 className="mt-3 text-2xl font-semibold">{item.title}</h3>
            <p className="mt-3 text-white/72 leading-7">{item.description}</p>
            <span className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold">
              {item.cta}
            </span>
          </button>
        ))}
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
