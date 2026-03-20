import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'

const EMPREENDIMENTO_NOME_MAX_CHARS = 55
const USER_PERMISSION_OPTIONS = [
  { code: 'CREATE_DEVELOPMENT', label: 'Cadastrar empreendimentos' },
  { code: 'CREATE_USER', label: 'Cadastrar usuários' },
  { code: 'CREATE_MATERIAL', label: 'Cadastrar materiais' }
]

export default function CadastrosPage() {
  const { token, user, hasPermission } = useAuth()
  const isAdminMaster = user?.role === 'ADMIN_MASTER'
  const canCreateMaterial = hasPermission('CREATE_MATERIAL')
  const canCreateUser = hasPermission('CREATE_USER')
  const canCreateDevelopment = hasPermission('CREATE_DEVELOPMENT')
  const canAccessAnyCadastro = canCreateMaterial || canCreateUser || canCreateDevelopment
  const [searchParams] = useSearchParams()
  const [empreendimentos, setEmpreendimentos] = useState([])
  const [openSection, setOpenSection] = useState(null)
  const [payload, setPayload] = useState({ titulo: '', tipoArquivo: 'PDF', empreendimentoId: '', descricao: '' })
  const [file, setFile] = useState(null)
  const [userPayload, setUserPayload] = useState({ nome: '', email: '', telefone: '', senha: '', role: 'TIME_COMERCIAL', permissionCodes: [] })
  const [empreendimentoPayload, setEmpreendimentoPayload] = useState({ nome: '', descricao: '', fotoPerfilUrl: '' })
  const [fotoEmpreendimento, setFotoEmpreendimento] = useState(null)
  const fotoEmpreendimentoInputRef = useRef(null)

  async function carregarEmpreendimentos() {
    hubService.empreendimentos(token).then(setEmpreendimentos).catch(() => {})
  }

  useEffect(() => {
    carregarEmpreendimentos()
  }, [token])

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

  async function submitMaterial(e) {
    e.preventDefault()
    if (!file) return
    await hubService.criarMaterial(token, {
      ...payload,
      empreendimentoId: payload.empreendimentoId ? Number(payload.empreendimentoId) : null
    }, file)
    setPayload({ titulo: '', tipoArquivo: 'PDF', empreendimentoId: '', descricao: '' })
    setFile(null)
    alert('Material criado com sucesso')
  }

  async function submitUsuario(e) {
    e.preventDefault()
    try {
      const payloadToSend = isAdminMaster ? userPayload : { ...userPayload, permissionCodes: [] }
      await hubService.criarUsuario(token, payloadToSend)
      setUserPayload({ nome: '', email: '', telefone: '', senha: '', role: 'TIME_COMERCIAL', permissionCodes: [] })
      alert('Usuário criado com sucesso')
    } catch (error) {
      alert(error.message || 'Não foi possível criar o usuário')
    }
  }

  async function submitEmpreendimento(e) {
    e.preventDefault()
    await hubService.criarEmpreendimento(token, empreendimentoPayload, fotoEmpreendimento)
    setEmpreendimentoPayload({ nome: '', descricao: '', fotoPerfilUrl: '' })
    setFotoEmpreendimento(null)
    if (fotoEmpreendimentoInputRef.current) {
      fotoEmpreendimentoInputRef.current.value = ''
    }
    await carregarEmpreendimentos()
    alert('Empreendimento criado com sucesso')
  }

  function toggle(section) {
    setOpenSection((current) => (current === section ? null : section))
  }

  return (
    <AppLayout title="Cadastros">
      <section className="space-y-4">
        {!canAccessAnyCadastro && (
          <div className="pill-card rounded-3xl p-6 text-xl">
            Você não tem permissão para realizar cadastros.
          </div>
        )}

        {canCreateMaterial && (
          <>
            <AccordionHeader
              title="Novo material"
              isOpen={openSection === 'material'}
              onClick={() => toggle('material')}
            />
            <AccordionPanel isOpen={openSection === 'material'}>
              <div className="pill-card rounded-3xl p-8 mt-3">
                <form onSubmit={submitMaterial} className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xl">
                  <Field label="Título"><input className="input-hub w-full rounded-2xl p-3" value={payload.titulo} onChange={(e) => setPayload((p) => ({ ...p, titulo: e.target.value }))} /></Field>
                  <Field label="Tipo de arquivo">
                    <select className="input-hub w-full rounded-2xl p-3" value={payload.tipoArquivo} onChange={(e) => setPayload((p) => ({ ...p, tipoArquivo: e.target.value }))}>
                      <option>PDF</option><option>IMAGEM</option><option>EXCEL</option><option>DOCUMENTO</option>
                    </select>
                  </Field>
                  <Field label="Empreendimento">
                    <select className="input-hub w-full rounded-2xl p-3" value={payload.empreendimentoId} onChange={(e) => setPayload((p) => ({ ...p, empreendimentoId: e.target.value }))}>
                      <option value="">Selecione</option>
                      {empreendimentos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </Field>
                  <Field label="Arquivo"><input type="file" className="input-hub w-full rounded-2xl p-3" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
                  <Field label="Descrição" className="lg:col-span-2"><textarea className="input-hub w-full rounded-2xl p-3 min-h-28" value={payload.descricao} onChange={(e) => setPayload((p) => ({ ...p, descricao: e.target.value }))} /></Field>
                  <div className="lg:col-span-2"><button className="bg-hubBlueDeep text-white px-6 py-2 rounded-xl text-2xl">Salvar material</button></div>
                </form>
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
              <div className="pill-card rounded-3xl p-8 mt-3">
                <form onSubmit={submitUsuario} className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xl">
                  <Field label="Nome"><input className="input-hub w-full rounded-2xl p-3" value={userPayload.nome} onChange={(e) => setUserPayload((p) => ({ ...p, nome: e.target.value }))} /></Field>
                  <Field label="E-mail"><input className="input-hub w-full rounded-2xl p-3" value={userPayload.email} onChange={(e) => setUserPayload((p) => ({ ...p, email: e.target.value }))} /></Field>
                  <Field label="Telefone"><input className="input-hub w-full rounded-2xl p-3" value={userPayload.telefone} onChange={(e) => setUserPayload((p) => ({ ...p, telefone: e.target.value }))} /></Field>
                  <Field label="Role">
                    <select className="input-hub w-full rounded-2xl p-3" value={userPayload.role} onChange={(e) => setUserPayload((p) => ({ ...p, role: e.target.value }))}>
                      <option value="ADMIN_MASTER">ADMIN MASTER</option>
                      <option value="TIME_COMERCIAL">TIME COMERCIAL</option>
                    </select>
                  </Field>
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
              <div className="pill-card rounded-3xl p-8 mt-3">
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
                      onChange={(e) => setFotoEmpreendimento(e.target.files?.[0] || null)}
                    />
                  </Field>
                  <Field label="Descrição"><textarea className="input-hub w-full rounded-2xl p-3 min-h-28" value={empreendimentoPayload.descricao} onChange={(e) => setEmpreendimentoPayload((p) => ({ ...p, descricao: e.target.value }))} /></Field>
                  <div><button className="bg-hubBlueDeep text-white px-6 py-2 rounded-xl text-2xl">Salvar empreendimento</button></div>
                </form>
              </div>
            </AccordionPanel>
          </>
        )}
      </section>
    </AppLayout>
  )
}

function AccordionHeader({ title, isOpen, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pill-card w-full rounded-3xl p-5 text-4xl font-bold text-left flex items-center justify-between"
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
        {children}
      </div>
    </div>
  )
}

function Field({ label, className = '', children }) {
  return <label className={`block ${className}`}><span className="block mb-1">{label}</span>{children}</label>
}
