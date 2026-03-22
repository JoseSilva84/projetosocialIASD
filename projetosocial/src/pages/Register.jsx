import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ScreenShell from '../components/ScreenShell'
import { apiFetch, saveSession } from '../lib/api'

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

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, password }),
      })
      saveSession(data)
      navigate('/participantes', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-2xl font-bold text-center text-white">Cadastro</h1>
            <p className="text-center text-sm text-white/60">
              Crie seu acesso para inscrever participantes do projeto
            </p>

            {error ? (
              <p className="text-sm text-red-300 text-center" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex items-center gap-3 border-b border-white/25 pb-3">
              <UserSilhouette className="h-4 w-4 text-white/70 shrink-0" aria-hidden="true" />
              <input
                type="text"
                name="name"
                placeholder="Nome"
                autoComplete="username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent py-1 text-sm text-white placeholder:text-white/60 outline-none"
                required
              />
            </div>

            <div className="flex items-center gap-3 border-b border-white/25 pb-3">
              <LockIcon className="h-4 w-4 text-white/70 shrink-0" aria-hidden="true" />
              <input
                type="password"
                name="password"
                placeholder="Senha (mín. 6 caracteres)"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent py-1 text-sm text-white placeholder:text-white/60 outline-none"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-linear-to-r from-slate-800 via-slate-700 to-slate-800 px-6 py-3 text-sm font-semibold tracking-widest text-white shadow-lg shadow-slate-900/20 hover:brightness-110 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Cadastrando…' : 'CADASTRAR'}
            </button>

            <p className="text-center text-sm text-white/60">
              Já tem conta?{' '}
              <Link to="/login" className="text-white underline decoration-white/40 underline-offset-2">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </ScreenShell>
  )
}
