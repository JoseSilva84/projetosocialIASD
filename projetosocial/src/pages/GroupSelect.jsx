import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ScreenShell from '../components/ScreenShell'
import { apiFetch, clearSession, getToken, saveGroup } from '../lib/api'

export default function GroupSelect() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [password, setPassword] = useState('')
  const [loadingVerify, setLoadingVerify] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    loadGroups()
  }, [navigate])

  const loadGroups = async () => {
    try {
      const data = await apiFetch('/groups')
      setGroups(data)
    } catch (error) {
      toast.error('Erro ao carregar grupos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPassword = async () => {
    if (!selectedGroup || !password) {
      toast.error('Selecione um grupo e digite a senha.')
      return
    }

    setLoadingVerify(true)
    try {
      const data = await apiFetch('/auth/select-group', {
        method: 'POST',
        body: JSON.stringify({ groupId: selectedGroup._id, password: password.trim() })
      })
      // Salvar novo token e grupo
      localStorage.setItem('token', data.token)
      saveGroup(data.group)
      navigate('/participantes')
    } catch (err) {
      toast.error('Senha incorreta.')
    } finally {
      setLoadingVerify(false)
    }
  }

  if (loading) {
    return (
      <ScreenShell>
        <div className="text-center">
          <p className="text-white/60">Carregando grupos...</p>
        </div>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white text-center mb-8">
          Selecionar Grupo
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Escolha o grupo do projeto
            </label>
            <div className="space-y-2">
              {groups.map(group => (
                <button
                  key={group._id}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full p-4 rounded-xl border text-left transition ${
                    selectedGroup?._id === group._id
                      ? 'border-blue-400 bg-blue-500/20 text-white'
                      : 'border-white/10 bg-black/20 text-white/80 hover:bg-black/30'
                  }`}
                >
                  <div className="font-semibold">{group.name}</div>
                  <div className="text-sm text-white/60">Criado por: {group.createdBy}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedGroup && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Senha do grupo "{selectedGroup.name}"
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                placeholder="Digite a senha"
                onKeyPress={(e) => e.key === 'Enter' && handleVerifyPassword()}
              />
            </div>
          )}

          <button
            onClick={handleVerifyPassword}
            disabled={!selectedGroup || !password || loadingVerify}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingVerify ? 'Verificando...' : 'Entrar no Grupo'}
          </button>

          <div className="mt-4 pt-4 border-t border-white/10">
            <button
              onClick={() => {
                clearSession()
                navigate('/login', { replace: true })
              }}
              className="w-full text-sm text-white/60 py-3 rounded-xl border border-white/20 hover:bg-white/10 hover:text-white transition-all duration-200 cursor-pointer"
            >
              Sair do Login
            </button>
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
