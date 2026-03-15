import { useEffect, useRef, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'
import semImagemEmpreendimento from '../assets/sem-imagem-empreendimento.svg'

export default function EmpreendimentosPage() {
  const { token, hasPermission } = useAuth()
  const canManageDevelopments = hasPermission('CREATE_DEVELOPMENT')
  const [items, setItems] = useState([])
  const carouselRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    hubService.empreendimentos(token).then(setItems).catch(() => {})
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

  return (
    <AppLayout title="Empreendimentos" action={<span className="text-4xl font-semibold">Novo ＋</span>}>
      <section className="relative mb-0">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-gradient-to-br from-white to-sky-100 text-hubBlueDeep shadow-soft border border-white/80 text-2xl"
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
            <article key={item.id} className="pill-card relative rounded-3xl pt-3 px-3 pb-2 text-center w-[320px] shrink-0">
              {canManageDevelopments && (
                <button
                  type="button"
                  aria-label={`Excluir ${item.nome}`}
                  onClick={() => setItemToDelete(item)}
                  className="absolute right-4 top-4 z-10 h-9 w-9 rounded-full bg-white/85 text-slate-700 shadow-md grid place-items-center transition-transform duration-100 ease-in-out hover:scale-110"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              )}
              <img src={item.fotoPerfilUrl || semImagemEmpreendimento} alt={item.nome} className="rounded-3xl w-full h-[450px] object-cover" />
              <h3 className="text-[1.35rem] font-semibold mt-2 leading-6 h-12 line-clamp-2 overflow-hidden break-words">{item.nome}</h3>
              <button
                className="bg-hubBlueDeep text-white px-4 py-1 rounded-xl text-xl mt-2 mb-1 leading-none inline-flex items-center"
                onClick={() => window.open(`${window.location.origin}/public/materiais/${item.publicToken}`, '_blank', 'noopener,noreferrer')}
              >
                Consultar material
              </button>
            </article>
          ))}
        </div>

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-gradient-to-br from-white to-sky-100 text-hubBlueDeep shadow-soft border border-white/80 text-2xl"
            aria-label="Ver próximos empreendimentos"
          >
            ›
          </button>
        )}
      </section>

      <div className="pill-card rounded-3xl p-5 text-4xl font-bold mt-[30px]">Tabelas de Vendas</div>

      {canManageDevelopments && itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Deseja mesmo excluir este empreendimento?</h2>
            <p className="text-sm text-slate-600 mb-6 line-clamp-2">{itemToDelete.nome}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-red-600 text-white text-base font-medium hover:bg-red-700 disabled:opacity-70"
              >
                {isDeleting ? 'Excluindo...' : 'Sim'}
              </button>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-hubBlueDeep text-white text-base font-semibold hover:opacity-95 disabled:opacity-70"
              >
                Não
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
