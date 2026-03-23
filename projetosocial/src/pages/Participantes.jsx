import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ScreenShell from '../components/ScreenShell'
import BiblicalStudyPanel from '../components/dashboard/BiblicalStudyPanel'
import CoursesPanel from '../components/dashboard/CoursesPanel'
import FrequencyPanel from '../components/dashboard/FrequencyPanel'
import { apiFetch, clearSession, getToken, getUserName, getUserRole } from '../lib/api'

const TABS = [
  { id: 'inscricoes', label: 'Inscrições' },
  { id: 'biblico', label: 'Estudo bíblico' },
  { id: 'cursos', label: 'Cursos' },
  { id: 'frequencia', label: 'Frequência' },
]

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

export default function Participantes() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('inscricoes')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deletingIds, setDeletingIds] = useState(new Set())
  const [recentlyDeleted, setRecentlyDeleted] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [updatingIds, setUpdatingIds] = useState(new Set())

  const userRole = getUserRole()

  const loadList = useCallback(async () => {
    setLoadingList(true)
    try {
      const data = await apiFetch('/participants')
      setList(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err.message)
      if (err.message.includes('Não autorizado') || err.message.includes('Token')) {
        clearSession()
        navigate('/login', { replace: true })
      }
    } finally {
      setLoadingList(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true })
      return
    }
    loadList()
  }, [navigate, loadList])

  /* Recarrega participantes ao abrir Estudo bíblico (lista sempre atualizada no select). */
  useEffect(() => {
    if (!getToken()) return
    if (tab === 'biblico') loadList()
  }, [tab, loadList])

  /* Recarrega participantes ao abrir Frequência (lista sempre atualizada no select). */
  useEffect(() => {
    if (!getToken()) return
    if (tab === 'frequencia') loadList()
  }, [tab, loadList])

  async function handleSubmit(e) {
    e.preventDefault()
    const n = name.trim()
    const a = address.trim()
    const w = whatsapp.trim()
    if (!n || !a || !w) {
      toast.error('Preencha nome, endereço e WhatsApp.')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/participants', {
        method: 'POST',
        body: JSON.stringify({ name: n, address: a, whatsapp: w }),
      })
      setName('')
      setAddress('')
      setWhatsapp('')
      toast.success('Participante cadastrado com sucesso.')
      await loadList()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function requestDelete(participantId) {
    setDeleteConfirmId(participantId)
  }

  function cancelDelete() {
    setDeleteConfirmId(null)
  }

  async function handleUndoDelete() {
    if (!recentlyDeleted) return

    const { name: delName, address: delAddress, whatsapp: delWhatsapp } = recentlyDeleted
    setLoadingList(true)
    try {
      const restored = await apiFetch('/participants', {
        method: 'POST',
        body: JSON.stringify({ name: delName, address: delAddress, whatsapp: delWhatsapp }),
      })

      // Se houver dados em progresso, re-aplicar em endpoints específicos.
      if (recentlyDeleted.selectedBiblicalLesson != null || recentlyDeleted.biblicalLessonsCompleted?.length > 0) {
        await apiFetch(`/participants/${restored._id}/biblical-study`, {
          method: 'PATCH',
          body: JSON.stringify({
            selectedBiblicalLesson: recentlyDeleted.selectedBiblicalLesson ?? null,
            biblicalLessonsCompleted: recentlyDeleted.biblicalLessonsCompleted ?? [],
          }),
        })
      }
      if (recentlyDeleted.frequencyAttended?.length > 0) {
        await apiFetch(`/participants/${restored._id}/frequency`, {
          method: 'PATCH',
          body: JSON.stringify({ frequencyAttended: recentlyDeleted.frequencyAttended }),
        })
      }

      toast.success('Participante restaurado com sucesso.')
      setRecentlyDeleted(null)
      await loadList()
    } catch (err) {
      toast.error(`Erro ao restaurar participante: ${err.message}`)
    } finally {
      setLoadingList(false)
    }
  }

  function startEdit(participant) {
    setEditingId(participant._id)
    setEditName(participant.name)
    setEditAddress(participant.address)
    setEditWhatsapp(participant.whatsapp)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditAddress('')
    setEditWhatsapp('')
  }

  async function handleUpdate(e) {
    e.preventDefault()
    const id = editingId
    if (!id) return

    const n = editName.trim()
    const a = editAddress.trim()
    const w = editWhatsapp.trim()
    if (!n || !a || !w) {
      toast.error('Preencha nome, endereço e WhatsApp.')
      return
    }

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      await apiFetch(`/participants/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: n, address: a, whatsapp: w }),
      })
      setEditingId(null)
      setEditName('')
      setEditAddress('')
      setEditWhatsapp('')
      toast.success('Participante atualizado com sucesso.')
      await loadList()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function confirmDelete() {
    const participantId = deleteConfirmId
    if (!participantId) return

    const participant = list.find((p) => p._id === participantId) || null
    setDeletingIds((prev) => new Set(prev).add(participantId))
    try {
      await apiFetch(`/participants/${participantId}`, {
        method: 'DELETE',
      })

      setRecentlyDeleted(participant)
      toast.success(
        <div className="flex items-center gap-3">
          <span>Participante excluído.</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="rounded-full border border-emerald-500/50 bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
          >
            Desfazer
          </button>
        </div>,
        { autoClose: 6000 }
      )
      await loadList()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(participantId)
        return next
      })
      setDeleteConfirmId(null)
    }
  }

  function handleLogout() {
    clearSession()
    toast.info('Sessão encerrada.')
    navigate('/login', { replace: true })
  }

  const userLabel = getUserName()

  const filteredList = list.filter(p => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    // Nome
    if (p.name.toLowerCase().includes(term)) return true
    // WhatsApp
    if (p.whatsapp.toLowerCase().includes(term)) return true
    // Endereço
    if (p.address.toLowerCase().includes(term)) return true
    // Data de presença (formato completo)
    if (p.frequencyAttended?.some(date => formatDate(date).toLowerCase().includes(term))) return true
    // Dia das datas de presença
    const dayNum = parseInt(term)
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
      if (p.frequencyAttended?.some(date => new Date(date).getDate() === dayNum)) return true
    }
    // Quantidade de dias
    if (!isNaN(dayNum) && p.frequencyAttended?.length === dayNum) return true
    // Estudo bíblico
    if (p.selectedBiblicalLesson != null && `lição ${p.selectedBiblicalLesson}`.toLowerCase().includes(term)) return true
    if (p.biblicalLessonsCompleted?.length > 0 && `${p.biblicalLessonsCompleted.length}/15 lições`.toLowerCase().includes(term)) return true
    return false
  })

  return (
    <ScreenShell maxWidthClass="max-w-7xl" alignClass="items-start sm:items-center">
      <div className="mx-auto w-full space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-center lg:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Painel da secretaria</h1>
            <p className="text-sm text-white/55 mt-1">Projeto Eu Quero Ser Feliz</p>
            {userLabel ? (
              <p className="text-xs text-white/40 mt-1">Logado como: {userLabel}</p>
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 max-w-xs">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome, WhatsApp, endereço, dia..."
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
              />
            </div>
            <nav
              className="flex flex-wrap justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5"
              aria-label="Seções do painel"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition ${
                    tab === t.id
                      ? 'bg-white/15 text-white shadow-inner'
                      : 'text-white/55 hover:text-white/85 hover:bg-white/5'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition self-center"
            >
              Sair
            </button>
          </div>
        </header>

        {tab === 'inscricoes' && (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-center lg:gap-8">
            {userRole === 'admin' && (
              <div className="relative w-full max-w-xl shrink-0 rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden lg:mx-0 mx-auto">
                <div className="absolute inset-0 bg-linear-to-br from-slate-500/15 via-transparent to-slate-700/15" />

                <div className="relative px-5 py-6 sm:px-7 sm:py-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Inscrição de participantes</h2>
                    <p className="text-xs sm:text-sm text-white/60 mt-1">
                      Cadastre pessoas atendidas pelo projeto social
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-xs font-semibold tracking-wide text-white/80 uppercase text-center sm:text-left">
                      Novo cadastro
                    </h3>

                    <div className="space-y-3">
                      <label className="block">
                        <span className="text-xs text-white/50 mb-1 block">Nome completo</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="Nome da pessoa"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-white/50 mb-1 block">Endereço</span>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="Rua, número, bairro, cidade"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-white/50 mb-1 block">WhatsApp</span>
                        <input
                          type="tel"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="(00) 00000-0000"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full cursor-pointer rounded-full bg-linear-to-r from-emerald-900/90 via-emerald-800 to-emerald-900/90 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Salvando…' : 'Inscrever participante'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            <article
              className={`relative w-full min-w-0 ${userRole === 'admin' ? 'flex-1' : ''} rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden lg:mx-0 mx-auto`}
              aria-labelledby="dashboard-heading"
            >
              <div className="absolute inset-0 bg-linear-to-br from-emerald-950/20 via-transparent to-slate-800/20" />

              <div className="relative flex flex-col h-full min-h-[min(70vh,32rem)] lg:min-h-[min(85vh,40rem)]">
                <header className="px-5 py-4 sm:px-6 border-b border-white/10 shrink-0">
                  <h2
                    id="dashboard-heading"
                    className="text-base sm:text-lg font-bold text-white text-center sm:text-left"
                  >
                    Dashboard — participantes
                  </h2>
                  <p className="text-xs text-white/50 mt-1 text-center sm:text-left">
                    Todos os participantes que você cadastrou
                  </p>
                  <div className="mt-3 flex justify-center sm:justify-start">
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-200/90">
                      Total: {loadingList ? '…' : filteredList.length}
                    </span>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto max-h-80 px-4 py-4 sm:px-5 sm:py-5 custom-scrollbar">
                  {loadingList ? (
                    <p className="text-sm text-white/50 text-center py-8">Carregando…</p>
                  ) : filteredList.length === 0 ? (
                    <p className="text-sm text-white/50 text-center py-8">Nenhuma inscrição ainda.</p>
                  ) : (
                    <ul className="space-y-3 max-w-2xl mx-auto lg:mx-0">
                      {filteredList.map((p) => (
                        <li
                          key={p._id}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                        >
                          {editingId === p._id ? (
                            <form onSubmit={handleUpdate} className="space-y-3">
                              <div className="space-y-2">
                                <label className="block">
                                  <span className="text-xs text-white/50">Nome completo</span>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                    placeholder="Nome da pessoa"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-white/50">Endereço</span>
                                  <input
                                    type="text"
                                    value={editAddress}
                                    onChange={(e) => setEditAddress(e.target.value)}
                                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                    placeholder="Rua, número, bairro, cidade"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-white/50">WhatsApp</span>
                                  <input
                                    type="tel"
                                    value={editWhatsapp}
                                    onChange={(e) => setEditWhatsapp(e.target.value)}
                                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                    placeholder="(00) 00000-0000"
                                  />
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={updatingIds.has(p._id)}
                                  className="flex-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                  {updatingIds.has(p._id) ? 'Salvando…' : 'Salvar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="flex-1 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-white">{p.name}</p>
                                {userRole === 'admin' && (
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(p)}
                                      className="rounded-full border px-2 py-1 text-xs transition border-blue-400/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
                                      title="Editar participante"
                                      aria-label="Editar participante"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="h-3.5 w-3.5"
                                      >
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => requestDelete(p._id)}
                                      disabled={deletingIds.has(p._id)}
                                      className={`rounded-full border px-2 py-1 text-xs transition inline-flex items-center gap-1 ${deletingIds.has(p._id) ? 'border-white/20 bg-white/10 text-white/40 cursor-not-allowed' : 'border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20'}`}
                                      title="Excluir participante"
                                      aria-label="Excluir participante"
                                    >
                                      {deletingIds.has(p._id) ? (
                                        <>
                                          <svg
                                            className="h-3.5 w-3.5 animate-spin text-white/70"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              stroke="currentColor"
                                              strokeWidth="4"
                                            />
                                            <path
                                              className="opacity-75"
                                              fill="currentColor"
                                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                            />
                                          </svg>
                                          Aguarde
                                        </>
                                      ) : (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                          className="h-3.5 w-3.5"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M6 2a1 1 0 00-1 1v1H3a1 1 0 100 2h14a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zm2 5a1 1 0 011 1v7a1 1 0 11-2 0V8a1 1 0 011-1zm4 0a1 1 0 011 1v7a1 1 0 11-2 0V8a1 1 0 011-1z"
                                            clipRule="evenodd"
                                          />
                                          <path d="M8 7h4v1H8V7z" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                              <p className="text-white/70 mt-1 wrap-break-word">{p.address}</p>
                              <p className="text-emerald-300/90 mt-1">{p.whatsapp}</p>
                              <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                                {p.selectedBiblicalLesson != null ? (
                                  <span className="rounded-full bg-amber-500/20 text-amber-100/90 px-2 py-0.5 border border-amber-500/25">
                                    Estudo bíblico: lição {p.selectedBiblicalLesson}
                                  </span>
                                ) : null}
                                {p.biblicalLessonsCompleted?.length > 0 ? (
                                  <span className="rounded-full bg-emerald-500/15 text-emerald-100/85 px-2 py-0.5 border border-emerald-500/20">
                                    {p.biblicalLessonsCompleted.length}/15 lições concluídas
                                  </span>
                                ) : null}
                                {p.frequencyAttended?.length > 0 ? (
                                  <span className="rounded-full bg-blue-500/15 text-blue-100/85 px-2 py-0.5 border border-blue-500/20">
                                    {p.frequencyAttended.length}/25 dias de frequência
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-white/40 mt-2">{formatDate(p.createdAt)}</p>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          </div>
        )}

        {tab === 'biblico' && (
          <section
            className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden px-5 py-6 sm:px-8 sm:py-8"
            aria-labelledby="biblico-heading"
          >
            <div className="absolute inset-0 bg-linear-to-br from-amber-950/15 via-transparent to-slate-900/25 pointer-events-none" />
            <div className="relative">
              <h2 id="biblico-heading" className="text-lg font-bold text-white text-center sm:text-left">
                Estudo bíblico — dashboard interativo
              </h2>
              <p className="text-sm text-white/55 mt-1 mb-8 text-center sm:text-left max-w-2xl">
                Escolha um participante <strong className="text-white/85">já inscrito</strong>, defina a
                lição em estudo (anel ou cartões) e marque as concluídas. Salve para registrar no
                sistema.
              </p>
              <BiblicalStudyPanel
                participants={list}
                loadingList={loadingList}
                onUpdated={loadList}
              />
            </div>
          </section>
        )}

        {tab === 'cursos' && (
          <section
            className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden px-5 py-6 sm:px-8 sm:py-8"
            aria-labelledby="cursos-heading"
          >
            <div className="absolute inset-0 bg-linear-to-br from-violet-950/15 via-transparent to-slate-900/25 pointer-events-none" />
            <div className="relative">
              <h2 id="cursos-heading" className="text-lg font-bold text-white text-center sm:text-left">
                Cursos do projeto
              </h2>
              <p className="text-sm text-white/55 mt-1 mb-8 text-center sm:text-left">
                Ofertas formativas da secretaria — detalhes com a equipe.
              </p>
              <CoursesPanel />
            </div>
          </section>
        )}

        {tab === 'frequencia' && (
          <section
            className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden px-5 py-6 sm:px-8 sm:py-8"
            aria-labelledby="frequencia-heading"
          >
            <div className="absolute inset-0 bg-linear-to-br from-blue-950/15 via-transparent to-slate-900/25 pointer-events-none" />
            <div className="relative">
              <h2 id="frequencia-heading" className="text-lg font-bold text-white text-center sm:text-left">
                Frequência — registro de presença
              </h2>
              <p className="text-sm text-white/55 mt-1 mb-8 text-center sm:text-left max-w-2xl">
                Escolha um participante <strong className="text-white/85">já inscrito</strong> e marque os dias de presença.
              </p>
              <FrequencyPanel
                participants={list}
                loadingList={loadingList}
                onUpdated={loadList}
              />
            </div>
          </section>
        )}

        {deleteConfirmId ? (
          <div
            className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
          >
            <div
              className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950/95 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="confirm-delete-title" className="text-lg font-bold text-white">
                Confirmar exclusão
              </h2>
              <p className="text-sm text-white/70 mt-3">
                Tem certeza que deseja excluir este participante? Esta ação não pode ser desfeita.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
                  disabled={deletingIds.has(deleteConfirmId)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-full border border-red-400/40 bg-red-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={deletingIds.has(deleteConfirmId)}
                >
                  {deletingIds.has(deleteConfirmId) ? 'Aguarde…' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ScreenShell>
  )
}
