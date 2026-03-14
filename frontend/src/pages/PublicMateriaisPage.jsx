import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { hubService } from '../services/hubService'

export default function PublicMateriaisPage() {
  const { publicToken } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!publicToken) return
    hubService.publicMateriais(publicToken)
      .then(setData)
      .catch((e) => setError(e.message || 'Link inválido'))
  }, [publicToken])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center rounded-3xl p-10 bg-white shadow-soft border border-slate-200">
          <h1 className="text-3xl font-bold mb-2 text-slate-900">Material indisponível</h1>
          <p className="text-lg text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-xl text-slate-700">Carregando apresentação...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        <header className="rounded-3xl p-7 md:p-10 mb-6 bg-gradient-to-r from-hubBlueDeep via-hubBlue to-sky-500 text-white shadow-soft">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-white/80">Apresentacao Comercial</p>
              <h1 className="text-4xl md:text-5xl font-semibold mt-2">{data.empreendimentoNome}</h1>
              <p className="text-base md:text-lg mt-3 text-white/90 max-w-2xl">
                Acesse conteudos oficiais deste empreendimento: campanhas ativas, materiais de apoio e arquivos de divulgacao.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <StatChip label="Materiais" value={data.materiais.length} />
                <StatChip label="Campanhas" value={data.campanhas?.length || 0} />
              </div>
            </div>
            <div className="justify-self-end w-full max-w-md">
              {data.fotoPerfilUrl ? (
                <img
                  src={data.fotoPerfilUrl}
                  alt={data.empreendimentoNome}
                  className="w-full h-64 object-cover rounded-2xl border border-white/30 shadow-soft"
                />
              ) : (
                <div className="w-full h-64 rounded-2xl bg-white/10 border border-white/30 grid place-items-center text-white/80">
                  Sem foto de capa
                </div>
              )}
            </div>
          </div>
        </header>

        {(data.campanhas?.length || 0) > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">Campanhas Relacionadas</h2>
              <span className="text-sm text-slate-500">{data.campanhas.length} campanha(s)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.campanhas.map((c) => (
                <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-hubBlue">Campanha</p>
                  <h3 className="text-xl font-semibold text-slate-900 mt-1">{c.titulo}</h3>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-3">{c.descricao}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(c.dataCriacao).toLocaleDateString('pt-BR')}</span>
                    <span>{c.quantidadeMateriais} materiais</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">Materiais Disponiveis</h2>
            <span className="text-sm text-slate-500">{data.materiais.length} arquivo(s)</span>
          </div>

          {data.materiais.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
              Nenhum material publicado ate o momento.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.materiais.map((m) => (
              <article key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-slate-900">{m.titulo}</h3>
                  <span className="text-xs bg-sky-100 text-sky-700 rounded-full px-3 py-1 font-medium">
                    {m.tipoArquivo}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-4 line-clamp-4">{m.descricao}</p>
                <div className="text-xs text-slate-500 mb-4">
                  Enviado em {new Date(m.dataUpload).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={m.arquivoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center bg-hubBlueDeep text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-95 transition"
                  >
                    Abrir material
                  </a>
                  <a
                    href={m.arquivoUrl}
                    download
                    className="inline-flex items-center bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
                  >
                    Baixar
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-10 pb-4 text-center text-xs text-slate-500">
          Conteudo oficial compartilhado via Commercial HUB
        </footer>
      </div>
    </div>
  )
}

function StatChip({ label, value }) {
  return (
    <div className="rounded-full bg-white/15 border border-white/30 px-4 py-2 backdrop-blur-sm">
      <span className="text-white/80 text-xs uppercase tracking-wide">{label}</span>
      <span className="ml-2 text-white font-semibold">{value}</span>
    </div>
  )
}
