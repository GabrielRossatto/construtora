import { useEffect, useRef, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'

const fotos = [
  'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=800',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
  'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=800'
]

export default function EmpreendimentosPage() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const carouselRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

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

  return (
    <AppLayout title="Empreendimentos" action={<span className="text-4xl font-semibold">Novo ＋</span>}>
      <section className="relative mb-2">
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
          className="flex gap-4 overflow-x-auto pb-1 px-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, idx) => (
            <article key={item.id} className="pill-card rounded-3xl pt-3 px-3 pb-0 text-center w-[320px] shrink-0">
              <img src={item.fotoPerfilUrl || fotos[idx % fotos.length]} alt={item.nome} className="rounded-3xl w-full h-[440px] object-cover" />
              <h3 className="text-3xl font-semibold mt-2 leading-tight">{item.nome}</h3>
              <button
                className="bg-hubBlueDeep text-white px-4 py-1 rounded-xl text-xl mt-1 mb-0 leading-none inline-flex items-center"
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

      <div className="pill-card rounded-3xl p-5 text-4xl font-bold">Tabelas de Vendas</div>
    </AppLayout>
  )
}
