import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ScreenShell from '../components/ScreenShell'
import BiblicalStudyPanel from '../components/dashboard/BiblicalStudyPanel'
import CoursesPanel from '../components/dashboard/CoursesPanel'
import FrequencyPanel from '../components/dashboard/FrequencyPanel'
import { apiFetch, clearSession, getToken, getUserName } from '../lib/api'

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

  function handleLogout() {
    clearSession()
    toast.info('Sessão encerrada.')
    navigate('/login', { replace: true })
  }

  const userLabel = getUserName()

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

            <article
              className="relative w-full min-w-0 flex-1 rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden lg:mx-0 mx-auto"
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
                      Total: {loadingList ? '…' : list.length}
                    </span>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                  {loadingList ? (
                    <p className="text-sm text-white/50 text-center py-8">Carregando…</p>
                  ) : list.length === 0 ? (
                    <p className="text-sm text-white/50 text-center py-8">Nenhuma inscrição ainda.</p>
                  ) : (
                    <ul className="space-y-3 max-w-2xl mx-auto lg:mx-0">
                      {list.map((p) => (
                        <li
                          key={p._id}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                        >
                          <p className="font-medium text-white">{p.name}</p>
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
      </div>
    </ScreenShell>
  )
}
