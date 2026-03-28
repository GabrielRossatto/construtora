import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
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

function formatAddress(localizacao) {
  if (!localizacao) return 'Endereço da obra sob consulta'
  return [
    [localizacao.logradouro, localizacao.numero].filter(Boolean).join(', '),
    localizacao.complemento,
    localizacao.bairro,
    [localizacao.cidade, localizacao.estado].filter(Boolean).join(' - ')
  ].filter(Boolean).join(' • ')
}

function formatPavimentoLabel(value) {
  const digits = String(value || '').match(/\d+/)?.[0]
  if (!digits) return value || '—'
  return `${digits}º`
}

export default function PublicTabelaVendasPage() {
  const { publicToken } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!publicToken) return
    hubService.publicMateriais(publicToken)
      .then(setData)
      .catch((e) => setError(e.message || 'Link inválido'))
  }, [publicToken])

  const tipos = data?.tipos || []
  const unidades = useMemo(() => {
    const codes = new Set()
    tipos.forEach((tipo) => {
      ;(tipo.unidades || []).forEach((unidade) => {
        if (unidade.codigoUnidade) codes.add(unidade.codigoUnidade)
      })
    })
    return Array.from(codes)
  }, [tipos])

  if (error) {
    return (
      <div className="min-h-screen bg-pageSurface flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center rounded-[2rem] p-10 bg-white shadow-soft border border-slate-200">
          <h1 className="text-3xl font-bold mb-2 text-slate-900">Tabela indisponível</h1>
          <p className="text-lg text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-pageSurface flex items-center justify-center">
        <p className="text-xl text-slate-700">Carregando tabela de vendas...</p>
      </div>
    )
  }

  function handleGeneratePdf() {
    window.print()
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f1f5f9_50%,#e2e8f0_100%)]">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }

          html, body {
            background: #ffffff !important;
            height: auto !important;
          }

          body * {
            visibility: hidden;
          }

          .sales-print-root, .sales-print-root * {
            visibility: visible;
          }

          .sales-print-root {
            position: absolute;
            inset: 0;
            width: 100%;
            max-width: none;
            padding: 0 !important;
            margin: 0 !important;
          }

          .sales-print-hero {
            break-after: page;
            box-shadow: none !important;
            border-color: #cbd5e1 !important;
            min-height: auto !important;
            height: auto !important;
            margin-bottom: 0 !important;
          }

          .sales-print-table {
            box-shadow: none !important;
            border-color: #cbd5e1 !important;
            margin-top: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: hidden !important;
            transform: scale(1.03);
            transform-origin: top center;
            page-break-before: auto !important;
          }

          .sales-print-table table {
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 10px;
            border: 1px solid #cbd5e1 !important;
          }

          .sales-print-table th,
          .sales-print-table td {
            padding: 6px 7px !important;
            line-height: 1.2 !important;
            border-color: #cbd5e1 !important;
          }

          .sales-print-table th p,
          .sales-print-table td p {
            line-height: 1.1 !important;
          }

          .sales-print-table th .text-lg {
            font-size: 11px !important;
          }

          .sales-print-table thead th {
            font-size: 7px !important;
            letter-spacing: 0.06em !important;
          }

          .sales-print-table thead th .text-sm {
            font-size: 10.5px !important;
            line-height: 1.15 !important;
          }

          .sales-print-table tbody td {
            font-size: 12px !important;
            font-weight: 600 !important;
          }

          .sales-print-table thead tr {
            background: #e5e7eb !important;
          }

          .sales-print-table tbody tr:nth-child(even) {
            background: #f8fafc !important;
          }

          .sales-print-table .overflow-x-auto {
            overflow: visible !important;
          }

          .sales-print-table tbody {
            break-inside: avoid !important;
          }

          .sales-print-table tr,
          .sales-print-table td,
          .sales-print-table th {
            break-inside: avoid !important;
          }
        }
      `}</style>
      <main className="sales-print-root w-full max-w-none mx-auto px-4 py-6 md:px-6 md:py-10">
        <section className="sales-print-hero rounded-[2rem] overflow-hidden border border-slate-200 bg-white/85 shadow-soft">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
            <div className="bg-slate-100 min-h-[320px]">
              {data.fotoPerfilUrl ? (
                <img src={data.fotoPerfilUrl} alt={data.empreendimentoNome} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full min-h-[320px] grid place-items-center text-slate-500">Sem imagem de capa</div>
              )}
            </div>
            <div className="p-8 md:p-10">
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-hubBlueDeep">Tabela de vendas</p>
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  className="print:hidden inline-flex items-center rounded-full bg-hubBlueDeep px-4 py-2 text-sm font-semibold text-white shadow-soft"
                >
                  Gerar PDF
                </button>
              </div>
              <h1 className="mt-3 text-4xl md:text-5xl font-semibold text-slate-950">{data.empreendimentoNome}</h1>
              <p className="mt-4 text-base md:text-lg leading-8 text-slate-600">
                Valores da tabela de vendas referente ao mês correspondente.
              </p>
              <p className="mt-5 max-w-[34rem] text-xs uppercase tracking-[0.08em] leading-5 text-slate-500">
                {formatAddress(data.localizacao)}
              </p>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mês de referência</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(data.dataReferenciaTabelaVendas)}</p>
                </div>
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Início da obra</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(data.dataInicioObra)}</p>
                </div>
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Entrega prevista</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(data.dataEntrega)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Entrada</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatEntrada(data.condicoesPagamento)}</p>
                </div>
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Saldo</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{data.condicoesPagamento?.saldo || 'Sob consulta'}</p>
                </div>
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reforços</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{data.condicoesPagamento?.reforcos || 'Sob consulta'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sales-print-table mt-6 rounded-[2rem] border border-slate-200 bg-white/85 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-slate-100 text-center">
                  <th className="px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 align-middle">Pavimento</th>
                  {tipos.map((tipo) => (
                    <th key={tipo.titulo} className="px-4 py-4 border-l border-slate-200 align-middle text-center">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-slate-950">{tipo.titulo}</p>
                        <p className="text-sm text-slate-600">Área: {formatArea(tipo.areaMetragem)}</p>
                        <p className="text-sm text-slate-600">Suítes: {tipo.quantidadeSuites ?? 0}</p>
                        <p className="text-sm text-slate-600">Vagas: {tipo.quantidadeVagas ?? 0}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unidades.length === 0 && (
                  <tr>
                    <td colSpan={Math.max(2, tipos.length + 1)} className="px-5 py-8 text-center text-slate-500">
                      Nenhum pavimento cadastrado para este empreendimento.
                    </td>
                  </tr>
                )}
                {unidades.map((codigoUnidade) => (
                  <tr key={codigoUnidade} className="border-t border-slate-200">
                    <td className="px-5 py-4 font-semibold text-slate-900 bg-white text-center align-middle">{formatPavimentoLabel(codigoUnidade)}</td>
                    {tipos.map((tipo) => {
                      const unidade = (tipo.unidades || []).find((item) => item.codigoUnidade === codigoUnidade)
                      return (
                        <td key={`${tipo.titulo}-${codigoUnidade}`} className="px-5 py-4 border-l border-slate-200 text-slate-700 text-center align-middle">
                          {formatDisplayValue(unidade)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
