import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'
import { useToast } from '../hooks/useToast'

const EMPREENDIMENTO_NOME_MAX_CHARS = 55
const MAX_MULTIPART_SIZE_BYTES = 20 * 1024 * 1024
const MATERIAL_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024
const FOTO_MAX_DIMENSION = 1600
const FOTO_QUALITY = 0.82
const ESTADOS_BR = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
const USER_PERMISSION_OPTIONS = [
  { code: 'CREATE_DEVELOPMENT', label: 'Cadastrar empreendimentos' },
  { code: 'CREATE_USER', label: 'Cadastrar usuários' },
  { code: 'CREATE_MATERIAL', label: 'Cadastrar materiais' }
]

function inferMaterialType(file) {
  const mime = (file?.type || '').toLowerCase()
  const name = (file?.name || '').toLowerCase()
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) return 'IMAGEM'
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'PDF'
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    /\.(xls|xlsx|csv)$/.test(name)
  ) return 'EXCEL'
  return 'DOCUMENTO'
}

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

function createEmpreendimentoPayload() {
  return {
    nome: '',
    descricao: '',
    fotoPerfilUrl: '',
    localizacao: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: 'SP'
    },
    tipos: [createTipo(1)],
    metragemLazer: '',
    descricaoLazer: '',
    percentualObra: 0,
    condicoesPagamento: {
      entradaTipo: 'PERCENTUAL',
      entradaValor: '',
      saldo: '',
      reforcos: ''
    },
    dataInicioObra: '',
    dataEntrega: ''
  }
}

function createInstitucionalPayload() {
  return {
    titulo: '',
    link: ''
  }
}

function createInstitucionalDraft(index = 1) {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    titulo: '',
    pastaDestino: '',
    caminhoRelativo: '',
    link: '',
    arquivo: null
  }
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  const precision = size >= 10 || unitIndex === 0 ? 0 : 1
  return `${size.toFixed(precision)} ${units[unitIndex]}`
}

function getFileExtension(name) {
  const parts = String(name || '').split('.')
  return parts.length > 1 ? parts.pop().toUpperCase() : 'ARQ'
}

function buildInstitucionalFolderPreview(file) {
  const mime = (file?.type || '').toLowerCase()
  const isImage = mime.startsWith('image/')
  const isPdf = mime === 'application/pdf' || (file?.name || '').toLowerCase().endsWith('.pdf')
  const relativePath = file.webkitRelativePath || file.relativePath || file.name

  return {
    id: `${relativePath}-${file.size}-${file.lastModified}`,
    fileName: file.name,
    relativePath,
    previewKind: isImage ? 'image' : isPdf ? 'pdf' : 'generic',
    previewUrl: isImage || isPdf ? URL.createObjectURL(file) : null,
    sizeLabel: formatFileSize(file.size),
    extensionLabel: getFileExtension(file.name)
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
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível comprimir a imagem'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      quality
    )
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
  if (!context) {
    throw new Error('Não foi possível preparar a compressão da imagem')
  }

  context.drawImage(image, 0, 0, width, height)
  const blob = await canvasToBlob(canvas, FOTO_QUALITY)
  const baseName = (file.name || 'imagem').replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}

export default function CadastrosPage() {
  const { token, user, hasPermission } = useAuth()
  const toast = useToast()
  const isAdminMaster = user?.role === 'ADMIN_MASTER'
  const canViewMaterial = hasPermission('VIEW_MATERIAL')
  const canCreateMaterial = hasPermission('CREATE_MATERIAL')
  const canCreateUser = hasPermission('CREATE_USER')
  const canCreateDevelopment = hasPermission('CREATE_DEVELOPMENT')
  const canAccessAnyCadastro = canViewMaterial || canCreateMaterial || canCreateUser || canCreateDevelopment
  const [searchParams] = useSearchParams()
  const [empreendimentos, setEmpreendimentos] = useState([])
  const [openSection, setOpenSection] = useState(null)
  const [payload, setPayload] = useState({ titulo: '', empreendimentoId: '' })
  const [materialUploadMode, setMaterialUploadMode] = useState('arquivo')
  const [file, setFile] = useState(null)
  const [folderFiles, setFolderFiles] = useState([])
  const [salvandoMaterial, setSalvandoMaterial] = useState(false)
  const [userPayload, setUserPayload] = useState({ nome: '', email: '', telefone: '', cargo: '', senha: '', role: 'TIME_COMERCIAL', permissionCodes: [] })
  const [empreendimentoPayload, setEmpreendimentoPayload] = useState(createEmpreendimentoPayload())
  const [fotoEmpreendimento, setFotoEmpreendimento] = useState(null)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [salvandoEmpreendimento, setSalvandoEmpreendimento] = useState(false)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const institucionalFolderInputRef = useRef(null)
  const fotoEmpreendimentoInputRef = useRef(null)
  const [institucionalDrafts, setInstitucionalDrafts] = useState([createInstitucionalDraft(1)])
  const [institucionalUploadMode, setInstitucionalUploadMode] = useState('arquivo')
  const [institucionalFolderFiles, setInstitucionalFolderFiles] = useState([])
  const [institucionalFolderPreviews, setInstitucionalFolderPreviews] = useState([])
  const [salvandoInstitucional, setSalvandoInstitucional] = useState(false)
  const [confirmMaterialFolderUpload, setConfirmMaterialFolderUpload] = useState(false)
  const [confirmInstitucionalFolderUpload, setConfirmInstitucionalFolderUpload] = useState(false)
  const [empresa, setEmpresa] = useState(null)
  const [iconeEmpresa, setIconeEmpresa] = useState(null)
  const [salvandoIconeEmpresa, setSalvandoIconeEmpresa] = useState(false)

  async function carregarEmpreendimentos() {
    hubService.empreendimentos(token).then(setEmpreendimentos).catch(() => {})
  }

  useEffect(() => {
    Promise.allSettled([
      hubService.empreendimentos(token),
      hubService.minhaEmpresa(token)
    ]).then(([empreendimentosResult, empresaResult]) => {
      setEmpreendimentos(empreendimentosResult.status === 'fulfilled' ? (empreendimentosResult.value || []) : [])
      setEmpresa(empresaResult.status === 'fulfilled' ? (empresaResult.value || null) : null)
    })
  }, [token, canViewMaterial])

  useEffect(() => {
    const tab = searchParams.get('tab')
    const empreendimentoId = searchParams.get('empreendimentoId')
    if (tab === 'material') {
      setOpenSection('material')
      if (empreendimentoId) {
        setPayload((current) => ({ ...current, empreendimentoId }))
      }
    }
  }, [searchParams])

  useEffect(() => {
    const previews = institucionalFolderFiles.map(buildInstitucionalFolderPreview)
    setInstitucionalFolderPreviews(previews)

    return () => {
      previews.forEach((preview) => {
        if (preview.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl)
        }
      })
    }
  }, [institucionalFolderFiles])

  async function processMaterialFolderUpload() {
    for (const currentFile of folderFiles) {
      const relativePath = currentFile.webkitRelativePath || currentFile.relativePath || currentFile.name
      const title = currentFile.name.replace(/\.[^.]+$/, '')
      await hubService.criarMaterial(token, {
        titulo: title,
        tipoArquivo: inferMaterialType(currentFile),
        empreendimentoId: Number(payload.empreendimentoId),
        pastaDestino: payload.titulo.trim(),
        caminhoRelativo: relativePath,
        descricao: null
      }, currentFile)
    }
    toast.success('Pasta enviada com sucesso.')
    setPayload({ titulo: '', empreendimentoId: '' })
    setMaterialUploadMode('arquivo')
    setFile(null)
    setFolderFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  async function submitMaterial(e) {
    e.preventDefault()
    if ((!file && folderFiles.length === 0) || salvandoMaterial) return
    try {
      if (!payload.empreendimentoId) {
        throw new Error('Selecione o empreendimento do material.')
      }

      if (materialUploadMode === 'pasta' && !payload.titulo.trim()) {
        throw new Error('Preencha o título da pasta para o upload em lote.')
      }

      if (materialUploadMode === 'pasta') {
        if (folderFiles.length === 0) {
          throw new Error('Selecione uma pasta com arquivos antes de salvar.')
        }
        setConfirmMaterialFolderUpload(true)
      } else {
        setSalvandoMaterial(true)
        await hubService.criarMaterial(token, {
          ...payload,
          tipoArquivo: inferMaterialType(file),
          pastaDestino: null,
          caminhoRelativo: null,
          empreendimentoId: payload.empreendimentoId ? Number(payload.empreendimentoId) : null
        }, file)
        toast.success('Material criado com sucesso.')
        setPayload({ titulo: '', empreendimentoId: '' })
        setMaterialUploadMode('arquivo')
        setFile(null)
        setFolderFiles([])
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (folderInputRef.current) folderInputRef.current.value = ''
      }
    } catch (error) {
      toast.error(error.message || 'Não foi possível criar o material')
    } finally {
      setSalvandoMaterial(false)
    }
  }

  async function submitUsuario(e) {
    e.preventDefault()
    try {
      const payloadToSend = isAdminMaster ? userPayload : { ...userPayload, permissionCodes: [] }
      await hubService.criarUsuario(token, payloadToSend)
      setUserPayload({ nome: '', email: '', telefone: '', cargo: '', senha: '', role: 'TIME_COMERCIAL', permissionCodes: [] })
      toast.success('Usuário criado com sucesso.')
    } catch (error) {
      toast.error(error.message || 'Não foi possível criar o usuário')
    }
  }

  async function submitEmpreendimento(e) {
    e.preventDefault()
    if (salvandoEmpreendimento) return

    if (fotoEmpreendimento && fotoEmpreendimento.size > MAX_MULTIPART_SIZE_BYTES) {
      toast.error('A foto de perfil excede o limite atual de 20 MB.')
      return
    }

    try {
      setSalvandoEmpreendimento(true)
      const sanitizedPayload = sanitizeEmpreendimentoPayload(empreendimentoPayload)
      await hubService.criarEmpreendimento(token, sanitizedPayload, fotoEmpreendimento)
      setEmpreendimentoPayload(createEmpreendimentoPayload())
      setFotoEmpreendimento(null)
      if (fotoEmpreendimentoInputRef.current) {
        fotoEmpreendimentoInputRef.current.value = ''
      }
      await carregarEmpreendimentos()
      toast.success('Empreendimento criado com sucesso.')
    } catch (error) {
      toast.error(error.message || 'Não foi possível criar o empreendimento')
    } finally {
      setSalvandoEmpreendimento(false)
    }
  }

  async function submitInstitucional(e) {
    e.preventDefault()
    if (salvandoInstitucional) return
    try {
      if (institucionalUploadMode === 'pasta') {
        if (institucionalFolderFiles.length === 0) {
          toast.info('Selecione uma pasta com arquivos institucionais antes de salvar.')
          return
        }
        setConfirmInstitucionalFolderUpload(true)
        return
      }

      setSalvandoInstitucional(true)
      const validDrafts = institucionalDrafts.filter((item) => item.titulo.trim() || item.arquivo || item.link.trim())
      if (validDrafts.length === 0) {
        toast.info('Adicione ao menos um arquivo institucional antes de salvar.')
        return
      }

      for (const item of validDrafts) {
        if (!item.titulo.trim()) {
          throw new Error('Preencha o título de todos os arquivos institucionais.')
        }
        if (!item.arquivo && !item.link.trim()) {
          throw new Error('Informe um arquivo ou um link para todos os itens institucionais.')
        }
      }

      for (const item of validDrafts) {
        await hubService.criarInstitucionalArquivo(token, { titulo: item.titulo, link: item.link }, item.arquivo)
      }

      setInstitucionalDrafts([createInstitucionalDraft(1)])
      toast.success('Institucional salvo com sucesso.')
    } catch (error) {
      toast.error(error.message || 'Não foi possível salvar o institucional')
    } finally {
      setSalvandoInstitucional(false)
    }
  }

  async function submitIconeEmpresa(e) {
    e.preventDefault()
    if (!iconeEmpresa || salvandoIconeEmpresa) return
    try {
      setSalvandoIconeEmpresa(true)
      const updated = await hubService.atualizarIconeEmpresa(token, iconeEmpresa)
      setEmpresa(updated)
      setIconeEmpresa(null)
      toast.success('Ícone salvo com sucesso.')
    } catch (error) {
      toast.error(error.message || 'Não foi possível salvar o ícone')
    } finally {
      setSalvandoIconeEmpresa(false)
    }
  }

  function addInstitucionalDraft() {
    setInstitucionalDrafts((current) => [...current, createInstitucionalDraft(current.length + 1)])
  }

  function updateInstitucionalDraft(id, field, value) {
    setInstitucionalDrafts((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function removeInstitucionalDraft(id) {
    setInstitucionalDrafts((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current))
  }

  function toggle(section) {
    setOpenSection((current) => (current === section ? null : section))
  }

  function updateTipo(id, field, value) {
    setEmpreendimentoPayload((current) => ({
      ...current,
      tipos: current.tipos.map((tipo) => (tipo.id === id ? { ...tipo, [field]: value } : tipo))
    }))
  }

  function updateUnidade(tipoId, unidadeId, field, value) {
    setEmpreendimentoPayload((current) => ({
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
    setEmpreendimentoPayload((current) => ({
      ...current,
      tipos: current.tipos.map((tipo, tipoIndex) => (
        tipo.id === tipoId
          ? { ...tipo, unidades: [...tipo.unidades, createUnidade(tipoIndex + 1, tipo.unidades.length + 1)] }
          : tipo
      ))
    }))
  }

  function removeUnidade(tipoId, unidadeId) {
    setEmpreendimentoPayload((current) => ({
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

  function addTipo() {
    setEmpreendimentoPayload((current) => ({
      ...current,
      tipos: [...current.tipos, createTipo(current.tipos.length + 1)]
    }))
  }

  function removeTipo(id) {
    setEmpreendimentoPayload((current) => ({
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

      setEmpreendimentoPayload((current) => ({
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

  async function handleFotoEmpreendimentoChange(e) {
    const selectedFile = e.target.files?.[0] || null
    if (!selectedFile) {
      setFotoEmpreendimento(null)
      return
    }

    try {
      const compressedFile = await compressImage(selectedFile)
      if (compressedFile.size > MAX_MULTIPART_SIZE_BYTES) {
        toast.error('A foto de perfil continua acima do limite de 20 MB mesmo após compressão.')
        e.target.value = ''
        setFotoEmpreendimento(null)
        return
      }
      setFotoEmpreendimento(compressedFile)
    } catch (error) {
      toast.error(error.message || 'Não foi possível processar a foto de perfil')
      e.target.value = ''
      setFotoEmpreendimento(null)
    }
  }

  async function handleMaterialFileChange(e) {
    const selectedFile = e.target.files?.[0] || null
    if (!selectedFile) {
      setFile(null)
      return
    }

    try {
      const fileToUpload = selectedFile.type.startsWith('image/')
        ? await compressImage(selectedFile)
        : selectedFile

      if (fileToUpload.size > MATERIAL_MAX_FILE_SIZE_BYTES) {
        toast.error('O arquivo do material excede o limite atual de 100 MB.')
        e.target.value = ''
        setFile(null)
        return
      }

      setFile(fileToUpload)
      setFolderFiles([])
      setMaterialUploadMode('arquivo')
      if (folderInputRef.current) folderInputRef.current.value = ''
    } catch (error) {
      toast.error(error.message || 'Não foi possível processar o arquivo do material')
      e.target.value = ''
      setFile(null)
    }
  }

  async function handleMaterialFolderChange(e) {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) {
      setFolderFiles([])
      return
    }

    try {
      const processedFiles = []
      for (const selectedFile of selectedFiles) {
        const fileToUpload = selectedFile.type.startsWith('image/')
          ? await compressImage(selectedFile)
          : selectedFile

        if (fileToUpload.size > MATERIAL_MAX_FILE_SIZE_BYTES) {
          throw new Error(`O arquivo ${selectedFile.name} excede o limite atual de 100 MB.`)
        }

        Object.defineProperty(fileToUpload, 'relativePath', {
          value: selectedFile.webkitRelativePath || selectedFile.name,
          configurable: true
        })
        processedFiles.push(fileToUpload)
      }

      setFolderFiles(processedFiles)
      setFile(null)
      setMaterialUploadMode('pasta')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      toast.error(error.message || 'Não foi possível processar a pasta selecionada')
      e.target.value = ''
      setFolderFiles([])
    }
  }

  function handleInstitucionalFolderChange(e) {
    const selectedFiles = Array.from(e.target.files || [])
    setInstitucionalFolderFiles(selectedFiles)
  }

  async function processInstitucionalFolderUpload() {
    for (const file of institucionalFolderFiles) {
      const relativePath = file.webkitRelativePath || file.relativePath || file.name
      const folderName = relativePath.includes('/') ? relativePath.split('/')[0] : 'Pasta institucional'
      const titulo = file.name.replace(/\.[^.]+$/, '').trim() || 'Arquivo institucional'
      await hubService.criarInstitucionalArquivo(token, {
        titulo,
        pastaDestino: folderName,
        caminhoRelativo: relativePath,
        link: ''
      }, file)
    }

    setInstitucionalFolderFiles([])
    if (institucionalFolderInputRef.current) {
      institucionalFolderInputRef.current.value = ''
    }
    toast.success('Pasta institucional enviada com sucesso.')
  }

  return (
    <AppLayout title="Cadastros">
      <section className="cadastros-form space-y-4">
        {!canAccessAnyCadastro && (
          <div className="rounded-3xl border border-slate-200 border-x-4 border-hubBlue/70 bg-white p-6 text-xl">
            Você não tem permissão para realizar cadastros.
          </div>
        )}

        {canViewMaterial && (
          <>
            <AccordionHeader
              title={canCreateMaterial ? 'Novo material' : 'Materiais cadastrados'}
              isOpen={openSection === 'material'}
              onClick={() => toggle('material')}
            />
            <AccordionPanel isOpen={openSection === 'material'}>
              <div className="mt-3 rounded-3xl border border-white/20 border-x-4 border-white/35 bg-white/12 p-8 backdrop-blur-sm">
                {canCreateMaterial && (
                  <form noValidate onSubmit={submitMaterial} className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xl">
                    <Field label="Título">
                      <input className="input-hub w-full rounded-2xl p-3" value={payload.titulo} onChange={(e) => setPayload((p) => ({ ...p, titulo: e.target.value }))} />
                      <p className="mt-1 text-sm text-slate-600">No upload de pasta, cada arquivo usa o próprio nome.</p>
                    </Field>
                    <Field label="Empreendimento">
                      <select className="input-hub w-full rounded-2xl p-3" value={payload.empreendimentoId} onChange={(e) => setPayload((p) => ({ ...p, empreendimentoId: e.target.value }))}>
                        <option value="">Selecione</option>
                        {empreendimentos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                    </Field>
                    <div className="lg:col-span-2">
                      <p className="text-base font-semibold">
                        Você deseja cadastrar um arquivo avulso, ou uma pasta com vários arquivos?
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setMaterialUploadMode('arquivo')}
                          className={`rounded-full px-5 py-2 text-base font-semibold ${materialUploadMode === 'arquivo' ? 'bg-hubBlueDeep text-white' : 'bg-[#2b2b2b] text-white border border-white/15'}`}
                        >
                          Arquivo avulso
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaterialUploadMode('pasta')}
                          className={`rounded-full px-5 py-2 text-base font-semibold ${materialUploadMode === 'pasta' ? 'bg-hubBlueDeep text-white' : 'bg-[#2b2b2b] text-white border border-white/15'}`}
                        >
                          Pasta com arquivos
                        </button>
                      </div>
                    </div>
                    {materialUploadMode === 'arquivo' ? (
                      <Field label="Arquivo" className="lg:col-span-2">
                        <input ref={fileInputRef} type="file" className="input-hub w-full rounded-2xl p-3" onChange={handleMaterialFileChange} />
                        <p className="mt-1 text-sm text-slate-600">
                          Imagens são comprimidas automaticamente antes do envio. PDFs e outros formatos podem ter até 100 MB.
                        </p>
                      </Field>
                    ) : (
                      <Field label="Pasta" className="lg:col-span-2">
                        <input ref={folderInputRef} type="file" webkitdirectory="" directory="" multiple className="input-hub w-full rounded-2xl p-3" onChange={handleMaterialFolderChange} />
                        <p className="mt-1 text-sm text-slate-600">
                          Selecione uma pasta inteira para cadastrar vários materiais de uma vez no empreendimento escolhido. O nome da pasta será o título informado acima.
                        </p>
                      </Field>
                    )}
                    <div className="lg:col-span-2">
                      <button disabled={salvandoMaterial} className="bg-hubBlueDeep text-white px-6 py-2 rounded-xl text-2xl disabled:opacity-70">
                        {salvandoMaterial ? 'Enviando material...' : 'Salvar material'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </AccordionPanel>
          </>
        )}

        {canCreateUser && (
          <>
            <AccordionHeader
              title="Novo usuário"
              isOpen={openSection === 'usuario'}
              onClick={() => toggle('usuario')}
            />
            <AccordionPanel isOpen={openSection === 'usuario'}>
              <div className="mt-3 rounded-3xl border border-white/20 border-x-4 border-white/35 bg-white/12 p-8 backdrop-blur-sm">
                <form onSubmit={submitUsuario} className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xl">
                  <Field label="Nome"><input className="input-hub w-full rounded-2xl p-3" value={userPayload.nome} onChange={(e) => setUserPayload((p) => ({ ...p, nome: e.target.value }))} /></Field>
                  <Field label="E-mail"><input className="input-hub w-full rounded-2xl p-3" value={userPayload.email} onChange={(e) => setUserPayload((p) => ({ ...p, email: e.target.value }))} /></Field>
                  <Field label="Telefone"><input className="input-hub w-full rounded-2xl p-3" value={userPayload.telefone} onChange={(e) => setUserPayload((p) => ({ ...p, telefone: e.target.value }))} /></Field>
                  <Field label="Cargo"><input className="input-hub w-full rounded-2xl p-3" value={userPayload.cargo} onChange={(e) => setUserPayload((p) => ({ ...p, cargo: e.target.value }))} /></Field>
                  {isAdminMaster && (
                    <Field label="Permissões extras" className="lg:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {USER_PERMISSION_OPTIONS.map((option) => {
                          const checked = userPayload.permissionCodes.includes(option.code)
                          return (
                            <label key={option.code} className="input-hub rounded-2xl p-3 flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setUserPayload((current) => ({
                                    ...current,
                                    permissionCodes: e.target.checked
                                      ? [...current.permissionCodes, option.code]
                                      : current.permissionCodes.filter((code) => code !== option.code)
                                  }))
                                }}
                              />
                              <span>{option.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </Field>
                  )}
                  <Field label="Senha" className="lg:col-span-2"><input type="password" minLength={8} className="input-hub w-full rounded-2xl p-3" value={userPayload.senha} onChange={(e) => setUserPayload((p) => ({ ...p, senha: e.target.value }))} /></Field>
                  <div className="lg:col-span-2"><button className="bg-hubBlueDeep text-white px-6 py-2 rounded-xl text-2xl">Salvar usuário</button></div>
                </form>
              </div>
            </AccordionPanel>
          </>
        )}

        {canCreateDevelopment && (
          <>
            <AccordionHeader
              title="Novo empreendimento"
              isOpen={openSection === 'empreendimento'}
              onClick={() => toggle('empreendimento')}
            />
            <AccordionPanel isOpen={openSection === 'empreendimento'}>
              <div className="mt-3 rounded-3xl border border-white/20 border-x-4 border-white/35 bg-white/12 p-8 backdrop-blur-sm">
                <form onSubmit={submitEmpreendimento} className="grid grid-cols-1 gap-5 text-xl">
                  <Field label="Nome">
                    <input
                      className="input-hub w-full rounded-2xl p-3"
                      value={empreendimentoPayload.nome}
                      maxLength={EMPREENDIMENTO_NOME_MAX_CHARS}
                      onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, nome: e.target.value.slice(0, EMPREENDIMENTO_NOME_MAX_CHARS) }))}
                    />
                    <p className="mt-1 text-sm text-slate-600">
                      {empreendimentoPayload.nome.length}/{EMPREENDIMENTO_NOME_MAX_CHARS} caracteres (máx. 2 linhas no card)
                    </p>
                  </Field>
                  <Field label="Foto de perfil">
                    <input
                      ref={fotoEmpreendimentoInputRef}
                      type="file"
                      accept="image/*"
                      className="input-hub w-full rounded-2xl p-3"
                      onChange={handleFotoEmpreendimentoChange}
                    />
                    <p className="mt-1 text-sm text-slate-600">
                      A foto é comprimida automaticamente antes do envio para manter boa qualidade e reduzir o tamanho.
                    </p>
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Estado">
                      <select
                        className="input-hub w-full rounded-2xl p-3"
                        value={empreendimentoPayload.localizacao.estado}
                        onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, localizacao: { ...p.localizacao, estado: e.target.value } }))}
                      >
                        {ESTADOS_BR.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                      </select>
                    </Field>
                    <Field label={`CEP${buscandoCep ? ' (buscando...)' : ''}`}>
                      <input
                        className="input-hub w-full rounded-2xl p-3"
                        value={empreendimentoPayload.localizacao.cep}
                        onChange={(e) => {
                          const cep = formatCep(e.target.value)
                          setEmpreendimentoPayload((p) => ({ ...p, localizacao: { ...p.localizacao, cep } }))
                          if (cep.replace(/\D/g, '').length === 8) {
                            preencherEnderecoPorCep(cep)
                          }
                        }}
                      />
                    </Field>
                    <Field label="Logradouro">
                      <input
                        className="input-hub w-full rounded-2xl p-3"
                        value={empreendimentoPayload.localizacao.logradouro}
                        onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, localizacao: { ...p.localizacao, logradouro: e.target.value } }))}
                      />
                    </Field>
                    <Field label="Número">
                      <input
                        className="input-hub w-full rounded-2xl p-3"
                        value={empreendimentoPayload.localizacao.numero}
                        onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, localizacao: { ...p.localizacao, numero: e.target.value } }))}
                      />
                    </Field>
                    <Field label="Complemento">
                      <input
                        className="input-hub w-full rounded-2xl p-3"
                        value={empreendimentoPayload.localizacao.complemento}
                        onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, localizacao: { ...p.localizacao, complemento: e.target.value } }))}
                      />
                    </Field>
                    <Field label="Bairro">
                      <input
                        className="input-hub w-full rounded-2xl p-3"
                        value={empreendimentoPayload.localizacao.bairro}
                        onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, localizacao: { ...p.localizacao, bairro: e.target.value } }))}
                      />
                    </Field>
                    <Field label="Cidade">
                      <input
                        className="input-hub w-full rounded-2xl p-3"
                        value={empreendimentoPayload.localizacao.cidade}
                        onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, localizacao: { ...p.localizacao, cidade: e.target.value } }))}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Data de início da obra">
                      <input
                        className="input-hub w-full rounded-2xl p-3"
                        inputMode="numeric"
                        placeholder="MM/AAAA"
                        maxLength={7}
                        value={empreendimentoPayload.dataInicioObra}
                        onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, dataInicioObra: formatMonthYearInput(e.target.value) }))}
                      />
                    </Field>
                    <Field label="Data de entrega">
                      <input
                        className="input-hub w-full rounded-2xl p-3"
                        inputMode="numeric"
                        placeholder="MM/AAAA"
                        maxLength={7}
                        value={empreendimentoPayload.dataEntrega}
                        onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, dataEntrega: formatMonthYearInput(e.target.value) }))}
                      />
                    </Field>
                  </div>

                  <Field label="Descrição">
                    <textarea className="input-hub w-full rounded-2xl p-3 min-h-28" value={empreendimentoPayload.descricao} onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, descricao: e.target.value }))} />
                  </Field>

                  <div className="rounded-3xl bg-transparent p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-semibold">Tipos do empreendimento</h3>
                      <button type="button" onClick={addTipo} className="bg-hubBlueDeep text-white px-4 py-2 rounded-xl text-base font-semibold">Adicionar tipo</button>
                    </div>

                    <div className="space-y-4">
                      {empreendimentoPayload.tipos.map((tipo, index) => (
                        <div key={tipo.id} className="rounded-2xl bg-transparent p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-lg font-semibold">{`Tipo ${index + 1}`}</p>
                            {empreendimentoPayload.tipos.length > 1 && (
                              <button type="button" onClick={() => removeTipo(tipo.id)} className="text-sm font-semibold text-red-600">Remover</button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Field label="Tamanho da área">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input-hub w-full rounded-2xl p-3 pr-14"
                                  value={tipo.areaMetragem}
                                  onChange={(e) => updateTipo(tipo.id, 'areaMetragem', e.target.value)}
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                                  m²
                                </span>
                              </div>
                            </Field>
                            <Field label="Qtd de suítes">
                              <input
                                type="number"
                                min="0"
                                className="input-hub w-full rounded-2xl p-3"
                                value={tipo.quantidadeSuites}
                                onChange={(e) => updateTipo(tipo.id, 'quantidadeSuites', e.target.value)}
                              />
                            </Field>
                            <Field label="Qtd de vagas">
                              <input
                                type="number"
                                min="0"
                                className="input-hub w-full rounded-2xl p-3"
                                value={tipo.quantidadeVagas}
                                onChange={(e) => updateTipo(tipo.id, 'quantidadeVagas', e.target.value)}
                              />
                            </Field>
                          </div>
                          <div className="mt-4 rounded-2xl bg-transparent p-4">
                            <div className="mb-3">
                              <div className="hidden md:grid md:grid-cols-[210px_210px_210px] gap-4 px-1 pt-2">
                                <p className="text-[0.98rem] font-semibold text-slate-600">Pavimento</p>
                                <p className="text-[0.98rem] font-semibold text-slate-600">Situação</p>
                                <p className="text-[0.98rem] font-semibold text-slate-600">Valor</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {tipo.unidades.map((unidade) => (
                                <div key={unidade.id} className="grid grid-cols-1 md:grid-cols-[210px_210px_210px_auto] gap-4 items-end">
                                  <Field label="Pavimento" hideLabelOnDesktop>
                                    <input className="input-hub w-full rounded-2xl !border !border-white/40 !bg-white p-3" value={unidade.codigoUnidade} onChange={(e) => updateUnidade(tipo.id, unidade.id, 'codigoUnidade', e.target.value)} />
                                  </Field>
                                  <Field label="Situação" hideLabelOnDesktop>
                                    <select className="input-hub w-full rounded-2xl border border-white/40 p-3" value={unidade.tipoValor} onChange={(e) => updateUnidade(tipo.id, unidade.id, 'tipoValor', e.target.value)}>
                                      <option value="VALOR">Disponivel</option>
                                      <option value="RESERVADO">RESERVADO</option>
                                    </select>
                                  </Field>
                                  {unidade.tipoValor === 'VALOR' ? (
                                    <Field label="Valor" hideLabelOnDesktop>
                                      <input className="input-hub w-full rounded-2xl !border !border-white/40 !bg-white p-3" inputMode="numeric" value={formatCurrencyInput(unidade.valor)} onChange={(e) => updateUnidade(tipo.id, unidade.id, 'valor', parseCurrencyInput(e.target.value))} />
                                    </Field>
                                  ) : (
                                    <div className="rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-sm font-semibold">
                                      Este pavimento aparecerá como RESERVADO.
                                    </div>
                                  )}
                                  <button type="button" onClick={() => removeUnidade(tipo.id, unidade.id)} className="h-[42px] rounded-xl bg-white/12 border border-white/20 px-4 text-sm font-semibold text-red-300 whitespace-nowrap self-end justify-self-end">Remover</button>
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
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-hub w-full rounded-2xl p-3 pr-14"
                          value={empreendimentoPayload.metragemLazer}
                          onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, metragemLazer: e.target.value }))}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                          m²
                        </span>
                      </div>
                    </Field>
                    <Field label={`Andamento da construção (${empreendimentoPayload.percentualObra}%)`}>
                      <div className="rounded-2xl bg-transparent px-4 py-5">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={empreendimentoPayload.percentualObra}
                          onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, percentualObra: Number(e.target.value) }))}
                          className="w-full accent-hubBlueDeep"
                        />
                        <div className="mt-4 h-3 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-hubBlue to-hubBlueDeep"
                            style={{ width: `${empreendimentoPayload.percentualObra}%` }}
                          />
                        </div>
                      </div>
                    </Field>
                  </div>

                  <Field label="Descrição da área de lazer">
                    <textarea
                      className="input-hub w-full rounded-2xl p-3 min-h-28"
                      value={empreendimentoPayload.descricaoLazer}
                      onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, descricaoLazer: e.target.value }))}
                    />
                  </Field>

                  <div className="rounded-3xl bg-transparent p-5">
                    <h3 className="text-2xl font-semibold mb-4">Formas de pagamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Field label="Entrada">
                        <div className="flex gap-3">
                          <select
                            className="input-hub w-[170px] rounded-2xl p-3"
                            value={empreendimentoPayload.condicoesPagamento.entradaTipo}
                            onChange={(e) => setEmpreendimentoPayload((p) => ({
                              ...p,
                              condicoesPagamento: { ...p.condicoesPagamento, entradaTipo: e.target.value, entradaValor: '' }
                            }))}
                          >
                            <option value="PERCENTUAL">Porcentagem</option>
                            <option value="VALOR">Em reais</option>
                          </select>
                          <input
                            className="input-hub w-full rounded-2xl p-3"
                            inputMode="decimal"
                            placeholder={empreendimentoPayload.condicoesPagamento.entradaTipo === 'PERCENTUAL' ? 'Ex.: 20,50' : 'Ex.: 50000,00'}
                            value={empreendimentoPayload.condicoesPagamento.entradaValor}
                            onChange={(e) => setEmpreendimentoPayload((p) => ({
                              ...p,
                              condicoesPagamento: { ...p.condicoesPagamento, entradaValor: formatDecimalInput(e.target.value) }
                            }))}
                          />
                        </div>
                      </Field>
                      <Field label="Saldo">
                        <input
                          className="input-hub w-full rounded-2xl p-3"
                          value={empreendimentoPayload.condicoesPagamento.saldo}
                          onChange={(e) => setEmpreendimentoPayload((p) => ({
                            ...p,
                            condicoesPagamento: { ...p.condicoesPagamento, saldo: e.target.value }
                          }))}
                        />
                      </Field>
                      <Field label="Reforços">
                        <input
                          className="input-hub w-full rounded-2xl p-3"
                          value={empreendimentoPayload.condicoesPagamento.reforcos}
                          onChange={(e) => setEmpreendimentoPayload((p) => ({
                            ...p,
                            condicoesPagamento: { ...p.condicoesPagamento, reforcos: e.target.value }
                          }))}
                        />
                      </Field>
                    </div>
                  </div>
                  <div>
                    <button
                      disabled={salvandoEmpreendimento}
                      className="bg-hubBlueDeep text-white px-6 py-2 rounded-xl text-2xl disabled:opacity-70"
                    >
                      {salvandoEmpreendimento ? 'Salvando...' : 'Salvar empreendimento'}
                    </button>
                  </div>
                </form>
              </div>
            </AccordionPanel>
          </>
        )}

        {canAccessAnyCadastro && (
          <>
            <AccordionHeader
              title="Institucional"
              isOpen={openSection === 'institucional'}
              onClick={() => toggle('institucional')}
            />
            <AccordionPanel isOpen={openSection === 'institucional'}>
              <div className="mt-3 rounded-3xl border border-white/20 border-x-4 border-white/35 bg-white/12 p-8 backdrop-blur-sm">
                <div className="grid grid-cols-1 gap-6 text-xl">
                  <form onSubmit={submitIconeEmpresa} className="rounded-2xl border border-white/18 bg-transparent p-5">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-24 w-24 overflow-hidden rounded-full border border-white/20 bg-white/10">
                          {empresa?.iconeUrl ? (
                            <img src={empresa.iconeUrl} alt="Ícone da empresa" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/60">
                              Sem ícone
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900">Ícone da marca</p>
                          <p className="text-sm text-slate-500">O ícone será exibido no topo do menu lateral em formato redondo.</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <input
                          type="file"
                          accept="image/*"
                          className="input-hub w-full rounded-2xl border border-slate-300 bg-white p-3 md:w-[360px]"
                          onChange={(e) => setIconeEmpresa(e.target.files?.[0] || null)}
                        />
                        <button
                          type="submit"
                          disabled={!iconeEmpresa || salvandoIconeEmpresa}
                          className="bg-hubBlueDeep text-white px-6 py-2 rounded-xl text-2xl disabled:opacity-70"
                        >
                          {salvandoIconeEmpresa ? 'Salvando...' : 'Salvar ícone'}
                        </button>
                      </div>
                    </div>
                  </form>

                  <form noValidate onSubmit={submitInstitucional} className="grid grid-cols-1 gap-5 text-xl">
                  <div className="rounded-2xl border border-white/18 bg-transparent p-5">
                    <p className="text-base font-semibold text-slate-900">
                      Você deseja cadastrar um arquivo avulso, ou uma pasta com vários arquivos?
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setInstitucionalUploadMode('arquivo')}
                        className={`rounded-full px-5 py-2 text-base font-semibold ${institucionalUploadMode === 'arquivo' ? 'bg-hubBlueDeep text-white' : 'bg-[#2b2b2b] text-white border border-white/15'}`}
                      >
                        Arquivo avulso
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstitucionalUploadMode('pasta')}
                        className={`rounded-full px-5 py-2 text-base font-semibold ${institucionalUploadMode === 'pasta' ? 'bg-hubBlueDeep text-white' : 'bg-[#2b2b2b] text-white border border-white/15'}`}
                      >
                        Pasta com arquivos
                      </button>
                    </div>
                  </div>

                  {institucionalUploadMode === 'arquivo' ? (
                    <>
                      {institucionalDrafts.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-white/18 bg-transparent p-5">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-lg font-semibold text-slate-900">{`Arquivo institucional ${index + 1}`}</p>
                            {institucionalDrafts.length > 1 && (
                              <button type="button" onClick={() => removeInstitucionalDraft(item.id)} className="text-sm font-semibold text-red-600">Remover</button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <Field label="Título">
                              <input
                                className="input-hub w-full rounded-2xl border border-slate-300 bg-white p-3"
                                value={item.titulo}
                                onChange={(e) => updateInstitucionalDraft(item.id, 'titulo', e.target.value)}
                              />
                            </Field>
                            <Field label="Link">
                              <input
                                className="input-hub w-full rounded-2xl border border-slate-300 bg-white p-3"
                                value={item.link}
                                onChange={(e) => updateInstitucionalDraft(item.id, 'link', e.target.value)}
                              />
                            </Field>
                            <Field label="Arquivo institucional">
                              <input
                                type="file"
                                className="input-hub w-full rounded-2xl border border-slate-300 bg-white p-3"
                                onChange={(e) => updateInstitucionalDraft(item.id, 'arquivo', e.target.files?.[0] || null)}
                              />
                            </Field>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-white/18 bg-transparent p-5">
                      <Field label="Pasta institucional">
                        <input
                          ref={institucionalFolderInputRef}
                          type="file"
                          webkitdirectory=""
                          directory=""
                          multiple
                          className="input-hub w-full rounded-2xl border border-slate-300 bg-white p-3"
                          onChange={handleInstitucionalFolderChange}
                        />
                        <p className="mt-2 text-sm text-slate-600">
                          Cada arquivo da pasta será cadastrado como um item institucional separado.
                        </p>
                      </Field>
                      {institucionalFolderFiles.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <p className="text-sm text-slate-600">
                            {institucionalFolderFiles.length} arquivo(s) selecionado(s).
                          </p>
                          <div className="grid grid-cols-1 gap-3">
                            {institucionalFolderPreviews.map((item) => (
                              <div key={item.id} className="grid grid-cols-[112px_1fr] gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                  {item.previewKind === 'image' && item.previewUrl ? (
                                    <img
                                      src={item.previewUrl}
                                      alt={item.fileName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : item.previewKind === 'pdf' && item.previewUrl ? (
                                    <object
                                      data={item.previewUrl}
                                      type="application/pdf"
                                      className="h-full w-full"
                                      aria-label={`Pré-visualização de ${item.fileName}`}
                                    >
                                      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-semibold tracking-[0.18em] text-slate-600">
                                        PDF
                                      </div>
                                    </object>
                                  ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center bg-slate-200 text-slate-600">
                                      <span className="text-xs font-semibold tracking-[0.18em]">{item.extensionLabel}</span>
                                      <span className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">Sem preview</span>
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">{item.fileName}</p>
                                  <p className="mt-1 truncate text-xs text-slate-500">{item.relativePath}</p>
                                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{item.sizeLabel}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    {institucionalUploadMode === 'arquivo' ? (
                      <button type="button" onClick={addInstitucionalDraft} className="bg-white/12 text-white border border-white/20 px-6 py-2 rounded-xl text-2xl font-semibold">
                        Adicionar
                      </button>
                    ) : (
                      <div />
                    )}
                    <button
                      type="submit"
                      disabled={salvandoInstitucional}
                      className="bg-hubBlueDeep text-white px-6 py-2 rounded-xl text-2xl disabled:opacity-70"
                    >
                      {salvandoInstitucional ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
                </div>
              </div>
            </AccordionPanel>
          </>
        )}
      </section>

      {confirmMaterialFolderUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/12 bg-[#2b2b2b] p-6 text-white shadow-2xl">
            <h2 className="text-2xl font-semibold text-white">Confirmar envio da pasta</h2>
            <p className="mt-3 text-sm leading-7 text-white/65">
              A pasta <span className="font-semibold text-white">"{payload.titulo}"</span> será enviada com {folderFiles.length} arquivo(s).
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmMaterialFolderUpload(false)}
                disabled={salvandoMaterial}
                className="rounded-xl border border-white/14 bg-white/8 px-5 py-2 font-medium text-white disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setSalvandoMaterial(true)
                    await processMaterialFolderUpload()
                    setConfirmMaterialFolderUpload(false)
                  } catch (error) {
                    toast.error(error.message || 'Não foi possível criar o material')
                  } finally {
                    setSalvandoMaterial(false)
                  }
                }}
                disabled={salvandoMaterial}
                className="rounded-xl bg-hubBlueDeep px-5 py-2 font-semibold text-white disabled:opacity-70"
              >
                {salvandoMaterial ? 'Enviando...' : 'Enviar pasta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmInstitucionalFolderUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/12 bg-[#2b2b2b] p-6 text-white shadow-2xl">
            <h2 className="text-2xl font-semibold text-white">Confirmar envio da pasta</h2>
            <p className="mt-3 text-sm leading-7 text-white/65">
              A pasta institucional selecionada será enviada com {institucionalFolderFiles.length} arquivo(s).
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmInstitucionalFolderUpload(false)}
                disabled={salvandoInstitucional}
                className="rounded-xl border border-white/14 bg-white/8 px-5 py-2 font-medium text-white disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setSalvandoInstitucional(true)
                    await processInstitucionalFolderUpload()
                    setConfirmInstitucionalFolderUpload(false)
                  } catch (error) {
                    toast.error(error.message || 'Não foi possível salvar o institucional')
                  } finally {
                    setSalvandoInstitucional(false)
                  }
                }}
                disabled={salvandoInstitucional}
                className="rounded-xl bg-hubBlueDeep px-5 py-2 font-semibold text-white disabled:opacity-70"
              >
                {salvandoInstitucional ? 'Enviando...' : 'Enviar pasta'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  )
}

function AccordionHeader({ title, isOpen, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cadastros-header w-full rounded-3xl p-5 text-4xl font-bold text-left flex items-center justify-between"
    >
      <span>{title}</span>
      <span className="text-3xl">{isOpen ? '−' : '+'}</span>
    </button>
  )
}

function AccordionPanel({ isOpen, children }) {
  return (
    <div
      className={`grid transition-all duration-500 ease-in-out ${
        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">
        {isOpen ? children : null}
      </div>
    </div>
  )
}

function Field({ label, className = '', children, hideLabelOnDesktop = false }) {
  return (
    <label className={`block ${className}`}>
      <span className={`block mb-1 ${hideLabelOnDesktop ? 'md:hidden' : ''}`}>{label}</span>
      {children}
    </label>
  )
}
