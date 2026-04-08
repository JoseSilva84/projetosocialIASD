import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { apiFetch, getGroupId, getUserRole, setGroupId } from '../../lib/api'

export default function ConfiguracaoPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupPassword, setNewGroupPassword] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('user')
  const [groups, setGroups] = useState([])
const [selectedGroupId, setSelectedGroupId] = useState(getGroupId() || '')
  const [quizConfig, setQuizConfig] = useState({ quizEnabled: false, quizQuestionPoints: 10 })
  const [quizSaving, setQuizSaving] = useState(false)
  const [quizConfigStatus, setQuizConfigStatus] = useState('')
  
  const role = getUserRole()

const fetchUsers = useCallback(async () => {
    if (role !== 'admin') return
    setLoading(true)
    try {
      const [usersData, groupsData, rankingData] = await Promise.all([
        apiFetch('/auth'),
        apiFetch('/groups'),
        apiFetch('/ranking-config')
      ])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setGroups(Array.isArray(groupsData) ? groupsData : [])
      setQuizConfig(rankingData || { quizEnabled: false, quizQuestionPoints: 10 })
      if (!selectedGroupId && Array.isArray(groupsData) && groupsData.length > 0) {
        setSelectedGroupId(groupsData[0]._id)
        setGroupId(groupsData[0]._id)
      }
    } catch (err) {
      toast.error('Erro ao listar dados: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [role, selectedGroupId])

  const handleQuizEnabledChange = useCallback((e) => {
    setQuizConfig(prev => ({ ...prev, quizEnabled: e.target.checked }))
  }, [])

  const handleQuizPointsChange = useCallback((e) => {
    const value = Number(e.target.value)
    setQuizConfig(prev => ({ ...prev, quizQuestionPoints: isNaN(value) || value < 1 ? 10 : value }))
  }, [])

  const handleSaveQuizConfig = useCallback(async () => {
    setQuizSaving(true)
    setQuizConfigStatus('')
    try {
      await apiFetch('/ranking-config', {
        method: 'PUT',
        body: JSON.stringify({
          quizEnabled: quizConfig.quizEnabled,
          quizQuestionPoints: quizConfig.quizQuestionPoints
        })
      })
      setQuizConfigStatus('saved')
      toast.success('Configurações do quiz salvas!')
    } catch (err) {
      setQuizConfigStatus('Erro ao salvar configurações.')
      toast.error('Falha ao salvar: ' + err.message)
    } finally {
      setQuizSaving(false)
    }
  }, [quizConfig.quizEnabled, quizConfig.quizQuestionPoints])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário convidado? Ele não terá mais acesso.')) return
    setLoadingAction(true)
    try {
      await apiFetch(`/auth/${userId}`, { method: 'DELETE' })
      toast.success('Usuário excluído com sucesso.')
      fetchUsers()
    } catch (err) {
      toast.error('Erro ao excluir usuário: ' + err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!newUserName.trim() || !newUserPassword.trim()) {
      toast.error('Nome e senha são obrigatórios.')
      return
    }
    setLoadingAction(true)
    try {
      await apiFetch('/auth/create', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName.trim(),
          password: newUserPassword,
          role: newUserRole
        })
      })
      toast.success('Usuário criado com sucesso.')
      setNewUserName('')
      setNewUserPassword('')
      setNewUserRole('user')
      fetchUsers()
    } catch (err) {
      toast.error('Erro ao criar usuário: ' + err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim() || !newGroupPassword.trim()) {
      toast.error('Nome e senha são obrigatórios.')
      return
    }
    setLoadingAction(true)
    try {
      await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: newGroupName.trim(),
          password: newGroupPassword
        })
      })
      toast.success('Grupo criado com sucesso.')
      setNewGroupName('')
      setNewGroupPassword('')
    } catch (err) {
      toast.error('Erro ao criar grupo: ' + err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleDeleteGroupAndParticipants = async () => {
    if (!selectedGroupId) {
      toast.error('Selecione um grupo antes de excluir.')
      return
    }

    if (!window.confirm(`PERIGO EXTREMO!\n\nVocê tem certeza ABSOLUTA que deseja excluir o grupo inteiro (e todos os participantes associados)? Esta ação NÃO PODE ser revertida!`)) return
    
    if (!window.confirm('Você entende que TODOS os dados do grupo serão apagados permanentemente?')) return

    setLoadingAction(true)
    try {
      await apiFetch(`/groups/${encodeURIComponent(selectedGroupId)}`, { method: 'DELETE' })
      toast.success('Grupo e todos os participantes associados foram excluídos com sucesso.')
      setSelectedGroupId('')
      setGroupId('')
      fetchUsers()
    } catch (err) {
      toast.error('Erro ao excluir grupo: ' + err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  if (!['admin', 'secretario'].includes(role)) {
    return <p className="text-white">Acesso negado.</p>
  }

  return (
    <div className="space-y-8">
      <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-indigo-300 mb-2">⚙️ Configurações do Quiz</h3>
        <p className="text-sm text-white/60 mb-5">
          Configure se o quiz estará disponível para usuários convidados e defina a pontuação por acerto.
        </p>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={quizConfig.quizEnabled || false}
                onChange={handleQuizEnabledChange}
                className="w-5 h-5 text-indigo-600 bg-slate-900/50 border-white/20 rounded focus:ring-indigo-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-white">Ativar Quiz para Usuários Convidado</span>
            </label>
            <p className="mt-1 text-xs text-white/50">Quando desativado, apenas admins/secretários podem acessar o quiz.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Pontos por acerto no Quiz</label>
            <input
              type="number"
              min="1"
              value={quizConfig.quizQuestionPoints || 10}
              onChange={handleQuizPointsChange}
              className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-indigo-400"
              placeholder="10"
            />
            <p className="mt-1 text-xs text-white/50">Pontuação padrão atribuída por cada resposta correta (pode ser alterada individualmente no quiz).</p>
          </div>
          <button
            type="button"
            onClick={handleSaveQuizConfig}
            disabled={quizSaving}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-500 transition disabled:opacity-50 cursor-pointer font-medium"
          >
            {quizSaving ? 'Salvando...' : 'Salvar Configurações do Quiz'}
          </button>
        </div>
        {quizConfigStatus && (
          <p className={`mt-2 p-2 rounded text-xs ${quizConfigStatus === 'saved' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/30' : 'bg-amber-500/10 text-amber-300 border border-amber-400/30'}`}>
            {quizConfigStatus === 'saved' ? '✅ Configurações salvas com sucesso!' : quizConfigStatus}
          </p>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-2">Criar Novo Grupo</h3>
        <p className="text-sm text-white/60 mb-5">
          Crie um novo grupo de participantes com senha de acesso.
        </p>
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Nome do Grupo</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              placeholder="Digite o nome do grupo"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Senha de Acesso</label>
            <input
              type="password"
              value={newGroupPassword}
              onChange={(e) => setNewGroupPassword(e.target.value)}
              className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              placeholder="Digite a senha"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loadingAction}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-500 transition disabled:opacity-50 cursor-pointer"
          >
            Criar Grupo
          </button>
        </form>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-2">Criar Novo Usuário</h3>
        <p className="text-sm text-white/60 mb-5">
          Crie um novo usuário com permissões específicas.
        </p>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Nome do Usuário</label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              placeholder="Digite o nome do usuário"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Senha</label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              placeholder="Digite a senha"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Função</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
            >
              <option value="user">Usuário</option>
              <option value="convidado">Convidado</option>
              <option value="secretario">Secretário</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loadingAction}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-500 transition disabled:opacity-50 cursor-pointer"
          >
            Criar Usuário
          </button>
        </form>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-2">Usuários Cadastrados</h3>
        <p className="text-sm text-white/60 mb-5">
          Lista de usuários com acesso ao sistema.
        </p>

        {loading ? (
          <p className="text-sm text-white/50">Carregando usuários...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-white/50">Nenhum usuário encontrado.</p>
        ) : (
          <ul className="space-y-3">
            {users.map(u => (
              <li key={u._id} className="flex items-center justify-between bg-black/20 border border-white/10 p-3 rounded-xl">
                <div>
                  <p className="text-white text-sm font-semibold">{u.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">Role: {u.role}</p>
                </div>
                {u.role !== 'admin' && (
                  <button
                    onClick={() => handleDeleteUser(u._id)}
                    disabled={loadingAction}
                    className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full hover:bg-red-500/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    Excluir
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-red-400 mb-2">Zona de Perigo por Grupo</h3>
        <p className="text-sm text-white/60 mb-3">
          Selecione o grupo e delete o grupo inteiro com todos os participantes.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-white/80 mb-1">Grupo selecionado</label>
          <select
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value)
              setGroupId(e.target.value)
            }}
            className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
          >
            <option value="">-- Escolha um grupo --</option>
            {groups.map((group) => (
              <option key={group._id} value={group._id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-white/60 mb-5">
          Esta ação apaga permanentemente o grupo selecionado e todos os participantes do grupo, incluindo histórico de frequência e estudos.
        </p>
        <button
          onClick={handleDeleteGroupAndParticipants}
          disabled={loadingAction || !selectedGroupId}
          className="text-sm font-bold bg-red-600 text-white px-5 py-2.5 rounded-xl border border-red-800 hover:bg-red-500 transition shadow-lg cursor-pointer disabled:opacity-50"
        >
          Deletar grupo e participantes
        </button>
      </div>
    </div>
  )
}
