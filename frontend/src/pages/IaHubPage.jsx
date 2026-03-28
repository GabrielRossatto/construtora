import { useEffect, useRef, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'

const SALES_ASSISTANT_MODE = import.meta.env.VITE_AI_ASSISTANT_MODE === 'sales'
const SALES_MEMORY_PREFIX = 'hub_ai_sales_memory_v1'

const SUGGESTED_PROMPTS = [
  'Cliente quer algo até 500 mil, com 2 quartos.',
  'Procuro empreendimento para família, com lazer e segurança.',
  'O cliente quer ticket alto, acabamento premium e boa localização.',
  'Me mostre opções compactas para investidor.'
]

const STOPWORDS = new Set([
  'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos',
  'e', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem', 'que', 'cliente',
  'quer', 'procuro', 'precisa', 'algo', 'opcao', 'opções', 'opcoes', 'mostrar', 'mostre',
  'busco', 'gostaria', 'preciso', 'me', 'ate', 'até'
])

function normalizeText(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function extractBudget(text) {
  const normalized = normalizeText(text).replace(/\s+/g, ' ')
  const currencyMatch = normalized.match(/(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(mil|milhao|milhoes|mi|m)?/)
  if (!currencyMatch) return null

  const rawValue = currencyMatch[1].replace(/\./g, '').replace(',', '.')
  let numeric = Number(rawValue)
  if (!Number.isFinite(numeric)) return null

  const suffix = currencyMatch[2]
  if (suffix === 'mil') numeric *= 1_000
  if (suffix === 'mi' || suffix === 'milhao' || suffix === 'milhoes' || suffix === 'm') numeric *= 1_000_000

  if (!suffix && numeric < 10_000) {
    const budgetHint = normalized.match(/ate|até|faixa|orcamento|orçamento|ticket|valor|preco|preço/)
    if (budgetHint) numeric *= 1_000
  }

  return Math.round(numeric)
}

function extractBedroomCount(text) {
  const normalized = normalizeText(text)
  const match = normalized.match(/(\d+)\s*(quartos?|dormitorios?|suites?)/)
  return match ? Number(match[1]) : null
}

function extractArea(text) {
  const normalized = normalizeText(text)
  const match = normalized.match(/(\d+)\s*m(?:2|²)/)
  return match ? Number(match[1]) : null
}

function extractKeywords(text) {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
}

function dedupeList(values) {
  return [...new Set(values)]
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(value)
}

function getMemoryStorageKey(user) {
  return `${SALES_MEMORY_PREFIX}:${user?.empresaId || 'global'}`
}

function createEmptyMemory() {
  return {
    keywords: {},
    bedrooms: {},
    budgets: {},
    areas: {}
  }
}

function incrementCounter(counter, key) {
  if (!key) return counter
  return {
    ...counter,
    [key]: (counter[key] || 0) + 1
  }
}

function budgetBand(value) {
  if (!value) return null
  if (value <= 300000) return 'ate-300'
  if (value <= 500000) return '300-500'
  if (value <= 800000) return '500-800'
  return '800-plus'
}

function areaBand(value) {
  if (!value) return null
  if (value <= 50) return 'ate-50'
  if (value <= 80) return '50-80'
  if (value <= 120) return '80-120'
  return '120-plus'
}

function getTopEntry(counter) {
  return Object.entries(counter || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null
}

function getTopKeywords(memory, limit = 3) {
  return Object.entries(memory?.keywords || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword]) => keyword)
}

function learnFromConversation(memory, query) {
  const next = {
    keywords: { ...(memory?.keywords || {}) },
    bedrooms: { ...(memory?.bedrooms || {}) },
    budgets: { ...(memory?.budgets || {}) },
    areas: { ...(memory?.areas || {}) }
  }

  query.keywords.forEach((keyword) => {
    next.keywords = incrementCounter(next.keywords, keyword)
  })

  if (query.bedrooms) next.bedrooms = incrementCounter(next.bedrooms, String(query.bedrooms))
  if (query.maxBudget) next.budgets = incrementCounter(next.budgets, budgetBand(query.maxBudget))
  if (query.area) next.areas = incrementCounter(next.areas, areaBand(query.area))

  return next
}

function budgetMatchesBand(value, band) {
  if (!value || !band) return false
  if (band === 'ate-300') return value <= 300000
  if (band === '300-500') return value > 300000 && value <= 500000
  if (band === '500-800') return value > 500000 && value <= 800000
  if (band === '800-plus') return value > 800000
  return false
}

function areaMatchesBand(value, band) {
  if (!value || !band) return false
  if (band === 'ate-50') return value <= 50
  if (band === '50-80') return value > 50 && value <= 80
  if (band === '80-120') return value > 80 && value <= 120
  if (band === '120-plus') return value > 120
  return false
}

function parseEmpreendimentoFacts(item) {
  const haystack = `${item.nome} ${item.descricao || ''}`
  return {
    budget: extractBudget(haystack),
    bedrooms: extractBedroomCount(haystack),
    area: extractArea(haystack)
  }
}

function scoreEmpreendimento(item, query, memory) {
  const haystack = normalizeText(`${item.nome} ${item.descricao || ''}`)
  const reasons = []
  let score = 0

  for (const keyword of query.keywords) {
    if (haystack.includes(keyword)) {
      score += 2
      reasons.push(`combina com "${keyword}"`)
    }
  }

  const facts = parseEmpreendimentoFacts(item)
  const learnedKeywords = getTopKeywords(memory)
  const learnedBedroom = getTopEntry(memory?.bedrooms)
  const learnedBudget = getTopEntry(memory?.budgets)
  const learnedArea = getTopEntry(memory?.areas)

  if (query.maxBudget && facts.budget) {
    if (facts.budget <= query.maxBudget) {
      score += 5
      reasons.push(`valor estimado em ${formatCurrency(facts.budget)} dentro do orçamento`)
    } else {
      score -= 4
      reasons.push(`valor estimado em ${formatCurrency(facts.budget)} acima do orçamento`)
    }
  }

  if (query.bedrooms && facts.bedrooms) {
    if (facts.bedrooms >= query.bedrooms) {
      score += 4
      reasons.push(`${facts.bedrooms} quartos, atendendo a necessidade`)
    } else {
      score -= 2
      reasons.push(`tem ${facts.bedrooms} quartos, abaixo do pedido`)
    }
  }

  if (query.area && facts.area) {
    if (facts.area >= query.area) {
      score += 3
      reasons.push(`metragem de ${facts.area} m² atende o pedido`)
    } else {
      score -= 1
      reasons.push(`metragem de ${facts.area} m² pode ficar abaixo do esperado`)
    }
  }

  if (!query.maxBudget && learnedBudget && facts.budget && budgetMatchesBand(facts.budget, learnedBudget)) {
    score += 1
    reasons.push('alinhado ao histórico recente de orçamento buscado')
  }

  if (!query.bedrooms && learnedBedroom && facts.bedrooms && facts.bedrooms >= Number(learnedBedroom)) {
    score += 1
    reasons.push('alinhado ao padrão de quartos mais consultado')
  }

  if (!query.area && learnedArea && facts.area && areaMatchesBand(facts.area, learnedArea)) {
    score += 1
    reasons.push('alinhado à metragem mais buscada recentemente')
  }

  for (const keyword of learnedKeywords) {
    if (!query.keywords.includes(keyword) && haystack.includes(keyword)) {
      score += 0.75
      reasons.push(`conversa anterior da equipe indica interesse em "${keyword}"`)
    }
  }

  if (!query.keywords.length && !query.maxBudget && !query.bedrooms && !query.area) {
    score += 1
    reasons.push('sem filtros específicos, mostrando opção geral')
  }

  return {
    ...item,
    score,
    reasons: dedupeList(reasons),
    facts
  }
}

function describeQuery(query) {
  const parts = []
  if (query.maxBudget) parts.push(`orçamento até ${formatCurrency(query.maxBudget)}`)
  if (query.bedrooms) parts.push(`${query.bedrooms}+ quartos`)
  if (query.area) parts.push(`${query.area}+ m²`)
  if (query.keywords.length) parts.push(`perfil: ${query.keywords.join(', ')}`)
  return parts
}

function describeMemory(memory) {
  const parts = []
  const keywords = getTopKeywords(memory, 2)
  const bedrooms = getTopEntry(memory?.bedrooms)
  if (keywords.length) parts.push(`histórico recente em ${keywords.join(', ')}`)
  if (bedrooms) parts.push(`preferência recorrente por ${bedrooms}+ quartos`)
  return parts
}

function mergeQuery(previousQuery, currentQuery) {
  return {
    maxBudget: currentQuery.maxBudget ?? previousQuery?.maxBudget ?? null,
    bedrooms: currentQuery.bedrooms ?? previousQuery?.bedrooms ?? null,
    area: currentQuery.area ?? previousQuery?.area ?? null,
    keywords: dedupeList([...(previousQuery?.keywords || []), ...currentQuery.keywords])
  }
}

function buildAssistantReply(items, input, previousQuery, memory) {
  const currentQuery = {
    keywords: extractKeywords(input),
    maxBudget: extractBudget(input),
    bedrooms: extractBedroomCount(input),
    area: extractArea(input)
  }
  const query = mergeQuery(previousQuery, currentQuery)

  const ranked = items
    .map((item) => scoreEmpreendimento(item, query, memory))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 3)

  const queryDescription = describeQuery(query)
  const memoryDescription = describeMemory(memory)

  if (ranked.length === 0) {
    return {
      text: queryDescription.length > 0
        ? `Entendi. Considerei ${queryDescription.join(', ')}, mas não encontrei um match claro com os dados atuais.\n\nSe quiser, refine com localização, faixa de preço, quartos, metragem ou perfil do cliente para eu filtrar melhor.`
        : 'Ainda não consegui identificar filtros suficientes para sugerir um empreendimento.\n\nMe diga, por exemplo: orçamento, quantidade de quartos, metragem, localização ou perfil do cliente.',
      matches: [],
      query
    }
  }

  const intro = queryDescription.length > 0
    ? `Perfeito. Considerei ${queryDescription.join(', ')}.`
    : 'Perfeito. Separei as opções com melhor aderência ao que você descreveu.'

  const learnedContext = memoryDescription.length > 0
    ? ` Também considerei ${memoryDescription.join(' e ')}.`
    : ''

  const text = `${intro}${learnedContext}\n\nEncontrei ${ranked.length} empreendimento(s) com maior aderência para apresentar ao cliente.`

  return { text, matches: ranked, query }
}

export default function IaHubPage() {
  const { user, token } = useAuth()
  const [message, setMessage] = useState('')
  const [topOffset, setTopOffset] = useState(0)
  const [chat, setChat] = useState([])
  const [empreendimentos, setEmpreendimentos] = useState([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [lastQuery, setLastQuery] = useState(null)
  const [assistantMemory, setAssistantMemory] = useState(createEmptyMemory())
  const sectionRef = useRef(null)
  const contentRef = useRef(null)
  const textareaRef = useRef(null)
  const firstName = (user?.nome || 'usuário').trim().split(' ')[0]

  useEffect(() => {
    if (!SALES_ASSISTANT_MODE) return
    hubService.empreendimentos(token).then(setEmpreendimentos).catch(() => setEmpreendimentos([]))
  }, [token])

  useEffect(() => {
    if (!SALES_ASSISTANT_MODE) return
    try {
      const raw = localStorage.getItem(getMemoryStorageKey(user))
      setAssistantMemory(raw ? JSON.parse(raw) : createEmptyMemory())
    } catch {
      setAssistantMemory(createEmptyMemory())
    }
  }, [user])

  useEffect(() => {
    if (!SALES_ASSISTANT_MODE) return
    localStorage.setItem(getMemoryStorageKey(user), JSON.stringify(assistantMemory))
  }, [assistantMemory, user])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [message])

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

  function sendMessage(prefilledMessage = message) {
    const content = prefilledMessage.trim()
    if (!content || loadingMatches) return

    setLoadingMatches(true)

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: content
    }

    const reply = SALES_ASSISTANT_MODE
      ? buildAssistantReply(empreendimentos, content, lastQuery, assistantMemory)
      : { text: 'A IA do ambiente principal ainda não está configurada para responder automaticamente.', matches: [] }

    const assistantMessage = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      text: reply.text,
      matches: reply.matches
    }

    setChat((current) => [...current, userMessage, assistantMessage])
    if (reply.query) setLastQuery(reply.query)
    if (reply.query && SALES_ASSISTANT_MODE) {
      setAssistantMemory((current) => learnFromConversation(current, reply.query))
    }
    setMessage('')
    setLoadingMatches(false)
  }

  return (
    <AppLayout>
      <section
        ref={sectionRef}
        className="min-h-[calc(100vh-3.5rem)] px-4"
      >
        <div
          ref={contentRef}
          className="w-full max-w-4xl mx-auto"
          style={{ paddingTop: `${topOffset}px`, paddingBottom: '4rem' }}
        >
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-slate-900 whitespace-nowrap">
              Que bom te ver, {firstName}.
            </h1>
            <p className="mt-4 text-lg md:text-xl text-slate-500">
              {SALES_ASSISTANT_MODE ? 'Como posso ajudar a encontrar a melhor opção para o cliente?' : 'Como posso ajudar?'}
            </p>
            {SALES_ASSISTANT_MODE && (
              <p className="mt-3 text-sm md:text-base text-slate-500 max-w-2xl mx-auto">
                No ambiente de teste, a IA analisa nome e descrição dos empreendimentos para sugerir quais combinam melhor com orçamento, quartos, metragem e perfil de compra, aprendendo com o histórico recente das conversas.
              </p>
            )}
          </div>

          {SALES_ASSISTANT_MODE && chat.length === 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setMessage(prompt)
                    requestAnimationFrame(() => textareaRef.current?.focus())
                  }}
                  className="rounded-full border border-slate-200 bg-pageSurface px-4 py-2 text-sm md:text-base text-slate-700 hover:border-hubBlue hover:text-hubBlue transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {chat.length > 0 && (
            <div className="space-y-4 mb-6">
              {chat.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-[1.75rem] border px-5 py-4 shadow-sm ${
                    entry.role === 'user'
                      ? 'ml-auto max-w-2xl border-hubBlue/20 bg-sky-50'
                      : 'max-w-3xl border-slate-200 bg-pageSurface'
                  }`}
                >
                  <p className={`text-sm font-semibold mb-2 ${entry.role === 'user' ? 'text-hubBlueDeep' : 'text-slate-500'}`}>
                    {entry.role === 'user' ? 'Você' : 'IA HUB Teste'}
                  </p>
                  <p className="whitespace-pre-line text-base md:text-lg text-slate-800">{entry.text}</p>

                  {entry.role === 'assistant' && entry.matches?.length > 0 && (
                    <div className="grid gap-3 mt-4">
                      {entry.matches.map((match) => (
                        <article key={match.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900">{match.nome}</h3>
                              <p className="mt-1 text-sm text-slate-600 line-clamp-3">{match.descricao}</p>
                            </div>
                            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-hubBlueDeep">
                              score {match.score}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {match.facts.budget && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                                {formatCurrency(match.facts.budget)}
                              </span>
                            )}
                            {match.facts.bedrooms && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                                {match.facts.bedrooms} quartos
                              </span>
                            )}
                            {match.facts.area && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                                {match.facts.area} m²
                              </span>
                            )}
                          </div>
                          <ul className="mt-3 space-y-1 text-sm text-slate-600">
                            {match.reasons.slice(0, 3).map((reason) => (
                              <li key={reason}>• {reason}</li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-pageSurface shadow-soft p-4 md:p-5">
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={SALES_ASSISTANT_MODE ? 'Ex.: cliente busca até 650 mil, com 3 quartos e lazer completo.' : 'Digite sua mensagem...'}
                rows={1}
                className="w-full resize-none overflow-hidden bg-transparent text-lg md:text-xl text-slate-800 placeholder:text-slate-400 focus:outline-none min-h-[36px]"
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
                className="shrink-0 rounded-2xl bg-hubBlueDeep px-5 py-3 text-base md:text-lg font-semibold text-white transition hover:opacity-95"
              >
                {loadingMatches ? 'Buscando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}
