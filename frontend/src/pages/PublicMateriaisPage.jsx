import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { hubService } from '../services/hubService'

function sanitizeFileName(name) {
  return (name || 'material')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildDownloadUrl(material) {
  try {
    const url = new URL(material.arquivoUrl)
    const fileName = sanitizeFileName(material.titulo || 'material')
    url.searchParams.set('response-content-disposition', `attachment; filename="${fileName}"`)
    url.searchParams.set('response-content-type', 'application/octet-stream')
    return url.toString()
  } catch {
    return material.arquivoUrl
  }
}

function formatLocation(localizacao) {
  if (!localizacao) return 'Localização sob consulta'
  return [
    [localizacao.logradouro, localizacao.numero].filter(Boolean).join(', '),
    localizacao.complemento,
    localizacao.bairro,
    [localizacao.cidade, localizacao.estado].filter(Boolean).join(' - ')
  ].filter(Boolean).join(' • ')
}

function formatArea(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numeric)} m²`
}

function formatCurrency(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric)
}

function formatDisplayValue(unidade) {
  if (!unidade) return 'Sob consulta'
  if (unidade.tipoValor === 'RESERVADO') return 'RESERVADO'
  return formatCurrency(unidade.valor) || 'Sob consulta'
}

function formatDate(value) {
  if (!value) return 'Sob consulta'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'Sob consulta'
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const year = parsed.getFullYear()
  return `${month}/${year}`
}

export default function PublicMateriaisPage() {
  const { publicToken } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!publicToken) return
    hubService.publicMateriais(publicToken)
      .then(setData)
      .catch((e) => setError(e.message || 'Link inválido'))
  }, [publicToken])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center rounded-[2rem] p-10 bg-white/90 shadow-soft border border-slate-200">
          <h1 className="text-3xl font-bold mb-2 text-slate-900">Empreendimento indisponível</h1>
          <p className="text-lg text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-xl text-slate-700">Carregando apresentação...</p>
      </div>
    )
  }

  const tipos = data.tipos || []
  const materiais = data.materiais || []
  const percentualObra = Number.isFinite(Number(data.percentualObra)) ? Number(data.percentualObra) : 0
  const materiaisPorPasta = materiais.reduce((groups, material) => {
    const key = material.pastaDestino || 'Materiais gerais'
    groups[key] = groups[key] || []
    groups[key].push(material)
    return groups
  }, {})
  const pastasAgrupadas = Object.entries(materiaisPorPasta).filter(([pasta]) => pasta !== 'Materiais gerais')
  const materiaisAvulsos = materiaisPorPasta['Materiais gerais'] || []

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f1f5f9_45%,#e2e8f0_100%)]">
      <main className="max-w-7xl mx-auto px-5 py-6 md:px-8 md:py-10">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 shadow-soft backdrop-blur-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 md:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-hubBlueDeep">Apresentação exclusiva</p>
              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-slate-950">
                {data.empreendimentoNome}
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-600 max-w-2xl">
                {data.descricao}
              </p>
              <p className="mt-5 text-sm uppercase tracking-[0.18em] text-slate-500">
                {formatLocation(data.localizacao)}
              </p>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                <LeadStat label="Tipos" value={tipos.length} />
                <LeadStat label="Materiais" value={materiais.length} />
                <LeadStat label="Obra" value={`${percentualObra}%`} />
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoCard label="Início da obra" value={formatDate(data.dataInicioObra)} />
                <InfoCard label="Entrega prevista" value={formatDate(data.dataEntrega)} />
              </div>
            </div>

            <div className="relative min-h-[320px] lg:min-h-full bg-slate-100">
              {data.fotoPerfilUrl ? (
                <img
                  src={data.fotoPerfilUrl}
                  alt={data.empreendimentoNome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full min-h-[320px] grid place-items-center bg-gradient-to-br from-slate-200 to-slate-100 text-slate-500 text-lg">
                  Sem imagem de capa
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="rounded-[1.5rem] bg-white/90 backdrop-blur-sm border border-white px-5 py-4 shadow-soft">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Área de lazer</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {formatArea(data.metragemLazer) || 'Metragem sob consulta'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{data.descricaoLazer || 'Detalhes da área de lazer serão informados em breve.'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
          <div className="space-y-6">
            <Panel title="Tipos disponíveis" eyebrow="Configurações">
              {tipos.length === 0 ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-6 text-slate-500">
                  Os tipos deste empreendimento serão disponibilizados em breve.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tipos.map((tipo) => (
                    <article key={tipo.titulo} className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-hubBlueDeep">{tipo.titulo}</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">
                        {formatArea(tipo.areaMetragem) || 'Sob consulta'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <InfoBadge>{tipo.quantidadeSuites ?? 0} suíte(s)</InfoBadge>
                        <InfoBadge>{tipo.quantidadeVagas ?? 0} vaga(s)</InfoBadge>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Andamento da obra" eyebrow="Evolução">
              <div className="rounded-[1.5rem] bg-white/90 border border-slate-200 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Status atual</p>
                    <p className="mt-2 text-4xl font-semibold text-slate-900">{percentualObra}%</p>
                  </div>
                  <p className="max-w-sm text-sm leading-6 text-slate-600">
                    Acompanhe o avanço da obra e consulte os materiais públicos para conhecer o empreendimento com mais profundidade.
                  </p>
                </div>
                <div className="mt-5 h-4 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-hubBlue to-hubBlueDeep"
                    style={{ width: `${percentualObra}%` }}
                  />
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Materiais disponíveis" eyebrow="Downloads">
              {materiais.length === 0 ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-6 text-slate-500">
                  Nenhum material publicado até o momento.
                </div>
              ) : (
                <div className="space-y-5">
                  {pastasAgrupadas.map(([pasta, pastaMateriais]) => (
                    <article key={pasta} className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="grid h-16 w-16 place-items-center rounded-[1.25rem] bg-white text-hubBlueDeep shadow-soft">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
                              <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900">{pasta}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {pastaMateriais.length} arquivo(s) agrupado(s) nesta pasta.
                            </p>
                          </div>
                        </div>
                        <a
                          href={hubService.publicMateriaisFolderZip(publicToken, pasta)}
                          className="inline-flex items-center rounded-full bg-hubBlueDeep px-5 py-2 text-sm font-semibold text-white whitespace-nowrap"
                        >
                          Baixar pasta
                        </a>
                      </div>
                    </article>
                  ))}

                  {materiaisAvulsos.map((material) => (
                    <article key={material.id} className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900">{material.titulo}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{material.descricao}</p>
                        </div>
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                          {material.tipoArquivo}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <a
                          href={material.arquivoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full bg-hubBlueDeep px-5 py-2 text-sm font-semibold text-white"
                        >
                          Abrir material
                        </a>
                        <a
                          href={buildDownloadUrl(material)}
                          download
                          className="inline-flex items-center rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700"
                        >
                          Baixar
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Panel>

          </div>
        </section>

        <footer className="py-8 text-center text-xs uppercase tracking-[0.18em] text-slate-500">
          Conteúdo oficial compartilhado via Commercial HUB
        </footer>
      </main>
    </div>
  )
}

function Panel({ eyebrow, title, children }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-soft backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function LeadStat({ label, value }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white/80 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function InfoBadge({ children }) {
  return (
    <span className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200">
      {children}
    </span>
  )
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white/80 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}
