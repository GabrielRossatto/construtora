import { useEffect, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'

export default function CampanhasPage() {
  const { token } = useAuth()
  const [campanhas, setCampanhas] = useState([])
  const [materiais, setMateriais] = useState([])
  const [form, setForm] = useState({ titulo: '', descricao: '', materialIds: [] })

  async function carregar() {
    const [c, m] = await Promise.all([hubService.campanhas(token), hubService.materiais(token)])
    setCampanhas(c)
    setMateriais(m)
  }

  useEffect(() => { carregar().catch(() => {}) }, [])

  async function submit(e) {
    e.preventDefault()
    await hubService.criarCampanha(token, form)
    setForm({ titulo: '', descricao: '', materialIds: [] })
    await carregar()
  }

  function toggleMaterial(id) {
    setForm((f) => ({
      ...f,
      materialIds: f.materialIds.includes(id) ? f.materialIds.filter((x) => x !== id) : [...f.materialIds, id]
    }))
  }

  return (
    <AppLayout title="Campanhas">
      <section className="pill-card rounded-3xl p-6 mb-7">
        <h2 className="text-4xl font-semibold mb-4">Nova campanha</h2>
        <form className="space-y-3" onSubmit={submit}>
          <input className="input-hub w-full rounded-xl p-3 text-xl" placeholder="Título" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
          <textarea className="input-hub w-full rounded-xl p-3 text-xl min-h-24" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          <div className="flex flex-wrap gap-2 text-lg">
            {materiais.map((m) => (
              <button type="button" key={m.id} className={`px-3 py-1 rounded-full border ${form.materialIds.includes(m.id) ? 'bg-hubBlueDeep text-white' : 'bg-white/70'}`} onClick={() => toggleMaterial(m.id)}>
                {m.titulo}
              </button>
            ))}
          </div>
          <button className="bg-hubBlueDeep text-white rounded-xl px-4 py-2 text-xl">Criar campanha</button>
        </form>
      </section>

      <section className="pill-card rounded-3xl p-6 text-xl space-y-3">
        {campanhas.map((c) => (
          <div key={c.id} className="border border-white/70 rounded-xl px-3 py-3 flex justify-between">
            <span>{c.titulo}</span>
            <span>{new Date(c.dataCriacao).toLocaleString('pt-BR')}</span>
          </div>
        ))}
      </section>
    </AppLayout>
  )
}
