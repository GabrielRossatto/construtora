import { useEffect, useRef, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'

export default function IaHubPage() {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [topOffset, setTopOffset] = useState(0)
  const sectionRef = useRef(null)
  const contentRef = useRef(null)
  const textareaRef = useRef(null)
  const firstName = (user?.nome || 'usuário').trim().split(' ')[0]

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [message])

  useEffect(() => {
    function centerContent() {
      if (!sectionRef.current || !contentRef.current || message.trim()) return
      const sectionHeight = sectionRef.current.clientHeight
      const contentHeight = contentRef.current.offsetHeight
      setTopOffset(Math.max(32, Math.round((sectionHeight - contentHeight) / 2)))
    }

    centerContent()
    window.addEventListener('resize', centerContent)

    return () => window.removeEventListener('resize', centerContent)
  }, [message])

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
              Como posso ajudar?
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-pageSurface shadow-soft p-4 md:p-5">
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={1}
                className="w-full resize-none overflow-hidden bg-transparent text-lg md:text-xl text-slate-800 placeholder:text-slate-400 focus:outline-none min-h-[36px]"
              />
              <button
                type="button"
                className="shrink-0 rounded-2xl bg-hubBlueDeep px-5 py-3 text-base md:text-lg font-semibold text-white transition hover:opacity-95"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}
