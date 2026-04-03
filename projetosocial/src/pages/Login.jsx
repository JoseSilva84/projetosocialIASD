import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ScreenShell from '../components/ScreenShell'
import { apiFetch, getToken, getUserRole, saveSession } from '../lib/api'

const LockIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M7.5 10.5V8.6C7.5 6.372 9.298 4.575 11.526 4.575C13.754 4.575 15.552 6.372 15.552 8.6V10.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M7.2 10.5H16.2C17.177 10.5 17.97 11.293 17.97 12.27V17.13C17.97 18.107 17.177 18.9 16.2 18.9H7.2C6.223 18.9 5.43 18.107 5.43 17.13V12.27C5.43 11.293 6.223 10.5 7.2 10.5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M11.7 14V15.7"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
)

const UserSilhouette = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M12 12.2C14.2091 12.2 16 10.4091 16 8.2C16 5.99086 14.2091 4.2 12 4.2C9.79086 4.2 8 5.99086 8 8.2C8 10.4091 9.79086 12.2 12 12.2Z"
      fill="currentColor"
      fillOpacity="0.9"
    />
    <path
      d="M4.5 19.8C5.9 16.4 8.4 14.7 12 14.7C15.6 14.7 18.1 16.4 19.5 19.8"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
)

export default function Login() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Estado para cadastro de participante (secretário)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [address, setAddress] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [reference, setReference] = useState('')
  const [age, setAge] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loadingParticipant, setLoadingParticipant] = useState(false)

  const isAdmin = name.trim().toLowerCase() === 'admin'

  useEffect(() => {
    const token = getToken()
    const role = getUserRole()
    if (token && role === 'secretario') {
      setIsLoggedIn(true)
      setUserRole(role)
    } else if (token) {
      // Se estiver logado mas não for secretário, redirecionar
      navigate('/participantes', { replace: true })
    }
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    const n = name.trim()
    const p = password.trim()
    if (!n || !p) {
      toast.error('Nome e senha são obrigatórios.')
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name: n, password: p }),
      })
      saveSession(data)
      toast.success('Login realizado com sucesso.')
      navigate('/participantes', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleParticipantSubmit(e) {
    e.preventDefault()
    const parsedAge = Number(age)
    if (!participantName.trim() || !address.trim() || !neighborhood.trim() || !houseNumber.trim() || !whatsapp.trim() || !Number.isInteger(parsedAge) || parsedAge < 0) {
      toast.error('Preencha todos os campos obrigatórios corretamente.')
      return
    }
    setLoadingParticipant(true)
    try {
      await apiFetch('/participants', {
        method: 'POST',
        body: JSON.stringify({
          name: participantName.trim(),
          address: address.trim(),
          neighborhood: neighborhood.trim(),
          houseNumber: houseNumber.trim(),
          reference: reference.trim(),
          age: parsedAge,
          whatsapp: whatsapp.trim(),
        }),
      })
      toast.success('Participante cadastrado com sucesso!')
      // Limpar formulário
      setParticipantName('')
      setAddress('')
      setNeighborhood('')
      setHouseNumber('')
      setReference('')
      setAge('')
      setWhatsapp('')
    } catch (err) {
      toast.error('Erro ao cadastrar participante: ' + err.message)
    } finally {
      setLoadingParticipant(false)
    }
  }

  return (
    <ScreenShell>
      <div className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-slate-500/15 via-transparent to-slate-700/15" />

        <div className="relative px-7 py-9">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/5">
            <UserSilhouette className="h-12 w-12 text-white/60" aria-hidden="true" />
          </div>

          {isLoggedIn && userRole === 'secretario' ? (
            <>
              <h1 className="text-2xl font-bold text-center text-white mb-4">
                Cadastro Rápido de Participante
              </h1>
              <p className="text-center text-sm text-white/60 mb-6">
                Insira os dados do participante diretamente aqui
              </p>

              <form onSubmit={handleParticipantSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Nome completo</label>
                    <input
                      type="text"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                      placeholder="Nome da pessoa"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Idade</label>
                    <input
                      type="number"
                      min="0"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                      placeholder="Ex: 14"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/70 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Rua</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                      placeholder="Nome da rua"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Número da casa</label>
                    <input
                      type="text"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                      placeholder="Ex: 123"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/70 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                    placeholder="Nome do bairro"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/70 mb-1">Referência (opcional)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                    placeholder="Ex: Perto da igreja"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingParticipant}
                  className="w-full rounded-full bg-linear-to-r from-emerald-800 via-emerald-700 to-emerald-800 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition cursor-pointer disabled:opacity-50"
                >
                  {loadingParticipant ? 'Cadastrando…' : 'CADASTRAR PARTICIPANTE'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/participantes')}
                    className="text-sm text-white/60 underline decoration-white/40 underline-offset-2 hover:text-white/80"
                  >
                    Voltar ao painel
                  </button>
                </div>
              </form>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h1 className="text-2xl font-bold text-center text-white">
                Projeto Eu Quero Ser Feliz
              </h1>
              <p className="text-center text-sm text-white/60">Entrar na secretaria</p>
              <p className="text-center text-xs text-white/50">
                Usuário Administrador: (controle total).<br />
                Usuário Convidado: (apenas visualiza).<br />
              </p>

              <div className="flex items-center gap-3 border-b border-white/25 pb-3">
                <UserSilhouette className="h-4 w-4 text-white/70 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  name="name"
                  placeholder="Nome de usuário"
                  autoComplete="username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent py-1 text-sm text-white placeholder:text-white/60 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 border-b border-white/25 pb-3">
                <LockIcon className="h-4 w-4 text-white/70 shrink-0" aria-hidden="true" />
                <input
                  type="password"
                  name="password"
                  placeholder="Senha"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent py-1 text-sm text-white placeholder:text-white/60 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-linear-to-r from-slate-800 via-slate-700 to-slate-800 px-6 py-3 text-sm font-semibold tracking-widest text-white shadow-lg shadow-slate-900/20 hover:brightness-110 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Entrando…' : 'ENTRAR'}
              </button>

              <p className="text-center text-sm text-white/60">
                {!isAdmin && (
                  <>
                    Ainda não tem conta, cadastre-se como usuário convidado?{' '}
                    <Link to="/cadastro" className="text-white underline decoration-white/40 underline-offset-2">
                      Cadastre-se
                    </Link>
                  </>
                )}
              </p>
            </form>
          )}
        </div>
      </div>
    </ScreenShell>
  )
}
