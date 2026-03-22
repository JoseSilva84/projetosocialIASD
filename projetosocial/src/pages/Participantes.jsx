import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)

  async function loadList() {
    setLoadingList(true)
    setError('')
    try {
      const data = await apiFetch('/participants')
      setList(data)
    } catch (err) {
      setError(err.message)
      if (err.message.includes('Não autorizado') || err.message.includes('Token')) {
        clearSession()
        navigate('/login', { replace: true })
      }
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true })
      return
    }
    loadList()
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiFetch('/participants', {
        method: 'POST',
        body: JSON.stringify({ name, address, whatsapp }),
      })
      setName('')
      setAddress('')
      setWhatsapp('')
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  const userLabel = getUserName()

  return (
    <ScreenShell maxWidthClass="max-w-2xl">
      <div className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-slate-500/15 via-transparent to-slate-700/15" />

        <div className="relative px-7 py-8 space-y-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Inscrição de participantes</h1>
              <p className="text-sm text-white/60 mt-1">
                Cadastre pessoas atendidas pelo projeto social
              </p>
              {userLabel ? (
                <p className="text-xs text-white/45 mt-1">Logado como: {userLabel}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="self-start rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
            >
              Sair
            </button>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wide text-white/80 uppercase">
              Novo cadastro
            </h2>

            {error ? (
              <p className="text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-white/50 mb-1 block">Nome completo</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                  placeholder="Nome da pessoa"
                  required
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
                  required
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
                  required
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

          <div>
            <h2 className="text-sm font-semibold tracking-wide text-white/80 uppercase mb-3">
              Inscrições recentes
            </h2>
            {loadingList ? (
              <p className="text-sm text-white/50">Carregando…</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-white/50">Nenhuma inscrição ainda.</p>
            ) : (
              <ul className="space-y-3 max-h-[min(50vh,28rem)] overflow-y-auto pr-1">
                {list.map((p) => (
                  <li
                    key={p._id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-white">{p.name}</p>
                    <p className="text-white/70 mt-1">{p.address}</p>
                    <p className="text-emerald-300/90 mt-1">{p.whatsapp}</p>
                    <p className="text-xs text-white/40 mt-2">{formatDate(p.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
