import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { hubService } from '../services/hubService'

function formatCurrency(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'Sob consulta'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric)
}

function formatEntrada(condicoesPagamento) {
  if (!condicoesPagamento || condicoesPagamento.entradaValor === null || condicoesPagamento.entradaValor === undefined || condicoesPagamento.entradaValor === '') {
    return 'Sob consulta'
  }
  if (condicoesPagamento.entradaTipo === 'PERCENTUAL') {
    return `${String(condicoesPagamento.entradaValor).replace('.', ',')}%`
  }
  return formatCurrency(condicoesPagamento.entradaValor)
}

function formatDisplayValue(unidade) {
  if (!unidade) return '—'
  if (unidade.tipoValor === 'RESERVADO') return 'RESERVADO'
  return formatCurrency(unidade.valor)
}

function formatArea(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'Sob consulta'
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numeric)} m²`
}

function formatDate(value) {
  if (!value) return 'Sob consulta'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'Sob consulta'
  const formatted = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(parsed)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function formatDateShort(value) {
  if (!value) return 'Sob consulta'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'Sob consulta'
  const formatted = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(parsed)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function formatAddress(localizacao) {
  if (!localizacao) return 'Endereço da obra sob consulta'
  return [
    [localizacao.logradouro, localizacao.numero].filter(Boolean).join(', '),
    localizacao.complemento,
    localizacao.bairro,
    [localizacao.cidade, localizacao.estado].filter(Boolean).join(' - ')
  ].filter(Boolean).join(', ')
}

function formatPavimentoLabel(value) {
  const raw = String(value || '').trim()
  const digits = raw.match(/\d+/)?.[0]
  if (!digits) return raw || '—'
  return raw.includes('*') ? `${digits}*` : digits
}

function formatSuitesVagas(tipo) {
  const suites = String(tipo.quantidadeSuites ?? 0).padStart(2, '0')
  const vagas = String(tipo.quantidadeVagas ?? 0).padStart(2, '0')
  return `${suites} suítes | ${vagas} vagas`
}

function extractSortNumber(value) {
  const digits = String(value || '').match(/\d+/)?.[0]
  return digits ? Number(digits) : Number.NEGATIVE_INFINITY
}

const STANDARD_RIGHT_COLUMN_WIDTH = 450

export default function PublicTabelaVendasPage() {
  const { publicToken } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const tabelaConfig = data?.tabelaConfig || null

  useEffect(() => {
    if (!publicToken) return
    hubService.publicMateriais(publicToken)
      .then(setData)
      .catch((e) => setError(e.message || 'Link inválido'))
  }, [publicToken])

  const tipos = data?.tipos || []
  const theme = useMemo(() => {
    const tema = tabelaConfig?.tema || 'CLASSICO'
    const defaults = tema === 'EXECUTIVO'
      ? { accent: '#1f3b5b', accentDark: '#152b42', soft: '#dbe5f0', text: '#1f2937', muted: '#667085', bg: '#ece8df', zebra: '#eef3f8', iconBg: '#eef4fa' }
      : tema === 'CONTEMPORANEO'
        ? { accent: '#8d5b34', accentDark: '#6f4728', soft: '#ecd9c9', text: '#33261d', muted: '#7b6859', bg: '#f7f1ea', zebra: '#f8efe6', iconBg: '#f3e8dc' }
        : { accent: '#c7a24b', accentDark: '#9b7a30', soft: '#d8c69a', text: '#1d1d1b', muted: '#6f6758', bg: '#f4f0e7', zebra: '#f6f1e4', iconBg: '#f1f1ee' }

    return {
      accent: tabelaConfig?.corPrimaria || defaults.accent,
      accentDark: defaults.accentDark,
      soft: tabelaConfig?.corSecundaria || defaults.soft,
      text: tabelaConfig?.corTexto || defaults.text,
      muted: defaults.muted,
      bg: tabelaConfig?.corFundo || defaults.bg,
      zebra: defaults.zebra,
      iconBg: defaults.iconBg
    }
  }, [tabelaConfig])
  const unidades = useMemo(() => {
    const codes = new Set()
    tipos.forEach((tipo) => {
      ;(tipo.unidades || []).forEach((unidade) => {
        if (unidade.codigoUnidade) codes.add(unidade.codigoUnidade)
      })
    })
    return Array.from(codes).sort((a, b) => extractSortNumber(b) - extractSortNumber(a) || String(b).localeCompare(String(a)))
  }, [tipos])
  const rightColumnWidth = STANDARD_RIGHT_COLUMN_WIDTH
  const imageHeight = Math.max(40, Math.min(85, Number(tabelaConfig?.alturaImagemPercentual) || 70))
  const lowerHeight = 100 - imageHeight
  const bottomSplit = Math.max(25, Math.min(75, Number(tabelaConfig?.divisaoInferiorPercentual) || 50))

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: theme.bg }}>
        <div className="max-w-xl w-full text-center rounded-[2rem] border bg-white p-10 shadow-soft" style={{ borderColor: theme.soft }}>
          <h1 className="mb-2 text-3xl font-bold" style={{ color: theme.text }}>Tabela indisponível</h1>
          <p className="text-lg" style={{ color: theme.muted }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <p className="text-xl" style={{ color: theme.muted }}>Carregando tabela de vendas...</p>
      </div>
    )
  }

  function handleGeneratePdf() {
    window.print()
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-6 md:py-8" style={{ background: theme.bg }}>
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm;
          }

          html, body {
            background: #f4f0e7 !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .sales-sheet, .sales-sheet * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .sales-sheet {
            position: absolute;
            inset: 0;
            width: 100%;
            max-width: none;
            margin: 0 !important;
            padding: 0 !important;
          }

          .sales-actions {
            display: none !important;
          }

          .sales-main-grid {
            gap: 8mm !important;
            grid-template-columns: minmax(0, 2.28fr) ${STANDARD_RIGHT_COLUMN_WIDTH}px !important;
            align-items: stretch !important;
          }

          .sales-table-shell {
            overflow: visible !important;
          }

          .sales-table {
            font-size: 9px !important;
            width: 100% !important;
          }

          .sales-table th,
          .sales-table td {
            padding: 5px 6px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .sales-sheet {
            zoom: 1 !important;
          }
        }
      `}</style>

      <main className="sales-sheet mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1770px] flex-col">
        <div className="sales-actions mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGeneratePdf}
              className="inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-soft"
              style={{ background: theme.accent }}
            >
              Gerar PDF
            </button>
            <Link
              to={`/materiais-publicos/${publicToken}`}
              className="inline-flex items-center rounded-full border bg-white px-5 py-3 text-sm font-semibold"
              style={{ borderColor: theme.accent, color: theme.text }}
            >
              Ver apresentação do empreendimento
            </Link>
          </div>
          <p className="text-sm uppercase tracking-[0.18em]" style={{ color: theme.muted }}>
            Tabela pública atualizada com os dados cadastrados no sistema
          </p>
        </div>

        <section
          className="sales-main-grid grid items-stretch gap-5 lg:grid-cols-[minmax(0,2.28fr)_450px]"
          style={{ minHeight: 'calc(100vh - 12.5rem)' }}
        >
          <div className="min-w-0 overflow-hidden rounded-[1.9rem] border bg-white shadow-[0_18px_40px_rgba(69,59,40,0.12)]" style={{ borderColor: `${theme.text}30`, minHeight: '100%' }}>
            <div className="grid grid-cols-[0.78fr_1.38fr_0.9fr] gap-4 px-6 py-5 text-white" style={{ background: theme.accent }}>
              <div className="text-sm leading-6">
                <p><span className="font-semibold">Referência:</span> {data.dataReferenciaTabelaVendas ? formatDateShort(data.dataReferenciaTabelaVendas) : 'Sob consulta'}</p>
                <p><span className="font-semibold">Início:</span> {formatDateShort(data.dataInicioObra)}</p>
                <p><span className="font-semibold">Entrega:</span> {formatDateShort(data.dataEntrega)}</p>
                {(tabelaConfig?.exibirEndereco ?? true) && (
                  <p className="mt-2 text-[11px] leading-5 text-white/85">{formatAddress(data.localizacao)}</p>
                )}
              </div>
              <div className="flex items-start justify-center gap-3 text-center lg:text-left">
                <div className="text-left">
                  <p className="text-[2.15rem] font-semibold leading-none tracking-tight">CUB</p>
                  <p className="text-[2.15rem] font-light leading-none tracking-tight">SC</p>
                </div>
                <div className="h-14 w-px bg-white/45" />
                <div className="text-left uppercase leading-none">
                  <p className="text-[2rem] font-semibold tracking-tight">Tabela</p>
                  <p className="text-[2rem] font-light tracking-tight">de Preços</p>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between text-right">
                <p className="text-sm uppercase tracking-[0.22em] text-white/75">Empreendimento</p>
                <p className="text-2xl font-semibold leading-tight">{data.empreendimentoNome}</p>
              </div>
            </div>

            <div className="sales-table-shell overflow-x-auto">
              <table className="sales-table w-full border-collapse text-center text-[12px]" style={{ color: theme.text }}>
                <thead>
                  <tr className="bg-black text-white">
                    <th className="w-[70px] border border-black/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]">Pav.</th>
                    {tipos.map((tipo, index) => (
                      <th key={`${tipo.titulo}-${index}`} className="border border-black/70 px-2 py-2">
                        <p className="text-[13px] font-semibold uppercase tracking-[0.08em]">{tipo.titulo || `Tipo ${index + 1}`}</p>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-black text-white">
                    <th className="border border-black/70 px-3 py-2" />
                    {tipos.map((tipo, index) => (
                      <th key={`${tipo.titulo}-${index}-area`} className="border border-black/70 px-2 py-2 text-[12px] font-semibold">
                        {formatArea(tipo.areaMetragem)}
                      </th>
                    ))}
                  </tr>
                  <tr style={{ background: '#fff', color: theme.text }}>
                    <th className="border border-[#665e4e]/55 px-3 py-2" />
                    {tipos.map((tipo, index) => (
                      <th key={`${tipo.titulo}-${index}-meta`} className="border border-[#665e4e]/55 px-2 py-2 text-[12px] font-semibold uppercase tracking-[0.06em]">
                        {formatSuitesVagas(tipo)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unidades.length === 0 && (
                    <tr>
                      <td colSpan={Math.max(2, tipos.length + 1)} className="border px-5 py-8 text-center" style={{ borderColor: `${theme.text}55`, color: theme.muted }}>
                        Nenhum pavimento cadastrado para este empreendimento.
                      </td>
                    </tr>
                  )}
                  {unidades.map((codigoUnidade, rowIndex) => (
                    <tr key={codigoUnidade} style={{ background: rowIndex % 2 === 0 ? '#fff' : theme.zebra }}>
                      <td className="border px-3 py-1.5 font-medium" style={{ borderColor: `${theme.text}55` }}>{formatPavimentoLabel(codigoUnidade)}</td>
                      {tipos.map((tipo, tipoIndex) => {
                        const unidade = (tipo.unidades || []).find((item) => item.codigoUnidade === codigoUnidade)
                        const displayValue = formatDisplayValue(unidade)
                        const reserved = displayValue === 'RESERVADO'
                        return (
                          <td
                            key={`${tipo.titulo}-${tipoIndex}-${codigoUnidade}`}
                            className={`border px-2 py-1.5 font-medium ${reserved ? 'font-semibold uppercase' : ''}`}
                            style={{
                              borderColor: `${theme.text}55`,
                              background: reserved ? theme.soft : undefined,
                              color: theme.text
                            }}
                          >
                            {displayValue}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: theme.accent, color: '#fff' }}>
                    <td className="border px-3 py-2 text-left text-[12px] font-semibold" style={{ borderColor: theme.accentDark }} colSpan={Math.max(1, Math.floor((tipos.length + 1) / 3))}>
                      * Unidades especiais
                    </td>
                    <td className="border px-3 py-2 text-center text-[1.1rem] font-semibold" style={{ borderColor: theme.accentDark }} colSpan={Math.max(1, Math.ceil((tipos.length + 1) / 3))}>
                      {data.empreendimentoNome}
                    </td>
                    <td className="border px-3 py-2 text-right text-[12px] font-semibold" style={{ borderColor: theme.accentDark }} colSpan={Math.max(1, tipos.length + 1 - Math.max(1, Math.floor((tipos.length + 1) / 3)) - Math.max(1, Math.ceil((tipos.length + 1) / 3)))}>
                      Correção CUB SC
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <aside className="min-w-0 max-w-full self-stretch overflow-hidden rounded-[1.8rem] border bg-white shadow-[0_18px_40px_rgba(69,59,40,0.12)]" style={{ borderColor: `${theme.text}35`, minHeight: '100%' }}>
            <div className="grid h-full min-h-full" style={{ gridTemplateRows: `${imageHeight}% ${lowerHeight}%` }}>
            <div className="relative h-full overflow-hidden rounded-[1.35rem] m-3 mb-0 shadow-[0_10px_24px_rgba(26,26,26,0.16)]" style={{ background: theme.accentDark }}>
              {data.fotoPerfilUrl ? (
                <img
                  src={data.fotoPerfilUrl}
                  alt={data.empreendimentoNome}
                  className="h-full min-h-[220px] w-full object-cover"
                />
              ) : (
                <div className="grid h-full min-h-[220px] place-items-center text-lg text-white/80" style={{ background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentDark} 100%)` }}>
                  Sem imagem de capa
                </div>
              )}
            </div>

            <div
              className={`mx-3 mt-0 grid h-full min-h-0 overflow-hidden rounded-[1.2rem] border shadow-[0_10px_24px_rgba(26,26,26,0.12)] ${(tabelaConfig?.exibirIcone ?? true) ? 'grid-cols-2' : 'grid-cols-1'}`}
              style={{
                borderColor: theme.soft,
                gridTemplateColumns: (tabelaConfig?.exibirIcone ?? true) ? `${bottomSplit}% ${100 - bottomSplit}%` : '1fr'
              }}
            >
              {(tabelaConfig?.exibirIcone ?? true) && (
                <div className="flex items-center justify-center overflow-hidden border-r px-4 py-4" style={{ borderColor: theme.soft, background: theme.iconBg }}>
                  {data.iconeUrl ? (
                  <div className="flex h-full w-full items-center justify-center overflow-hidden">
                    <img
                      src={data.iconeUrl}
                      alt="Ícone institucional"
                      className="h-full w-full scale-[1.45] object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-center text-xs uppercase tracking-[0.16em] text-[#8a7f68]">
                    Ícone institucional
                  </div>
                )}
                </div>
              )}

              <div className="overflow-hidden" style={{ background: tabelaConfig?.pagamentoEmDestaque === false ? theme.soft : theme.accent, color: tabelaConfig?.pagamentoEmDestaque === false ? theme.text : '#fff' }}>
                <div className="flex h-full flex-col justify-center px-4 py-4 text-center text-white" style={{ color: tabelaConfig?.pagamentoEmDestaque === false ? theme.text : '#fff' }}>
                  <div>
                  <p className="text-[13px] uppercase tracking-[0.15em]" style={{ color: tabelaConfig?.pagamentoEmDestaque === false ? theme.text : 'rgba(255,255,255,0.8)' }}>Formas de</p>
                  <p className="pb-[5px] text-[1.405rem] font-semibold uppercase leading-[1.15]">Pagamento</p>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[0.965rem] font-semibold leading-4">{formatEntrada(data.condicoesPagamento)} de entrada</p>
                    <p className="text-[0.965rem] font-semibold leading-4">Saldo em {data.condicoesPagamento?.saldo || 'sob consulta'}</p>
                    <p className="text-[0.965rem] font-semibold leading-4">{data.condicoesPagamento?.reforcos || 'Sob consulta'} reforços</p>
                    <p className="pt-1 text-[12px] italic leading-4" style={{ color: tabelaConfig?.pagamentoEmDestaque === false ? theme.text : 'rgba(255,255,255,0.85)' }}>Correção CUB SC</p>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </aside>
        </section>
        <p className="mt-4 text-center text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
          {tabelaConfig?.textoRodape || 'Valores sujeitos a reajuste mensal conforme índice CUB/SC. Materiais e condições conforme cadastro vigente.'}
        </p>
      </main>
    </div>
  )
}
