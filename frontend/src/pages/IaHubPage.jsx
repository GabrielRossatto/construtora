import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'
import { useToast } from '../hooks/useToast'

const INSTITUCIONAL_CONTEXT_ID = 'INSTITUCIONAL'

export default function IaHubPage() {
  const { user, token } = useAuth()
  const toast = useToast()
  const [planoEmpresa, setPlanoEmpresa] = useState(null)
  const [message, setMessage] = useState('')
  const [topOffset, setTopOffset] = useState(0)
  const [chat, setChat] = useState([])
  const [history, setHistory] = useState([])
  const [empreendimentos, setEmpreendimentos] = useState([])
  const [selectedEmpreendimentoId, setSelectedEmpreendimentoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const typingTimerRef = useRef(null)
  const sectionRef = useRef(null)
  const contentRef = useRef(null)
  const textareaRef = useRef(null)
  const firstName = (user?.nome || 'usuário').trim().split(' ')[0]
  const selectedEmpreendimento = empreendimentos.find((item) => String(item.id) === selectedEmpreendimentoId)
  const institucionalSelected = selectedEmpreendimentoId === INSTITUCIONAL_CONTEXT_ID
  const groupedHistory = history.reduce((groups, item) => {
    const empreendimentoId = item.empreendimentoId ?? 'sem-empreendimento'
    const empreendimentoNome = item.empreendimentoId
      ? empreendimentos.find((empreendimento) => empreendimento.id === item.empreendimentoId)?.nome || `Empreendimento #${item.empreendimentoId}`
      : 'Institucional da empresa'
    const existingGroup = groups.find((group) => group.key === empreendimentoId)

    if (existingGroup) {
      existingGroup.items.push(item)
      return groups
    }

    groups.push({
      key: empreendimentoId,
      name: empreendimentoNome,
      items: [item]
    })
    return groups
  }, [])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [message])

  useEffect(() => () => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current)
    }
  }, [])

  useEffect(() => {
    async function loadInitialData() {
      try {
        const empresaResponse = await hubService.minhaEmpresa(token)
        setPlanoEmpresa(empresaResponse?.plano || null)

        const empreendimentosResponse = await hubService.empreendimentos(token)
        setEmpreendimentos(empreendimentosResponse || [])
        const savedEmpreendimentoId = window.localStorage.getItem('iaHub.selectedEmpreendimentoId')
        const savedExists = (empreendimentosResponse || []).some((item) => String(item.id) === savedEmpreendimentoId)
        if (savedEmpreendimentoId === INSTITUCIONAL_CONTEXT_ID) {
          setSelectedEmpreendimentoId(INSTITUCIONAL_CONTEXT_ID)
        } else if (savedExists) {
          setSelectedEmpreendimentoId(savedEmpreendimentoId)
        } else if ((empreendimentosResponse || []).length === 1) {
          setSelectedEmpreendimentoId(String(empreendimentosResponse[0].id))
        }

        if (empresaResponse?.plano === 'BASIC') {
          setHistory([])
          return
        }

        const historyResponse = await hubService.interacoesIa(token)
        setHistory(historyResponse || [])
      } catch {
        setPlanoEmpresa(null)
        setHistory([])
        setEmpreendimentos([])
      }
    }

    if (token) {
      loadInitialData()
    }
  }, [token])

  useEffect(() => {
    if (selectedEmpreendimentoId) {
      window.localStorage.setItem('iaHub.selectedEmpreendimentoId', selectedEmpreendimentoId)
    }
  }, [selectedEmpreendimentoId])

  useEffect(() => {
    function centerContent() {
      if (!sectionRef.current || !contentRef.current || message.trim() || chat.length > 0) return
      const sectionHeight = sectionRef.current.clientHeight
      const contentHeight = contentRef.current.offsetHeight
      setTopOffset(Math.max(32, Math.round((sectionHeight - contentHeight) / 2)))
    }

    centerContent()
    window.addEventListener('resize', centerContent)
    return () => window.removeEventListener('resize', centerContent)
  }, [message, chat.length])

  async function sendMessage(prefilledMessage = message) {
    const content = prefilledMessage.trim()
    if (!content || loading || !selectedEmpreendimentoId) return

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: content
    }

    setChat((current) => [...current, userMessage])
    setMessage('')
    setLoading(true)

    try {
      const response = await hubService.perguntarIa(token, {
        empresaId: user?.empresaId ?? null,
        empreendimentoId: institucionalSelected ? null : Number(selectedEmpreendimentoId),
        contextoModo: institucionalSelected ? 'INSTITUCIONAL' : 'EMPREENDIMENTO',
        pergunta: content
      })

      setHistory((current) => [
        {
          id: `${Date.now()}-history`,
          empreendimentoId: institucionalSelected ? null : Number(selectedEmpreendimentoId),
          pergunta: content,
          resposta: response.resposta,
          tokensUsados: response.tokensUsados,
          createdAt: response.createdAt
        },
        ...current
      ].slice(0, 20))

      const assistantId = `${Date.now()}-assistant`
      setChat((current) => [
        ...current,
        {
          id: assistantId,
          role: 'assistant',
          text: '',
          fullText: response.resposta,
          typing: true,
          usage: {
            tokensUsados: response.tokensUsados,
            totalPerguntasMes: response.totalPerguntasMes,
            totalTokensMes: response.totalTokensMes,
            limitePerguntasMes: response.limitePerguntasMes
          }
        }
      ])

      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current)
      }

      let currentIndex = 0
      const fullText = response.resposta || ''
      const step = fullText.length > 900 ? 12 : fullText.length > 500 ? 8 : 5

      typingTimerRef.current = setInterval(() => {
        currentIndex = Math.min(fullText.length, currentIndex + step)
        const partialText = fullText.slice(0, currentIndex)

        setChat((current) =>
          current.map((entry) =>
            entry.id === assistantId
              ? {
                  ...entry,
                  text: partialText,
                  typing: currentIndex < fullText.length
                }
              : entry
          )
        )

        if (currentIndex >= fullText.length) {
          clearInterval(typingTimerRef.current)
          typingTimerRef.current = null
        }
      }, 20)
    } catch (error) {
      toast.error(error.message || 'Não foi possível consultar a IA.')
      setChat((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant-error`,
          role: 'assistant',
          text: error.message || 'Não foi possível consultar a IA.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  async function copyAssistantText(text) {
    try {
      await navigator.clipboard.writeText(text || '')
      toast.success('Resposta copiada para uso comercial.')
    } catch {
      toast.error('Não foi possível copiar a resposta.')
    }
  }

  function exportConversationPdf() {
    if (chat.length === 0) return

    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) return

    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date())

    const content = chat
      .map((entry) => `
        <div class="message ${entry.role}">
          <div class="label">${entry.role === 'user' ? 'Você' : 'IA HUB'}</div>
          <div class="text">${String(entry.text || '').replace(/\n/g, '<br/>')}</div>
        </div>
      `)
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Conversa IA HUB</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 0 0 24px; color: #555; }
            .message { border: 1px solid #ddd; border-radius: 16px; padding: 16px; margin-bottom: 16px; }
            .message.user { background: #f4f4f4; }
            .message.assistant { background: #fff; }
            .label { font-weight: 700; margin-bottom: 8px; }
            .text { line-height: 1.6; white-space: normal; }
          </style>
        </head>
        <body>
          <h1>Conversa exportada - IA HUB</h1>
          <p>Gerado em ${formattedDate}. O armazenamento deste PDF é de responsabilidade da empresa.</p>
          ${content}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const markdownComponents = {
    table: ({ ...props }) => (
      <div className="my-4 overflow-x-auto rounded-2xl border border-white/15 bg-[#1f1f1f]">
        <table className="min-w-full border-collapse text-sm md:text-base" {...props} />
      </div>
    ),
    thead: ({ ...props }) => <thead className="bg-white/10 text-white" {...props} />,
    tbody: ({ ...props }) => <tbody className="divide-y divide-white/10" {...props} />,
    tr: ({ ...props }) => <tr className="align-top" {...props} />,
    th: ({ ...props }) => (
      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-white/80 md:text-sm" {...props} />
    ),
    td: ({ ...props }) => <td className="px-4 py-3 text-white/90" {...props} />,
    p: ({ ...props }) => <p className="mb-3 leading-8 last:mb-0 md:leading-9" {...props} />,
    ul: ({ ...props }) => <ul className="mb-3 list-disc pl-5 last:mb-0" {...props} />,
    ol: ({ ...props }) => <ol className="mb-3 list-decimal pl-5 last:mb-0" {...props} />,
    li: ({ ...props }) => <li className="mb-1" {...props} />,
    strong: ({ ...props }) => <strong className="font-semibold text-white" {...props} />
  }

  if (planoEmpresa === 'BASIC') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <AppLayout>
      <section
        ref={sectionRef}
        className="relative min-h-[calc(100vh-3.5rem)] bg-[#2b2b2b] px-4"
      >
        <div className="absolute left-4 top-4 z-20 md:left-6 md:top-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/14"
            >
              Conversas anteriores
            </button>

        {historyOpen && (
              <div className="absolute left-0 top-[calc(100%+0.75rem)] z-20 w-[320px] rounded-[1.75rem] border border-white/12 bg-[#2f2f2f] p-4 text-white shadow-2xl">
                <p className="mb-4 text-sm text-white/70">
                  O histórico fica disponível por 30 dias. Se quiser guardar, exporte em PDF.
                </p>
                <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
                  {history.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-white/65">
                      Nenhuma conversa salva ainda.
                    </div>
                  )}
                  {groupedHistory.map((group) => (
                    <div key={group.key} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
                      <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                        {group.name}
                      </p>
                      <div className="space-y-3">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (item.empreendimentoId) {
                                setSelectedEmpreendimentoId(String(item.empreendimentoId))
                                window.localStorage.setItem('iaHub.selectedEmpreendimentoId', String(item.empreendimentoId))
                              } else {
                                setSelectedEmpreendimentoId(INSTITUCIONAL_CONTEXT_ID)
                                window.localStorage.setItem('iaHub.selectedEmpreendimentoId', INSTITUCIONAL_CONTEXT_ID)
                              }
                              setChat([
                                { id: `${item.id}-user`, role: 'user', text: item.pergunta },
                                { id: `${item.id}-assistant`, role: 'assistant', text: item.resposta }
                              ])
                              setHistoryOpen(false)
                            }}
                            className="w-full rounded-2xl border border-white/10 bg-white/6 p-4 text-left transition hover:bg-white/10"
                          >
                            <p className="line-clamp-2 text-sm font-semibold text-white">{item.pergunta}</p>
                            <p className="mt-2 text-xs text-white/60">
                              {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : ''}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          ref={contentRef}
          className="mx-auto w-full max-w-6xl"
          style={{ paddingTop: `${topOffset}px`, paddingBottom: '4rem' }}
        >
          <div>
            <div className="mb-10 text-center">
              <h1 className="whitespace-nowrap text-2xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                Que bom te ver, {firstName}.
              </h1>
              <p className="mt-4 text-lg text-slate-500 md:text-xl">
                {selectedEmpreendimentoId ? 'Como posso ajudar?' : 'Selecione um contexto para abrir o chat.'}
              </p>
            </div>

            <div className="mb-6 rounded-[2rem] border border-white/15 bg-white/8 p-4 shadow-soft md:p-5">
              <label className="mb-3 block text-sm font-semibold uppercase tracking-[0.24em] text-white/65">
                Contexto da conversa
              </label>
              <div className="flex flex-wrap gap-3">
                {empreendimentos.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/65">
                    Nenhum empreendimento disponível.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmpreendimentoId(INSTITUCIONAL_CONTEXT_ID)
                    window.localStorage.setItem('iaHub.selectedEmpreendimentoId', INSTITUCIONAL_CONTEXT_ID)
                    setChat([])
                    setMessage('')
                  }}
                  className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition md:text-base ${
                    institucionalSelected
                      ? 'border-white/45 bg-white/20 text-white'
                      : 'border-white/15 bg-white/10 text-white/90 hover:bg-white/16'
                  }`}
                >
                  Institucional da empresa
                </button>

                {empreendimentos.map((item) => {
                  const isActive = String(item.id) === selectedEmpreendimentoId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmpreendimentoId(String(item.id))
                        window.localStorage.setItem('iaHub.selectedEmpreendimentoId', String(item.id))
                        setChat([])
                        setMessage('')
                      }}
                      className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition md:text-base ${
                        isActive
                          ? 'border-white/45 bg-white/20 text-white'
                          : 'border-white/15 bg-white/10 text-white/90 hover:bg-white/16'
                      }`}
                    >
                      {item.nome}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-6 rounded-[2rem] border border-white/15 bg-white/8 p-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Contexto ativo</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {institucionalSelected ? 'Institucional da empresa' : selectedEmpreendimento?.nome || 'Nenhum contexto selecionado'}
              </h2>
              <p className="mt-3 leading-7 text-white/70">
                {institucionalSelected
                  ? 'Neste modo, a IA fala apenas sobre estratégia comercial e posicionamento institucional da construtora. Se você quiser respostas mais orientadas por dados, selecione um empreendimento.'
                  : selectedEmpreendimento
                    ? 'Toda resposta da IA será guiada pelos dados comerciais deste empreendimento.'
                    : 'Selecione um empreendimento ou o contexto institucional antes de iniciar a conversa.'}
              </p>
            </div>

            {chat.length > 0 && (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={exportConversationPdf}
                  className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/14"
                >
                  Exportar PDF
                </button>
              </div>
            )}

            {chat.length > 0 && (
              <div className="mb-6 space-y-4">
                {chat.map((entry) => (
                  <div
                  key={entry.id}
                  className={`rounded-[1.75rem] border px-5 py-4 shadow-sm ${
                    entry.role === 'user'
                      ? 'ml-auto max-w-4xl border-white/15 bg-white/12'
                      : 'max-w-5xl border-white/12 bg-white/8'
                  }`}
                >
                    <p className={`mb-2 text-sm font-semibold ${entry.role === 'user' ? 'text-white' : 'text-white/70'}`}>
                      {entry.role === 'user' ? 'Você' : 'IA HUB'}
                    </p>
                    {entry.role === 'assistant' ? (
                      <div className="text-base text-white md:text-lg">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {entry.text || ''}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line text-base leading-8 text-white md:text-lg md:leading-9">{entry.text}</p>
                    )}
                    {entry.typing && (
                      <span className="mt-1 inline-block text-xl leading-none text-white/70">
                        |
                      </span>
                    )}

                    {entry.role === 'assistant' && entry.text && !entry.typing && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => copyAssistantText(entry.text)}
                          className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/16"
                        >
                          Copiar resposta
                        </button>
                      </div>
                    )}

                    {entry.usage && (
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/75 md:text-sm">
                        <span className="rounded-full bg-white/10 px-3 py-1">
                          tokens: {entry.usage.tokensUsados}
                        </span>
                        <span className="rounded-full bg-white/10 px-3 py-1">
                          perguntas no mês: {entry.usage.totalPerguntasMes}/{entry.usage.limitePerguntasMes}
                        </span>
                        <span className="rounded-full bg-white/10 px-3 py-1">
                          tokens no mês: {entry.usage.totalTokensMes}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-[2rem] border border-white/15 bg-white/8 p-4 shadow-soft md:p-5">
              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={selectedEmpreendimentoId ? 'Digite sua pergunta comercial...' : 'Selecione um contexto para começar'}
                  rows={1}
                  disabled={!selectedEmpreendimentoId}
                  className="min-h-[36px] w-full resize-none overflow-hidden bg-transparent text-lg text-white placeholder:text-white/55 focus:outline-none md:text-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!selectedEmpreendimentoId || loading}
                  className="shrink-0 rounded-2xl bg-white/14 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/20 md:text-lg"
                >
                  {loading ? 'Consultando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}
