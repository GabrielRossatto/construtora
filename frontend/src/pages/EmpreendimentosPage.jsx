import { useEffect, useRef, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'
import semImagemEmpreendimento from '../assets/sem-imagem-empreendimento.svg'

const MAX_MULTIPART_SIZE_BYTES = 20 * 1024 * 1024
const FOTO_MAX_DIMENSION = 1600
const FOTO_QUALITY = 0.82
const ESTADOS_BR = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

function createTipo(index) {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    areaMetragem: '',
    quantidadeSuites: '',
    quantidadeVagas: '',
    unidades: [createUnidade(index, 1)]
  }
}

function createUnidade(tipoIndex, unidadeIndex) {
  return {
    id: `${Date.now()}-${tipoIndex}-${unidadeIndex}-${Math.random().toString(36).slice(2, 7)}`,
    codigoUnidade: '',
    tipoValor: 'VALOR',
    valor: ''
  }
}

function formatCurrencyInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const numeric = Number(digits) / 100
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric)
}

function parseCurrencyInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return (Number(digits) / 100).toFixed(2)
}

function formatDecimalInput(value, decimalPlaces = 2) {
  const normalized = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '')
  const [integerPart = '', ...decimalParts] = normalized.split('.')
  if (decimalParts.length === 0) return integerPart
  return `${integerPart}.${decimalParts.join('').slice(0, decimalPlaces)}`
}

function createEditPayload(item) {
  return {
    nome: item.nome || '',
    descricao: item.descricao || '',
    fotoPerfilUrl: item.fotoPerfilUrl || '',
    localizacao: {
      cep: item.localizacao?.cep || '',
      logradouro: item.localizacao?.logradouro || '',
      numero: item.localizacao?.numero || '',
      complemento: item.localizacao?.complemento || '',
      bairro: item.localizacao?.bairro || '',
      cidade: item.localizacao?.cidade || '',
      estado: item.localizacao?.estado || 'SP'
    },
    tipos: item.tipos?.length
      ? item.tipos.map((tipo, index) => ({
        id: `${item.id}-${index}`,
        areaMetragem: tipo.areaMetragem ?? '',
        quantidadeSuites: tipo.quantidadeSuites ?? '',
        quantidadeVagas: tipo.quantidadeVagas ?? '',
        unidades: tipo.unidades?.length
          ? tipo.unidades.map((unidade, unidadeIndex) => ({
            id: `${item.id}-${index}-${unidadeIndex}`,
            codigoUnidade: unidade.codigoUnidade ?? '',
            tipoValor: unidade.tipoValor ?? 'VALOR',
            valor: unidade.valor ?? ''
          }))
          : [createUnidade(index + 1, 1)]
      }))
      : [createTipo(1)],
    metragemLazer: item.metragemLazer ?? '',
    descricaoLazer: item.descricaoLazer || '',
    percentualObra: item.percentualObra ?? 0,
    condicoesPagamento: {
      entradaTipo: item.condicoesPagamento?.entradaTipo || 'PERCENTUAL',
      entradaValor: item.condicoesPagamento?.entradaValor ?? '',
      saldo: item.condicoesPagamento?.saldo || '',
      reforcos: item.condicoesPagamento?.reforcos || ''
    },
    dataInicioObra: item.dataInicioObra ? `${item.dataInicioObra.slice(5, 7)}/${item.dataInicioObra.slice(0, 4)}` : '',
    dataEntrega: item.dataEntrega ? `${item.dataEntrega.slice(5, 7)}/${item.dataEntrega.slice(0, 4)}` : ''
  }
}

function createMaterialEditPayload(material) {
  return {
    id: material.id,
    titulo: material.titulo || '',
    tipoArquivo: material.tipoArquivo || 'PDF',
    pastaDestino: material.pastaDestino || '',
    caminhoRelativo: material.caminhoRelativo || '',
    descricao: material.descricao || ''
  }
}

function normalizeNullableDate(value) {
  return value ? value : null
}

function formatMonthYearInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function normalizeMonthYearForApi(value) {
  if (!value) return null
  if (/^\d{2}\/\d{4}$/.test(value)) {
    const [month, year] = value.split('/')
    return `${year}-${month}-01`
  }
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value
}

function sanitizeEmpreendimentoPayload(payload) {
  if (!payload.nome.trim()) {
    throw new Error('Preencha o nome do empreendimento.')
  }
  if (!payload.descricao.trim()) {
    throw new Error('Preencha a descrição do empreendimento.')
  }
  if (!payload.localizacao.cep.trim()) {
    throw new Error('Preencha o CEP do empreendimento.')
  }
  if (!payload.localizacao.logradouro.trim()) {
    throw new Error('Preencha o logradouro do empreendimento.')
  }
  if (!payload.localizacao.numero.trim()) {
    throw new Error('Preencha o número do empreendimento.')
  }
  if (!payload.localizacao.bairro.trim()) {
    throw new Error('Preencha o bairro do empreendimento.')
  }
  if (!payload.localizacao.cidade.trim()) {
    throw new Error('Preencha a cidade do empreendimento.')
  }
  if (!payload.descricaoLazer.trim()) {
    throw new Error('Preencha a descrição da área de lazer.')
  }

  const tipos = payload.tipos.map((tipo, index) => {
    if (tipo.areaMetragem === '' || tipo.areaMetragem === null) {
      throw new Error(`Preencha o tamanho da área do Tipo ${index + 1}.`)
    }
    if (tipo.quantidadeSuites === '' || tipo.quantidadeSuites === null) {
      throw new Error(`Preencha a quantidade de suítes do Tipo ${index + 1}.`)
    }
    if (tipo.quantidadeVagas === '' || tipo.quantidadeVagas === null) {
      throw new Error(`Preencha a quantidade de vagas do Tipo ${index + 1}.`)
    }

    const unidades = (tipo.unidades || [])
      .map((unidade) => ({
        codigoUnidade: unidade.codigoUnidade.trim(),
        tipoValor: (unidade.tipoValor || 'VALOR').trim().toUpperCase(),
        valor: unidade.valor
      }))

    const hasPartialUnit = unidades.some((unidade) => (
      (!unidade.codigoUnidade) ||
      (unidade.tipoValor === 'VALOR' && !unidade.valor) ||
      !unidade.tipoValor
    ))

    if (hasPartialUnit) {
      throw new Error(`Preencha todos os dados dos pavimentos do Tipo ${index + 1}.`)
    }

    const completeUnits = unidades
      .filter((unidade) => unidade.codigoUnidade)
      .map((unidade) => ({
        codigoUnidade: unidade.codigoUnidade,
        tipoValor: unidade.tipoValor,
        valor: unidade.tipoValor === 'RESERVADO' ? null : unidade.valor
      }))
    if (completeUnits.length === 0) {
      throw new Error(`Cadastre ao menos um pavimento válido no Tipo ${index + 1}.`)
    }

    return {
      areaMetragem: tipo.areaMetragem,
      quantidadeSuites: tipo.quantidadeSuites,
      quantidadeVagas: tipo.quantidadeVagas,
      unidades: completeUnits
    }
  })

  return {
    ...payload,
    nome: payload.nome.trim(),
    descricao: payload.descricao.trim(),
    descricaoLazer: payload.descricaoLazer.trim(),
    localizacao: {
      ...payload.localizacao,
      cep: payload.localizacao.cep.trim(),
      logradouro: payload.localizacao.logradouro.trim(),
      numero: payload.localizacao.numero.trim(),
      complemento: payload.localizacao.complemento.trim(),
      bairro: payload.localizacao.bairro.trim(),
      cidade: payload.localizacao.cidade.trim(),
      estado: payload.localizacao.estado.trim()
    },
    tipos,
    entradaTipo: payload.condicoesPagamento.entradaTipo || null,
    entradaValor: payload.condicoesPagamento.entradaValor || null,
    saldoPagamento: payload.condicoesPagamento.saldo.trim() || null,
    reforcosPagamento: payload.condicoesPagamento.reforcos.trim() || null,
    dataInicioObra: normalizeMonthYearForApi(normalizeNullableDate(payload.dataInicioObra)),
    dataEntrega: normalizeMonthYearForApi(normalizeNullableDate(payload.dataEntrega))
  }
}

function formatCep(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Não foi possível processar a imagem selecionada'))
    }
    image.src = objectUrl
  })
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Não foi possível comprimir a imagem'))
        return
      }
      resolve(blob)
    }, 'image/jpeg', quality)
  })
}

async function compressImage(file) {
  const image = await loadImage(file)
  const scale = Math.min(1, FOTO_MAX_DIMENSION / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível preparar a compressão da imagem')
  context.drawImage(image, 0, 0, width, height)
  const blob = await canvasToBlob(canvas, FOTO_QUALITY)
  const baseName = (file.name || 'imagem').replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}

export default function EmpreendimentosPage() {
  const { token, hasPermission } = useAuth()
  const canManageDevelopments = hasPermission('CREATE_DEVELOPMENT')
  const [items, setItems] = useState([])
  const carouselRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editPayload, setEditPayload] = useState(null)
  const [editFoto, setEditFoto] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [activeEditTab, setActiveEditTab] = useState('dados')
  const [empreendimentoMateriais, setEmpreendimentoMateriais] = useState([])
  const [editingMaterialId, setEditingMaterialId] = useState(null)
  const [editingMaterialPayload, setEditingMaterialPayload] = useState(null)
  const [savingMaterialEdit, setSavingMaterialEdit] = useState(false)
  const [deletingMaterialId, setDeletingMaterialId] = useState(null)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [pricingItem, setPricingItem] = useState(null)
  const [pricingPayload, setPricingPayload] = useState({ tipo: 'PERCENTUAL', valor: '', dataReferenciaTabelaVendas: '' })
  const [savingPricing, setSavingPricing] = useState(false)
  const fotoInputRef = useRef(null)

  async function loadItems() {
    const data = await hubService.empreendimentos(token)
    setItems(data)
  }

  useEffect(() => {
    loadItems().catch(() => {})
  }, [token])

  function updateArrows() {
    const el = carouselRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  useEffect(() => {
    updateArrows()
    const el = carouselRef.current
    if (!el) return
    const onScroll = () => updateArrows()
    const onResize = () => updateArrows()
    el.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onResize)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [items])

  function scrollByCards(direction) {
    const el = carouselRef.current
    if (!el) return
    const amount = Math.max(320, Math.floor(el.clientWidth * 0.75))
    el.scrollBy({ left: direction * amount, behavior: 'smooth' })
  }

  async function openEdit(item) {
    setEditingItem(item)
    setEditPayload(createEditPayload(item))
    setEditFoto(null)
    setActiveEditTab('dados')
    setEditingMaterialId(null)
    setEditingMaterialPayload(null)
    if (fotoInputRef.current) {
      fotoInputRef.current.value = ''
    }
    try {
      const materiais = await hubService.materiais(token)
      setEmpreendimentoMateriais((materiais || []).filter((material) => Number(material.empreendimentoId) === Number(item.id)))
    } catch {
      setEmpreendimentoMateriais([])
    }
  }

  function closeEdit() {
    if (savingEdit) return
    setEditingItem(null)
    setEditPayload(null)
    setEditFoto(null)
    setEmpreendimentoMateriais([])
    setEditingMaterialId(null)
    setEditingMaterialPayload(null)
    setBuscandoCep(false)
    if (fotoInputRef.current) {
      fotoInputRef.current.value = ''
    }
  }

  function openPricing(item) {
    setPricingItem(item)
    setPricingPayload({
      tipo: 'PERCENTUAL',
      valor: '',
      dataReferenciaTabelaVendas: item.dataReferenciaTabelaVendas ? `${item.dataReferenciaTabelaVendas.slice(5, 7)}/${item.dataReferenciaTabelaVendas.slice(0, 4)}` : ''
    })
  }

  function closePricing() {
    if (savingPricing) return
    setPricingItem(null)
    setPricingPayload({ tipo: 'PERCENTUAL', valor: '', dataReferenciaTabelaVendas: '' })
  }

  async function confirmDelete() {
    if (!itemToDelete || isDeleting) return
    setIsDeleting(true)
    try {
      await hubService.excluirEmpreendimento(token, itemToDelete.id)
      setItems((current) => current.filter((item) => item.id !== itemToDelete.id))
      setItemToDelete(null)
    } catch (error) {
      alert(error.message || 'Não foi possível excluir o empreendimento')
    } finally {
      setIsDeleting(false)
    }
  }

  function updateTipo(id, field, value) {
    setEditPayload((current) => ({
      ...current,
      tipos: current.tipos.map((tipo) => (tipo.id === id ? { ...tipo, [field]: value } : tipo))
    }))
  }

  function addTipo() {
    setEditPayload((current) => ({
      ...current,
      tipos: [...current.tipos, createTipo(current.tipos.length + 1)]
    }))
  }

  function updateUnidade(tipoId, unidadeId, field, value) {
    setEditPayload((current) => ({
      ...current,
      tipos: current.tipos.map((tipo) => (
        tipo.id === tipoId
          ? {
            ...tipo,
            unidades: tipo.unidades.map((unidade) => (unidade.id === unidadeId ? { ...unidade, [field]: value } : unidade))
          }
          : tipo
      ))
    }))
  }

  function addUnidade(tipoId) {
    setEditPayload((current) => ({
      ...current,
      tipos: current.tipos.map((tipo, tipoIndex) => (
        tipo.id === tipoId
          ? { ...tipo, unidades: [...tipo.unidades, createUnidade(tipoIndex + 1, tipo.unidades.length + 1)] }
          : tipo
      ))
    }))
  }

  function removeUnidade(tipoId, unidadeId) {
    setEditPayload((current) => ({
      ...current,
      tipos: current.tipos.map((tipo) => (
        tipo.id === tipoId
          ? {
            ...tipo,
            unidades: tipo.unidades.length > 1 ? tipo.unidades.filter((unidade) => unidade.id !== unidadeId) : tipo.unidades
          }
          : tipo
      ))
    }))
  }

  function removeTipo(id) {
    setEditPayload((current) => ({
      ...current,
      tipos: current.tipos.length > 1 ? current.tipos.filter((tipo) => tipo.id !== id) : current.tipos
    }))
  }

  async function preencherEnderecoPorCep(rawCep) {
    const cep = rawCep.replace(/\D/g, '')
    if (cep.length !== 8) return
    setBuscandoCep(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()
      if (data.erro) return
      setEditPayload((current) => ({
        ...current,
        localizacao: {
          ...current.localizacao,
          cep: formatCep(cep),
          logradouro: data.logradouro || current.localizacao.logradouro,
          bairro: data.bairro || current.localizacao.bairro,
          cidade: data.localidade || current.localizacao.cidade,
          estado: data.uf || current.localizacao.estado
        }
      }))
    } catch {
      // keep manual entry if CEP lookup fails
    } finally {
      setBuscandoCep(false)
    }
  }

  async function handleFotoChange(e) {
    const selectedFile = e.target.files?.[0] || null
    if (!selectedFile) {
      setEditFoto(null)
      return
    }
    try {
      const compressed = await compressImage(selectedFile)
      if (compressed.size > MAX_MULTIPART_SIZE_BYTES) {
        alert('A foto de perfil excede o limite atual de 20 MB.')
        e.target.value = ''
        setEditFoto(null)
        return
      }
      setEditFoto(compressed)
    } catch (error) {
      alert(error.message || 'Não foi possível processar a foto de perfil')
      e.target.value = ''
      setEditFoto(null)
    }
  }

  async function submitEdit(e) {
    e.preventDefault()
    if (!editingItem || !editPayload || savingEdit) return
    try {
      setSavingEdit(true)
      const sanitizedPayload = sanitizeEmpreendimentoPayload(editPayload)
      const updated = await hubService.atualizarEmpreendimento(token, editingItem.id, sanitizedPayload, editFoto)
      setItems((current) => current.map((item) => (item.id === editingItem.id ? updated : item)))
      closeEdit()
      alert('Empreendimento atualizado com sucesso')
    } catch (error) {
      alert(error.message || 'Não foi possível atualizar o empreendimento')
    } finally {
      setSavingEdit(false)
    }
  }

  async function submitMaterialEdit(e) {
    e.preventDefault()
    if (!editingMaterialId || !editingMaterialPayload || savingMaterialEdit) return
    try {
      setSavingMaterialEdit(true)
      const updated = await hubService.atualizarMaterial(token, editingMaterialId, {
        titulo: editingMaterialPayload.titulo,
        tipoArquivo: editingMaterialPayload.tipoArquivo,
        pastaDestino: editingMaterialPayload.pastaDestino || null,
        caminhoRelativo: editingMaterialPayload.caminhoRelativo || null,
        descricao: editingMaterialPayload.descricao || null
      })
      setEmpreendimentoMateriais((current) => current.map((material) => (material.id === updated.id ? updated : material)))
      setEditingMaterialId(null)
      setEditingMaterialPayload(null)
      alert('Material atualizado com sucesso')
    } catch (error) {
      alert(error.message || 'Não foi possível atualizar o material')
    } finally {
      setSavingMaterialEdit(false)
    }
  }

  async function deleteMaterial(material) {
    if (deletingMaterialId) return
    if (!window.confirm(`Excluir o material "${material.titulo}"?`)) return
    try {
      setDeletingMaterialId(material.id)
      await hubService.excluirMaterial(token, material.id)
      setEmpreendimentoMateriais((current) => current.filter((item) => item.id !== material.id))
      if (editingMaterialId === material.id) {
        setEditingMaterialId(null)
        setEditingMaterialPayload(null)
      }
    } catch (error) {
      alert(error.message || 'Não foi possível excluir o material')
    } finally {
      setDeletingMaterialId(null)
    }
  }

  async function submitPricing(e) {
    e.preventDefault()
    if (!pricingItem || savingPricing) return

    const valor = Number(pricingPayload.valor)
    if (!Number.isFinite(valor) || valor <= 0) {
      alert('Informe um valor de reajuste maior que zero.')
      return
    }

    try {
      setSavingPricing(true)
      const updated = await hubService.reajustarValoresEmpreendimento(token, pricingItem.id, {
        tipo: pricingPayload.tipo,
        valor,
        dataReferenciaTabelaVendas: normalizeMonthYearForApi(normalizeNullableDate(pricingPayload.dataReferenciaTabelaVendas))
      })
      setItems((current) => current.map((item) => (item.id === pricingItem.id ? updated : item)))
      closePricing()
      alert('Valores do empreendimento reajustados com sucesso')
    } catch (error) {
      alert(error.message || 'Não foi possível reajustar os valores do empreendimento')
    } finally {
      setSavingPricing(false)
    }
  }

  return (
    <AppLayout title="Empreendimentos">
      <section className="relative mb-0">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-gradient-to-br from-pageSurface to-sky-100 text-hubBlueDeep shadow-soft border border-slate-200 text-2xl"
            aria-label="Ver empreendimentos anteriores"
          >
            ‹
          </button>
        )}

        <div
          ref={carouselRef}
          className="flex items-start gap-4 overflow-x-auto pb-0 px-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <article key={item.id} className="relative rounded-3xl border border-white/15 bg-[#2b2b2b] pt-3 px-3 pb-2 text-center w-[320px] shrink-0">
              {canManageDevelopments && (
                <div className="absolute right-4 top-4 z-10 flex gap-2">
                  <button
                    type="button"
                    aria-label={`Reajustar valores de ${item.nome}`}
                    onClick={() => openPricing(item)}
                    className="h-9 w-9 rounded-full bg-white text-black shadow-md grid place-items-center transition-transform duration-100 ease-in-out hover:scale-110"
                  >
                    <span className="text-base font-medium">$</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Editar ${item.nome}`}
                    onClick={() => openEdit(item)}
                    className="h-9 w-9 rounded-full bg-white text-black shadow-md grid place-items-center transition-transform duration-100 ease-in-out hover:scale-110"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
                      <path d="m12 6 4 4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir ${item.nome}`}
                    onClick={() => setItemToDelete(item)}
                    className="h-9 w-9 rounded-full bg-white text-black shadow-md grid place-items-center transition-transform duration-100 ease-in-out hover:scale-110"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              )}
              <img src={item.fotoPerfilUrl || semImagemEmpreendimento} alt={item.nome} className="rounded-3xl w-full h-[450px] object-cover" />
              <h3 className="text-[1.35rem] font-semibold mt-2 leading-6 h-12 line-clamp-2 overflow-hidden break-words">{item.nome}</h3>
              <button
                className="bg-white/14 text-white border border-white/15 px-5 py-2 rounded-xl text-[1.35rem] mt-2 mb-1 leading-none inline-flex items-center"
                onClick={() => window.open(`${window.location.origin}/materiais-publicos/${item.publicToken}`, '_blank', 'noopener,noreferrer')}
              >
                Consultar material
              </button>
              <button
                className="bg-black/25 text-white border border-white/15 px-5 py-2 rounded-xl text-[1.35rem] mt-2 mb-1 leading-none inline-flex items-center"
                onClick={() => window.open(`${window.location.origin}/tabela-vendas-publica/${item.publicToken}`, '_blank', 'noopener,noreferrer')}
              >
                Tabela de vendas
              </button>
            </article>
          ))}
        </div>

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-gradient-to-br from-pageSurface to-sky-100 text-hubBlueDeep shadow-soft border border-slate-200 text-2xl"
            aria-label="Ver próximos empreendimentos"
          >
            ›
          </button>
        )}
      </section>

      {canManageDevelopments && editingItem && editPayload && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
          <div className="glass-panel w-full max-w-5xl rounded-3xl p-7 shadow-2xl my-8 text-white">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Editar empreendimento</h2>
                <p className="text-sm text-white/70 mt-1">{editingItem.nome}</p>
              </div>
              <button type="button" onClick={closeEdit} className="text-white/70 text-2xl leading-none">×</button>
            </div>

            <div className="mb-6 flex gap-3 border-b border-white/15 pb-4">
              <button
                type="button"
                onClick={() => setActiveEditTab('dados')}
                className={`rounded-full px-5 py-2 text-sm font-semibold ${activeEditTab === 'dados' ? 'bg-hubBlueDeep text-white' : 'bg-white/12 text-white border border-white/15'}`}
              >
                Dados
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab('materiais')}
                className={`rounded-full px-5 py-2 text-sm font-semibold ${activeEditTab === 'materiais' ? 'bg-hubBlueDeep text-white' : 'bg-white/12 text-white border border-white/15'}`}
              >
                Materiais
              </button>
            </div>

            {activeEditTab === 'dados' ? (
              <form onSubmit={submitEdit} className="grid grid-cols-1 gap-5 text-lg">
                <Field label="Nome">
                  <input
                    className="input-hub w-full rounded-2xl p-3"
                    value={editPayload.nome}
                    onChange={(e) => setEditPayload((current) => ({ ...current, nome: e.target.value }))}
                  />
                </Field>

                <Field label="Foto de perfil">
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    className="input-hub w-full rounded-2xl p-3"
                    onChange={handleFotoChange}
                  />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Estado">
                    <select
                      className="input-hub w-full rounded-2xl p-3"
                      value={editPayload.localizacao.estado}
                      onChange={(e) => setEditPayload((current) => ({ ...current, localizacao: { ...current.localizacao, estado: e.target.value } }))}
                    >
                      {ESTADOS_BR.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                    </select>
                  </Field>
                  <Field label={`CEP${buscandoCep ? ' (buscando...)' : ''}`}>
                    <input
                      className="input-hub w-full rounded-2xl p-3"
                      value={editPayload.localizacao.cep}
                      onChange={(e) => {
                        const cep = formatCep(e.target.value)
                        setEditPayload((current) => ({ ...current, localizacao: { ...current.localizacao, cep } }))
                        if (cep.replace(/\D/g, '').length === 8) {
                          preencherEnderecoPorCep(cep)
                        }
                      }}
                    />
                  </Field>
                  <Field label="Logradouro">
                    <input className="input-hub w-full rounded-2xl p-3" value={editPayload.localizacao.logradouro} onChange={(e) => setEditPayload((current) => ({ ...current, localizacao: { ...current.localizacao, logradouro: e.target.value } }))} />
                  </Field>
                  <Field label="Número">
                    <input className="input-hub w-full rounded-2xl p-3" value={editPayload.localizacao.numero} onChange={(e) => setEditPayload((current) => ({ ...current, localizacao: { ...current.localizacao, numero: e.target.value } }))} />
                  </Field>
                  <Field label="Complemento">
                    <input className="input-hub w-full rounded-2xl p-3" value={editPayload.localizacao.complemento} onChange={(e) => setEditPayload((current) => ({ ...current, localizacao: { ...current.localizacao, complemento: e.target.value } }))} />
                  </Field>
                  <Field label="Bairro">
                    <input className="input-hub w-full rounded-2xl p-3" value={editPayload.localizacao.bairro} onChange={(e) => setEditPayload((current) => ({ ...current, localizacao: { ...current.localizacao, bairro: e.target.value } }))} />
                  </Field>
                  <Field label="Cidade">
                    <input className="input-hub w-full rounded-2xl p-3" value={editPayload.localizacao.cidade} onChange={(e) => setEditPayload((current) => ({ ...current, localizacao: { ...current.localizacao, cidade: e.target.value } }))} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Data de início da obra">
                    <input
                      className="input-hub w-full rounded-2xl p-3"
                      inputMode="numeric"
                      placeholder="MM/AAAA"
                      maxLength={7}
                      value={editPayload.dataInicioObra}
                      onChange={(e) => setEditPayload((current) => ({ ...current, dataInicioObra: formatMonthYearInput(e.target.value) }))}
                    />
                  </Field>
                  <Field label="Data de entrega">
                    <input
                      className="input-hub w-full rounded-2xl p-3"
                      inputMode="numeric"
                      placeholder="MM/AAAA"
                      maxLength={7}
                      value={editPayload.dataEntrega}
                      onChange={(e) => setEditPayload((current) => ({ ...current, dataEntrega: formatMonthYearInput(e.target.value) }))}
                    />
                  </Field>
                </div>

                <Field label="Descrição">
                  <textarea className="input-hub w-full rounded-2xl p-3 min-h-28" value={editPayload.descricao} onChange={(e) => setEditPayload((current) => ({ ...current, descricao: e.target.value }))} />
                </Field>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-semibold">Tipos do empreendimento</h3>
                    <button type="button" onClick={addTipo} className="bg-hubBlueDeep text-white px-4 py-2 rounded-xl text-base font-semibold">Adicionar tipo</button>
                  </div>
                  <div className="space-y-4">
                    {editPayload.tipos.map((tipo, index) => (
                      <div key={tipo.id} className="rounded-2xl bg-white/10 border border-white/15 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-lg font-semibold">{`Tipo ${index + 1}`}</p>
                          {editPayload.tipos.length > 1 && (
                            <button type="button" onClick={() => removeTipo(tipo.id)} className="text-sm font-semibold text-red-600">Remover</button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Field label="Tamanho da área">
                            <div className="relative">
                              <input type="number" min="0" step="0.01" className="input-hub w-full rounded-2xl p-3 pr-14" value={tipo.areaMetragem} onChange={(e) => updateTipo(tipo.id, 'areaMetragem', e.target.value)} />
                              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/65">m²</span>
                            </div>
                          </Field>
                          <Field label="Qtd de suítes">
                            <input type="number" min="0" className="input-hub w-full rounded-2xl p-3" value={tipo.quantidadeSuites} onChange={(e) => updateTipo(tipo.id, 'quantidadeSuites', e.target.value)} />
                          </Field>
                          <Field label="Qtd de vagas">
                            <input type="number" min="0" className="input-hub w-full rounded-2xl p-3" value={tipo.quantidadeVagas} onChange={(e) => updateTipo(tipo.id, 'quantidadeVagas', e.target.value)} />
                          </Field>
                        </div>
                        <div className="mt-4 rounded-2xl border border-white/15 bg-white/8 p-4">
                          <div className="mb-3">
                            <div className="hidden md:grid md:grid-cols-[210px_210px_210px] gap-4 px-1 pt-2">
                              <p className="text-[0.98rem] font-semibold text-white/72">Pavimento</p>
                              <p className="text-[0.98rem] font-semibold text-white/72">Situação</p>
                              <p className="text-[0.98rem] font-semibold text-white/72">Valor</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {tipo.unidades.map((unidade) => (
                              <div key={unidade.id} className="grid grid-cols-1 md:grid-cols-[210px_210px_210px_auto] gap-4 items-end">
                                <Field label="Pavimento" hideLabelOnDesktop>
                                  <input className="input-hub w-full rounded-2xl !border !border-white/25 !bg-white/10 p-3" value={unidade.codigoUnidade} onChange={(e) => updateUnidade(tipo.id, unidade.id, 'codigoUnidade', e.target.value)} />
                                </Field>
                                <Field label="Situação" hideLabelOnDesktop>
                                  <select className="input-hub w-full rounded-2xl border border-white/25 p-3" value={unidade.tipoValor} onChange={(e) => updateUnidade(tipo.id, unidade.id, 'tipoValor', e.target.value)}>
                                    <option value="VALOR">Disponivel</option>
                                    <option value="RESERVADO">RESERVADO</option>
                                  </select>
                                </Field>
                                {unidade.tipoValor === 'VALOR' ? (
                                  <Field label="Valor" hideLabelOnDesktop>
                                    <input className="input-hub w-full rounded-2xl !border !border-white/25 !bg-white/10 p-3" inputMode="numeric" value={formatCurrencyInput(unidade.valor)} onChange={(e) => updateUnidade(tipo.id, unidade.id, 'valor', parseCurrencyInput(e.target.value))} />
                                  </Field>
                                ) : (
                                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white/70">
                                    Este pavimento aparecerá como RESERVADO.
                                  </div>
                                )}
                                <button type="button" onClick={() => removeUnidade(tipo.id, unidade.id)} className="h-[42px] rounded-xl bg-white/12 border border-white/15 px-4 text-sm font-semibold text-red-300 whitespace-nowrap self-end justify-self-end">Remover</button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button type="button" onClick={() => addUnidade(tipo.id)} className="bg-hubBlueDeep text-white px-3 py-2 rounded-xl text-sm font-semibold">Adicionar pavimento</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Metragem de lazer">
                    <div className="relative">
                      <input type="number" min="0" step="0.01" className="input-hub w-full rounded-2xl p-3 pr-14" value={editPayload.metragemLazer} onChange={(e) => setEditPayload((current) => ({ ...current, metragemLazer: e.target.value }))} />
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/65">m²</span>
                    </div>
                  </Field>
                  <Field label={`Andamento da construção (${editPayload.percentualObra}%)`}>
                    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-5">
                      <input type="range" min="0" max="100" value={editPayload.percentualObra} onChange={(e) => setEditPayload((current) => ({ ...current, percentualObra: Number(e.target.value) }))} className="w-full accent-hubBlueDeep" />
                      <div className="mt-4 h-3 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-hubBlue to-hubBlueDeep" style={{ width: `${editPayload.percentualObra}%` }} />
                      </div>
                    </div>
                  </Field>
                </div>

                <Field label="Descrição da área de lazer">
                  <textarea className="input-hub w-full rounded-2xl p-3 min-h-28" value={editPayload.descricaoLazer} onChange={(e) => setEditPayload((current) => ({ ...current, descricaoLazer: e.target.value }))} />
                </Field>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
                  <h3 className="text-2xl font-semibold mb-4">Formas de pagamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Entrada">
                      <div className="flex gap-3">
                        <select
                          className="input-hub w-[170px] rounded-2xl p-3"
                          value={editPayload.condicoesPagamento.entradaTipo}
                          onChange={(e) => setEditPayload((current) => ({
                            ...current,
                            condicoesPagamento: { ...current.condicoesPagamento, entradaTipo: e.target.value, entradaValor: '' }
                          }))}
                        >
                          <option value="PERCENTUAL">Porcentagem</option>
                          <option value="VALOR">Em reais</option>
                        </select>
                        <input
                          className="input-hub w-full rounded-2xl p-3"
                          inputMode="decimal"
                          placeholder={editPayload.condicoesPagamento.entradaTipo === 'PERCENTUAL' ? 'Ex.: 20,50' : 'Ex.: 50000,00'}
                          value={editPayload.condicoesPagamento.entradaValor}
                          onChange={(e) => setEditPayload((current) => ({
                            ...current,
                            condicoesPagamento: { ...current.condicoesPagamento, entradaValor: formatDecimalInput(e.target.value) }
                          }))}
                        />
                      </div>
                    </Field>
                    <Field label="Saldo">
                      <input
                        className="input-hub w-full rounded-2xl p-3"
                        value={editPayload.condicoesPagamento.saldo}
                        onChange={(e) => setEditPayload((current) => ({
                          ...current,
                          condicoesPagamento: { ...current.condicoesPagamento, saldo: e.target.value }
                        }))}
                      />
                    </Field>
                    <Field label="Reforços">
                      <input
                        className="input-hub w-full rounded-2xl p-3"
                        value={editPayload.condicoesPagamento.reforcos}
                        onChange={(e) => setEditPayload((current) => ({
                          ...current,
                          condicoesPagamento: { ...current.condicoesPagamento, reforcos: e.target.value }
                        }))}
                      />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeEdit} disabled={savingEdit} className="px-5 py-2 rounded-xl bg-white/12 border border-white/15 text-white font-medium disabled:opacity-70">Cancelar</button>
                  <button type="submit" disabled={savingEdit} className="px-5 py-2 rounded-xl bg-hubBlueDeep text-white font-semibold disabled:opacity-70">
                    {savingEdit ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {empreendimentoMateriais.length === 0 ? (
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white/70">
                    Nenhum material cadastrado para este empreendimento.
                  </div>
                ) : (
                  empreendimentoMateriais.map((material) => (
                    <div key={material.id} className="rounded-2xl border border-white/15 bg-white/10 p-5">
                      {editingMaterialId === material.id && editingMaterialPayload ? (
                        <form onSubmit={submitMaterialEdit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field label="Título">
                            <input className="input-hub w-full rounded-2xl p-3" value={editingMaterialPayload.titulo} onChange={(e) => setEditingMaterialPayload((current) => ({ ...current, titulo: e.target.value }))} />
                          </Field>
                          <Field label="Tipo de arquivo">
                            <select className="input-hub w-full rounded-2xl p-3" value={editingMaterialPayload.tipoArquivo} onChange={(e) => setEditingMaterialPayload((current) => ({ ...current, tipoArquivo: e.target.value }))}>
                              <option value="PDF">PDF</option>
                              <option value="IMAGEM">IMAGEM</option>
                              <option value="EXCEL">EXCEL</option>
                              <option value="DOCUMENTO">DOCUMENTO</option>
                            </select>
                          </Field>
                          <Field label="Pasta de destino">
                            <input className="input-hub w-full rounded-2xl p-3" value={editingMaterialPayload.pastaDestino} onChange={(e) => setEditingMaterialPayload((current) => ({ ...current, pastaDestino: e.target.value }))} />
                          </Field>
                          <Field label="Caminho relativo">
                            <input className="input-hub w-full rounded-2xl p-3" value={editingMaterialPayload.caminhoRelativo} onChange={(e) => setEditingMaterialPayload((current) => ({ ...current, caminhoRelativo: e.target.value }))} />
                          </Field>
                          <Field label="Descrição" className="md:col-span-2">
                            <textarea className="input-hub w-full rounded-2xl p-3 min-h-24" value={editingMaterialPayload.descricao} onChange={(e) => setEditingMaterialPayload((current) => ({ ...current, descricao: e.target.value }))} />
                          </Field>
                          <div className="md:col-span-2 flex justify-end gap-3">
                            <button type="button" onClick={() => { setEditingMaterialId(null); setEditingMaterialPayload(null) }} disabled={savingMaterialEdit} className="px-5 py-2 rounded-xl bg-white/12 border border-white/15 text-white font-medium disabled:opacity-70">Cancelar</button>
                            <button type="submit" disabled={savingMaterialEdit} className="px-5 py-2 rounded-xl bg-hubBlueDeep text-white font-semibold disabled:opacity-70">
                              {savingMaterialEdit ? 'Salvando...' : 'Salvar material'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-semibold text-white">{material.titulo}</h3>
                            <p className="mt-2 text-sm text-white/70">Tipo: {material.tipoArquivo}</p>
                            {material.pastaDestino && <p className="mt-1 text-sm text-white/70">Pasta: {material.pastaDestino}</p>}
                            {material.caminhoRelativo && <p className="mt-1 text-sm text-white/60">{material.caminhoRelativo}</p>}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMaterialId(material.id)
                                setEditingMaterialPayload(createMaterialEditPayload(material))
                              }}
                              className="h-9 w-9 rounded-full bg-white text-black shadow-md grid place-items-center transition-transform duration-100 ease-in-out hover:scale-110"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                                <path d="M4 20h4l10-10-4-4L4 16v4Z" />
                                <path d="m12 6 4 4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMaterial(material)}
                              disabled={deletingMaterialId === material.id}
                              className="h-9 w-9 rounded-full bg-white text-black shadow-md grid place-items-center transition-transform duration-100 ease-in-out hover:scale-110 disabled:opacity-50"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {canManageDevelopments && pricingItem && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-7 shadow-2xl text-white">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Reajuste de valor</h2>
                <p className="text-sm text-white/70 mt-1">{pricingItem.nome}</p>
              </div>
              <button type="button" onClick={closePricing} className="text-white/70 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={submitPricing} className="grid grid-cols-1 gap-5">
              <Field label="Tipo de reajuste">
                <select
                  className="input-hub w-full rounded-2xl p-3"
                  value={pricingPayload.tipo}
                  onChange={(e) => setPricingPayload((current) => ({ ...current, tipo: e.target.value }))}
                >
                  <option value="PERCENTUAL">Porcentagem (%)</option>
                  <option value="VALOR_FIXO">Em reais (R$)</option>
                </select>
              </Field>

              <Field label={pricingPayload.tipo === 'PERCENTUAL' ? 'Valor do reajuste (%)' : 'Valor do reajuste (R$)'}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input-hub w-full rounded-2xl p-3"
                  value={pricingPayload.valor}
                  onChange={(e) => setPricingPayload((current) => ({ ...current, valor: e.target.value }))}
                />
              </Field>

              <Field label="Mês e ano da tabela de vendas">
                <input
                  className="input-hub w-full rounded-2xl p-3"
                  inputMode="numeric"
                  placeholder="MM/AAAA"
                  maxLength={7}
                  value={pricingPayload.dataReferenciaTabelaVendas}
                  onChange={(e) => setPricingPayload((current) => ({ ...current, dataReferenciaTabelaVendas: formatMonthYearInput(e.target.value) }))}
                />
              </Field>

              <p className="text-sm leading-6 text-white/70">
                Este reajuste será aplicado a todos os valores de pavimentos do empreendimento selecionado e refletirá também na tabela de vendas pública.
              </p>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={closePricing} disabled={savingPricing} className="px-5 py-2 rounded-xl bg-white/12 border border-white/15 text-white font-medium disabled:opacity-70">Cancelar</button>
                <button type="submit" disabled={savingPricing} className="px-5 py-2 rounded-xl bg-hubBlueDeep text-white font-semibold disabled:opacity-70">
                  {savingPricing ? 'Aplicando...' : 'Aplicar reajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canManageDevelopments && itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-7 shadow-2xl text-white">
            <h2 className="text-xl font-semibold text-white mb-2">Deseja mesmo excluir este empreendimento?</h2>
            <p className="text-sm text-white/70 mb-6 line-clamp-2">{itemToDelete.nome}</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={confirmDelete} disabled={isDeleting} className="px-5 py-2 rounded-xl bg-red-600 text-white text-base font-medium hover:bg-red-700 disabled:opacity-70">
                {isDeleting ? 'Excluindo...' : 'Sim'}
              </button>
              <button type="button" onClick={() => setItemToDelete(null)} disabled={isDeleting} className="px-5 py-2 rounded-xl bg-white/12 border border-white/15 text-white text-base font-semibold hover:opacity-95 disabled:opacity-70">
                Não
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

function Field({ label, children, hideLabelOnDesktop = false }) {
  return (
    <label className="block">
      <span className={`block mb-1 ${hideLabelOnDesktop ? 'md:hidden' : ''}`}>{label}</span>
      {children}
    </label>
  )
}
