import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ScreenShell from '../components/ScreenShell'
import { apiFetch, clearSession, getToken, getUserName } from '../lib/api'

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
      setList(data)
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
    <ScreenShell maxWidthClass="max-w-6xl" alignClass="items-start sm:items-center">
      <div className="mx-auto flex w-full flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-center lg:gap-8">
        <div className="relative w-full max-w-xl shrink-0 rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden lg:mx-0 mx-auto">
          <div className="absolute inset-0 bg-linear-to-br from-slate-500/15 via-transparent to-slate-700/15" />

          <div className="relative px-5 py-6 sm:px-7 sm:py-8 space-y-6">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="text-center sm:text-left">
                <h1 className="text-lg sm:text-xl font-bold text-white">
                  Inscrição de participantes
                </h1>
                <p className="text-xs sm:text-sm text-white/60 mt-1">
                  Cadastre pessoas atendidas pelo projeto social
                </p>
                {userLabel ? (
                  <p className="text-xs text-white/45 mt-1">Logado como: {userLabel}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="self-center sm:self-start rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
              >
                Sair
              </button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-xs font-semibold tracking-wide text-white/80 uppercase text-center sm:text-left">
                Novo cadastro
              </h2>

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
                className="w-full rounded-full bg-linear-to-r from-emerald-900/90 via-emerald-800 to-emerald-900/90 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition disabled:opacity-50"
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
                      <p className="text-xs text-white/40 mt-2">{formatDate(p.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </article>
      </div>
    </ScreenShell>
  )
}
