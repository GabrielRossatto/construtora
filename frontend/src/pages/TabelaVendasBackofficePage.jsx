import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'
import { useToast } from '../hooks/useToast'

const TEMA_OPTIONS = [
  { value: 'CLASSICO', label: 'Clássico' },
  { value: 'EXECUTIVO', label: 'Executivo' },
  { value: 'CONTEMPORANEO', label: 'Contemporâneo' }
]

const EMPTY_FORM = {
  tema: 'CLASSICO',
  corPrimaria: '',
  corSecundaria: '',
  corTexto: '',
  corFundo: '',
  textoRodape: '',
  exibirEndereco: true,
  exibirIcone: true,
  pagamentoEmDestaque: true,
  larguraColunaLateralPx: 450,
  alturaImagemPercentual: 70,
  divisaoInferiorPercentual: 50
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function PreviewCard({ form, expanded = false }) {
  const theme = useMemo(() => {
    const defaults = form.tema === 'EXECUTIVO'
      ? { accent: '#1f3b5b', secondary: '#dbe5f0', text: '#1f2937', bg: '#ece8df' }
      : form.tema === 'CONTEMPORANEO'
        ? { accent: '#8d5b34', secondary: '#ecd9c9', text: '#33261d', bg: '#f7f1ea' }
        : { accent: '#c7a24b', secondary: '#d8c69a', text: '#1d1d1b', bg: '#f4f0e7' }

    return {
      accent: form.corPrimaria || defaults.accent,
      secondary: form.corSecundaria || defaults.secondary,
      text: form.corTexto || defaults.text,
      bg: form.corFundo || defaults.bg
    }
  }, [form])
  const imageHeight = Math.max(40, Math.min(85, Number(form.alturaImagemPercentual) || 70))
  const lowerHeight = 100 - imageHeight
  const bottomSplit = Math.max(25, Math.min(75, Number(form.divisaoInferiorPercentual) || 50))
  const rightColumnWidth = Math.max(320, Math.min(700, Number(form.larguraColunaLateralPx) || 450))

  return (
    <div className={`h-full rounded-[2rem] border border-white/12 shadow-xl ${expanded ? 'p-7' : 'p-5'}`} style={{ background: theme.bg, color: theme.text }}>
      <div className={`rounded-[1.4rem] text-white ${expanded ? 'px-7 py-5' : 'px-5 py-4'}`} style={{ background: theme.accent }}>
        <p className="text-xs uppercase tracking-[0.18em] text-white/75">Preview</p>
        <p className={`mt-2 font-semibold ${expanded ? 'text-3xl' : 'text-2xl'}`}>Tabela de Preços</p>
      </div>
      <div className={`mt-4 grid gap-4 ${expanded ? 'min-h-[62vh]' : ''}`} style={{ gridTemplateColumns: `minmax(0, 1fr) ${Math.round(rightColumnWidth * (expanded ? 0.72 : 0.45))}px` }}>
        <div className="overflow-hidden rounded-[1.2rem] border bg-white" style={{ borderColor: `${theme.text}20` }}>
          <div className={`grid grid-cols-3 text-center font-semibold uppercase text-white ${expanded ? 'text-sm' : 'text-xs'}`} style={{ background: theme.accent }}>
            <div className={`${expanded ? 'px-4 py-3' : 'px-3 py-2'}`}>Pav.</div>
            <div className={`${expanded ? 'px-4 py-3' : 'px-3 py-2'}`}>Tipo 1</div>
            <div className={`${expanded ? 'px-4 py-3' : 'px-3 py-2'}`}>Tipo 2</div>
          </div>
          <div className={`grid grid-cols-3 text-center ${expanded ? 'text-base' : 'text-sm'}`}>
            <div className={`border-r ${expanded ? 'px-4 py-4' : 'px-3 py-3'}`} style={{ borderColor: `${theme.text}15` }}>12</div>
            <div className={`border-r ${expanded ? 'px-4 py-4' : 'px-3 py-3'}`} style={{ borderColor: `${theme.text}15` }}>R$ 890.000,00</div>
            <div className={`${expanded ? 'px-4 py-4' : 'px-3 py-3'}`}>R$ 990.000,00</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-[1.2rem] border bg-white" style={{ borderColor: theme.secondary }}>
          <div className="grid h-full" style={{ gridTemplateRows: `${imageHeight}% ${lowerHeight}%` }}>
            <div className="m-2 mb-0 rounded-[1rem] shadow-[0_8px_20px_rgba(26,26,26,0.12)]" style={{ background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.secondary} 100%)` }} />
            <div className="m-2 mt-0 min-h-0 overflow-hidden rounded-[1rem]">
              <div
                className={`grid h-full min-h-0 overflow-hidden rounded-[1rem] border shadow-[0_8px_20px_rgba(26,26,26,0.08)] ${form.exibirIcone ? '' : 'grid-cols-1'}`}
                style={{
                  borderColor: theme.secondary,
                  gridTemplateColumns: form.exibirIcone ? `${bottomSplit}% ${100 - bottomSplit}%` : '1fr'
                }}
              >
                {form.exibirIcone && (
                  <div className={`grid place-items-center border-r uppercase tracking-[0.18em] ${expanded ? 'text-sm' : 'text-xs'}`} style={{ borderColor: theme.secondary, background: '#f1f1ee' }}>
                    Ícone
                  </div>
                )}
                <div className={`h-full w-full text-center ${expanded ? 'px-6 py-6' : 'px-4 py-4'}`} style={{ background: form.pagamentoEmDestaque ? theme.accent : theme.secondary, color: form.pagamentoEmDestaque ? '#fff' : theme.text }}>
                  <p className={`${expanded ? 'text-sm' : 'text-xs'} uppercase tracking-[0.18em]`}>Pagamento</p>
                  <p className={`mt-2 font-semibold ${expanded ? 'text-base' : 'text-sm'}`}>Condição comercial</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className={`mt-4 uppercase tracking-[0.14em] ${expanded ? 'text-sm' : 'text-xs'}`}>
        {form.textoRodape || 'Valores sujeitos a reajuste mensal conforme índice CUB/SC.'}
      </p>
    </div>
  )
}

export default function TabelaVendasBackofficePage() {
  const { token } = useAuth()
  const toast = useToast()
  const [empresas, setEmpresas] = useState([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadEmpresas() {
      try {
        const response = await hubService.internalTabelaVendasEmpresas(token)
        setEmpresas(response || [])
        if ((response || []).length > 0) {
          setSelectedEmpresaId(String(response[0].id))
        }
      } catch (error) {
        toast.error(error.message || 'Não foi possível carregar as empresas.')
      } finally {
        setLoading(false)
      }
    }
    loadEmpresas()
  }, [token])

  useEffect(() => {
    async function loadConfig() {
      if (!selectedEmpresaId) return
      try {
        const config = await hubService.internalTabelaVendasConfig(token, selectedEmpresaId)
        setForm({
          tema: config.tema || 'CLASSICO',
          corPrimaria: config.corPrimaria || '',
          corSecundaria: config.corSecundaria || '',
          corTexto: config.corTexto || '',
          corFundo: config.corFundo || '',
          textoRodape: config.textoRodape || '',
          exibirEndereco: Boolean(config.exibirEndereco),
          exibirIcone: Boolean(config.exibirIcone),
          pagamentoEmDestaque: Boolean(config.pagamentoEmDestaque),
          larguraColunaLateralPx: Number(config.larguraColunaLateralPx) || 450,
          alturaImagemPercentual: Number(config.alturaImagemPercentual) || 70,
          divisaoInferiorPercentual: Number(config.divisaoInferiorPercentual) || 50
        })
      } catch (error) {
        toast.error(error.message || 'Não foi possível carregar a configuração.')
      }
    }
    loadConfig()
  }, [selectedEmpresaId, token])

  const empresaSelecionada = empresas.find((item) => String(item.id) === selectedEmpresaId)

  async function handleSave() {
    if (!selectedEmpresaId || saving) return
    try {
      setSaving(true)
      await hubService.salvarInternalTabelaVendasConfig(token, selectedEmpresaId, form)
      toast.success('Configuração publicada para a empresa selecionada.')
    } catch (error) {
      toast.error(error.message || 'Não foi possível salvar a configuração.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="Backoffice da Tabela de Vendas">
      {loading ? (
        <section className="rounded-3xl border border-white/15 bg-[#2b2b2b] p-8 text-white/70">Carregando...</section>
      ) : (
        <section className="grid grid-cols-1 gap-6">
          <div className="rounded-[2rem] border border-white/15 bg-[#2b2b2b] p-8 text-white">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/60">Preview em largura total</p>
                <p className="mt-2 text-sm text-white/72">A lâmina ocupa toda a área útil para facilitar proporção de imagem, ícone e pagamento.</p>
              </div>
              {empresaSelecionada?.publicToken && (
                <a href={`/tabela-vendas-publica/${empresaSelecionada.publicToken}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/16 px-5 py-3 text-base font-semibold text-white">
                  Abrir tabela pública
                </a>
              )}
            </div>
            <PreviewCard form={form} expanded />
          </div>

          <div className="rounded-[2rem] border border-white/15 bg-[#2b2b2b] p-8 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Controles da empresa</p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Empresa</span>
                <select className="input-hub w-full rounded-2xl p-3 text-lg" value={selectedEmpresaId} onChange={(e) => setSelectedEmpresaId(e.target.value)}>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nome} ({empresa.cnpj})</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Tema base</span>
                <select className="input-hub w-full rounded-2xl p-3 text-lg" value={form.tema} onChange={(e) => setForm((current) => ({ ...current, tema: e.target.value }))}>
                  {TEMA_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Cor primária</span>
                <input className="input-hub w-full rounded-2xl p-3 text-lg" value={form.corPrimaria} onChange={(e) => setForm((current) => ({ ...current, corPrimaria: e.target.value }))} placeholder="#C7A24B" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Cor secundária</span>
                <input className="input-hub w-full rounded-2xl p-3 text-lg" value={form.corSecundaria} onChange={(e) => setForm((current) => ({ ...current, corSecundaria: e.target.value }))} placeholder="#D8C69A" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Cor de texto</span>
                <input className="input-hub w-full rounded-2xl p-3 text-lg" value={form.corTexto} onChange={(e) => setForm((current) => ({ ...current, corTexto: e.target.value }))} placeholder="#1D1D1B" />
              </label>

              <label className="block md:col-span-2 xl:col-span-1">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Cor de fundo</span>
                <input className="input-hub w-full rounded-2xl p-3 text-lg" value={form.corFundo} onChange={(e) => setForm((current) => ({ ...current, corFundo: e.target.value }))} placeholder="#F4F0E7" />
              </label>

              <label className="block md:col-span-2 xl:col-span-2">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Texto de rodapé</span>
                <input className="input-hub w-full rounded-2xl p-3 text-lg" value={form.textoRodape} onChange={(e) => setForm((current) => ({ ...current, textoRodape: e.target.value }))} placeholder="Valores sujeitos a reajuste mensal conforme índice CUB/SC." />
              </label>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block rounded-2xl border border-white/12 bg-white/6 p-4">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Largura da coluna lateral</span>
                <input
                  type="range"
                  min="320"
                  max="700"
                  value={form.larguraColunaLateralPx}
                  onChange={(e) => setForm((current) => ({ ...current, larguraColunaLateralPx: Number(e.target.value) }))}
                  className="w-full"
                />
                <p className="mt-2 text-sm text-white/85">{form.larguraColunaLateralPx}px</p>
              </label>

              <label className="block rounded-2xl border border-white/12 bg-white/6 p-4">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Altura da imagem</span>
                <input
                  type="range"
                  min="40"
                  max="85"
                  value={form.alturaImagemPercentual}
                  onChange={(e) => setForm((current) => ({ ...current, alturaImagemPercentual: Number(e.target.value) }))}
                  className="w-full"
                />
                <p className="mt-2 text-sm text-white/85">{form.alturaImagemPercentual}% da coluna</p>
              </label>

              <label className="block rounded-2xl border border-white/12 bg-white/6 p-4">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Divisão ícone/pagamento</span>
                <input
                  type="range"
                  min="25"
                  max="75"
                  value={form.divisaoInferiorPercentual}
                  onChange={(e) => setForm((current) => ({ ...current, divisaoInferiorPercentual: Number(e.target.value) }))}
                  className="w-full"
                />
                <p className="mt-2 text-sm text-white/85">{form.divisaoInferiorPercentual}% para o ícone</p>
              </label>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                ['exibirEndereco', 'Mostrar endereço'],
                ['exibirIcone', 'Mostrar ícone'],
                ['pagamentoEmDestaque', 'Pagamento em destaque']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3">
                  <input type="checkbox" checked={form[key]} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.checked }))} />
                  <span className="text-sm font-semibold text-white/85">{label}</span>
                </label>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={handleSave} disabled={!selectedEmpresaId || saving} className="rounded-2xl bg-white px-5 py-3 text-base font-semibold text-black">
                {saving ? 'Salvando...' : 'Publicar configuração'}
              </button>
            </div>
          </div>
        </section>
      )}
    </AppLayout>
  )
}
