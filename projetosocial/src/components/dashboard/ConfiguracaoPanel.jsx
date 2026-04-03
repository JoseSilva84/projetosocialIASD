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
  
  const role = getUserRole()

  const fetchUsers = useCallback(async () => {
    if (role !== 'admin') return
    setLoading(true)
    try {
      const [usersData, groupsData] = await Promise.all([
        apiFetch('/auth'),
        apiFetch('/groups'),
      ])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setGroups(Array.isArray(groupsData) ? groupsData : [])
      if (!selectedGroupId && Array.isArray(groupsData) && groupsData.length > 0) {
        setSelectedGroupId(groupsData[0]._id)
        setGroupId(groupsData[0]._id)
      }
    } catch (err) {
      toast.error('Erro ao listar usuários ou grupos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [role, selectedGroupId])

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
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-500 transition disabled:opacity-50"
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
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
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
                    className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full hover:bg-red-500/20 transition disabled:opacity-50"
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
