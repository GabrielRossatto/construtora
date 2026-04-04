import { useEffect, useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { hubService } from '../services/hubService'
import { useToast } from '../hooks/useToast'

const API_URL = import.meta.env.VITE_API_URL || ''

function getInstitucionalFolderName(item) {
  const explicitFolder = item?.pastaDestino?.trim()
  if (explicitFolder) return explicitFolder

  const relativePath = item?.caminhoRelativo?.trim()
  if (relativePath && relativePath.includes('/')) {
    return relativePath.split('/')[0]
  }

  return ''
}

export default function InstitucionalPage() {
  const { token, hasPermission } = useAuth()
  const toast = useToast()
  const canManageInstitucional = hasPermission('CREATE_MATERIAL')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState(null)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null)
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [openFolders, setOpenFolders] = useState({})

  useEffect(() => {
    hubService.institucional(token)
      .then((data) => setItems(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  async function baixarArquivo(item) {
    const response = await fetch(`${API_URL}/api/institucional/${item.id}/download`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Não foi possível baixar o arquivo')
    }

    const blob = await response.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const disposition = response.headers.get('Content-Disposition') || ''
    const matchedName = disposition.match(/filename="(.+)"/)

    anchor.href = objectUrl
    anchor.download = matchedName?.[1] || item.titulo || 'arquivo-institucional'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.URL.revokeObjectURL(objectUrl)
  }

  async function submitEdit(e) {
    e.preventDefault()
    if (!editingItem || savingEdit) return
    try {
      if (!editingItem.titulo.trim()) {
        throw new Error('Preencha o título do item institucional.')
      }
      if (!editingItem.arquivo && !editingItem.link.trim()) {
        const currentItem = items.find((item) => item.id === editingItem.id)
        if (!currentItem?.arquivoUrl) {
          throw new Error('Informe um arquivo ou um link para o item institucional.')
        }
      }

      setSavingEdit(true)
      const updated = await hubService.atualizarInstitucionalArquivo(
        token,
        editingItem.id,
        {
          titulo: editingItem.titulo,
          pastaDestino: editingItem.pastaDestino,
          caminhoRelativo: editingItem.caminhoRelativo,
          link: editingItem.link
        },
        editingItem.arquivo
      )
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setEditingItem(null)
      toast.success('Item institucional atualizado com sucesso.')
    } catch (error) {
      toast.error(error.message || 'Não foi possível atualizar o item institucional')
    } finally {
      setSavingEdit(false)
    }
  }

  async function deleteItem(item) {
    if (deletingId) return
    try {
      setDeletingId(item.id)
      await hubService.excluirInstitucionalArquivo(token, item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      setConfirmDeleteItem(null)
      toast.success('Item institucional excluído com sucesso.')
    } catch (error) {
      toast.error(error.message || 'Não foi possível excluir o item institucional')
    } finally {
      setDeletingId(null)
    }
  }

  async function deleteFolder(folderName) {
    if (!folderName || deletingId) return
    try {
      setDeletingId(folderName)
      await hubService.excluirInstitucionalPasta(token, folderName)
      setItems((current) => current.filter((entry) => getInstitucionalFolderName(entry) !== folderName))
      setConfirmDeleteFolder(null)
      toast.success('Pasta institucional excluída com sucesso.')
    } catch (error) {
      toast.error(error.message || 'Não foi possível excluir a pasta institucional')
    } finally {
      setDeletingId(null)
    }
  }

  function toggleFolder(folderName) {
    setOpenFolders((current) => ({
      ...current,
      [folderName]: !current[folderName]
    }))
  }

  const foldersMap = items.reduce((groups, item) => {
    const folderName = getInstitucionalFolderName(item)
    if (!folderName) {
      return groups
    }
    groups[folderName] = groups[folderName] || []
    groups[folderName].push(item)
    return groups
  }, {})
  const folders = Object.entries(foldersMap)
  const looseItems = items.filter((item) => !getInstitucionalFolderName(item))

  return (
    <AppLayout title="Institucional">
      {!canManageInstitucional && (
        <section className="mb-6 rounded-3xl border border-white/15 bg-[#2b2b2b] p-5 text-white/75">
          Visualização em modo leitura. Para editar a área institucional, este usuário precisa da permissão
          <span className="font-semibold text-white"> Cadastrar materiais</span>.
        </section>
      )}
      {loading ? (
        <section className="rounded-3xl border border-white/15 bg-[#2b2b2b] p-8 text-white/70">Carregando...</section>
      ) : items.length === 0 ? (
        <section className="rounded-3xl border border-white/15 bg-[#2b2b2b] p-8 text-white/75">
          Nenhum arquivo institucional cadastrado ainda.
        </section>
      ) : (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {folders.map(([folderName, folderItems]) => (
            <article key={folderName} className="relative rounded-3xl border border-white/15 bg-[#2b2b2b] p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Institucional</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">{folderName}</h2>
              <p className="mt-4 text-sm uppercase tracking-[0.18em] text-white/55">{folderItems.length} arquivo(s)</p>
              <div className="mt-8">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => toggleFolder(folderName)}
                    className="inline-flex items-center rounded-full border border-white/15 bg-white/14 px-5 py-3 text-sm font-semibold text-white shadow-none"
                  >
                    {openFolders[folderName] ? 'Fechar pasta' : 'Expandir pasta'}
                  </button>
                  {canManageInstitucional && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteFolder(folderName)}
                      className="inline-flex items-center rounded-full border border-red-500/30 bg-red-600/20 px-5 py-3 text-sm font-semibold text-white shadow-none"
                    >
                      Excluir pasta
                    </button>
                  )}
                </div>
              </div>
              {openFolders[folderName] && (
                <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
                  {folderItems.map((item) => (
                    <InstitucionalItemCard
                      key={item.id}
                      item={item}
                      canManageInstitucional={canManageInstitucional}
                      deletingId={deletingId}
                      setEditingItem={setEditingItem}
                      setConfirmDeleteItem={setConfirmDeleteItem}
                      baixarArquivo={baixarArquivo}
                      toast={toast}
                    />
                  ))}
                </div>
              )}
            </article>
          ))}

          {looseItems.map((item) => (
            <article key={item.id} className="relative rounded-3xl border border-white/15 bg-[#2b2b2b] p-8 text-white">
              {canManageInstitucional && (
                <div className="absolute right-5 top-5 z-10 flex gap-2">
                  <button
                    type="button"
                    aria-label={`Editar ${item.titulo}`}
                    onClick={() => setEditingItem({ id: item.id, titulo: item.titulo || '', pastaDestino: item.pastaDestino || '', caminhoRelativo: item.caminhoRelativo || '', link: item.link || '', arquivo: null })}
                    className="h-9 w-9 rounded-full bg-white text-black shadow-md grid place-items-center transition-transform duration-100 ease-in-out hover:scale-110"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
                      <path d="m12 6 4 4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir ${item.titulo}`}
                    onClick={() => setConfirmDeleteItem(item)}
                    disabled={deletingId === item.id}
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
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Institucional</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {item.titulo}
              </h2>
              <p className="mt-4 text-sm uppercase tracking-[0.18em] text-white/55">
                {new Date(item.dataCriacao).toLocaleDateString('pt-BR')}
              </p>
              <div className="mt-8">
                <div className="flex flex-wrap gap-3">
                  {item.arquivoUrl && (
                    <>
                      <a
                        href={item.arquivoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full border border-white/15 bg-white/14 px-5 py-3 text-sm font-semibold text-white shadow-none"
                      >
                        Abrir arquivo
                      </a>
                      <button
                        type="button"
                        onClick={() => baixarArquivo(item).catch((error) => toast.error(error.message || 'Não foi possível baixar o arquivo'))}
                        className="inline-flex items-center rounded-full border border-white/15 bg-black/25 px-5 py-3 text-sm font-semibold text-white shadow-none"
                      >
                        Baixar arquivo
                      </button>
                    </>
                  )}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-white/15 bg-white/14 px-5 py-3 text-sm font-semibold text-white shadow-none"
                    >
                      Abrir link
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/12 bg-[#2b2b2b] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Editar item institucional</h2>
                <p className="mt-1 text-sm text-white/65">Atualize o título, o link ou envie um novo arquivo.</p>
              </div>
              <button
                type="button"
                onClick={() => !savingEdit && setEditingItem(null)}
                className="text-white/55 text-2xl leading-none transition hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitEdit} className="mt-6 grid grid-cols-1 gap-4 text-lg">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Título</span>
                <input
                  className="input-hub w-full rounded-2xl p-3 text-lg"
                  value={editingItem.titulo}
                  onChange={(e) => setEditingItem((current) => ({ ...current, titulo: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Pasta</span>
                <input
                  className="input-hub w-full rounded-2xl p-3 text-lg"
                  value={editingItem.pastaDestino}
                  onChange={(e) => setEditingItem((current) => ({ ...current, pastaDestino: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Link</span>
                <input
                  className="input-hub w-full rounded-2xl p-3 text-lg"
                  value={editingItem.link}
                  onChange={(e) => setEditingItem((current) => ({ ...current, link: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Novo arquivo institucional</span>
                <input
                  type="file"
                  className="input-hub w-full rounded-2xl p-3 text-lg"
                  onChange={(e) => setEditingItem((current) => ({ ...current, arquivo: e.target.files?.[0] || null }))}
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={savingEdit}
                  className="rounded-xl border border-white/14 bg-white/8 px-5 py-2 font-medium text-white disabled:opacity-70"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-hubBlueDeep text-white font-semibold disabled:opacity-70"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/12 bg-[#2b2b2b] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Excluir item institucional</h2>
                <p className="mt-2 text-sm leading-7 text-white/65">
                  Confirme a exclusão de <span className="font-semibold text-white">"{confirmDeleteItem.titulo}"</span>.
                  Essa ação remove o item da área institucional.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !deletingId && setConfirmDeleteItem(null)}
                className="text-2xl leading-none text-white/55 transition hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteItem(null)}
                disabled={Boolean(deletingId)}
                className="rounded-xl border border-white/14 bg-white/8 px-5 py-2 font-medium text-white disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => deleteItem(confirmDeleteItem)}
                disabled={deletingId === confirmDeleteItem.id}
                className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-70"
              >
                {deletingId === confirmDeleteItem.id ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/12 bg-[#2b2b2b] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Excluir pasta institucional</h2>
                <p className="mt-2 text-sm leading-7 text-white/65">
                  Confirme a exclusão da pasta <span className="font-semibold text-white">"{confirmDeleteFolder}"</span>.
                  Essa ação remove todos os arquivos desta pasta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !deletingId && setConfirmDeleteFolder(null)}
                className="text-2xl leading-none text-white/55 transition hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteFolder(null)}
                disabled={deletingId === confirmDeleteFolder}
                className="rounded-xl border border-white/14 bg-white/8 px-5 py-2 font-medium text-white disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => deleteFolder(confirmDeleteFolder)}
                disabled={deletingId === confirmDeleteFolder}
                className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-70"
              >
                {deletingId === confirmDeleteFolder ? 'Excluindo...' : 'Excluir pasta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

function InstitucionalItemCard({ item, canManageInstitucional, deletingId, setEditingItem, setConfirmDeleteItem, baixarArquivo, toast }) {
  return (
    <div className="relative rounded-2xl border border-white/12 bg-black/15 p-5 text-white">
      {canManageInstitucional && (
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <button
            type="button"
            aria-label={`Excluir ${item.titulo}`}
            onClick={() => setConfirmDeleteItem(item)}
            disabled={deletingId === item.id}
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
      )}
      <h3 className="text-xl font-semibold text-white">{item.titulo}</h3>
      {item.caminhoRelativo && <p className="mt-2 text-sm text-white/60">{item.caminhoRelativo}</p>}
      <p className="mt-4 text-sm uppercase tracking-[0.18em] text-white/55">
        {new Date(item.dataCriacao).toLocaleDateString('pt-BR')}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {item.arquivoUrl && (
          <>
            <a
              href={item.arquivoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-white/15 bg-white/14 px-5 py-3 text-sm font-semibold text-white shadow-none"
            >
              Abrir arquivo
            </a>
            <button
              type="button"
              onClick={() => baixarArquivo(item).catch((error) => toast.error(error.message || 'Não foi possível baixar o arquivo'))}
              className="inline-flex items-center rounded-full border border-white/15 bg-black/25 px-5 py-3 text-sm font-semibold text-white shadow-none"
            >
              Baixar arquivo
            </button>
          </>
        )}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-white/15 bg-white/14 px-5 py-3 text-sm font-semibold text-white shadow-none"
          >
            Abrir link
          </a>
        )}
      </div>
    </div>
  )
}
