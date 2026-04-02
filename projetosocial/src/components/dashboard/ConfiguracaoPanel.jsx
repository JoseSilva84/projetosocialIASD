import { useState, useEffect, useCallback } from 'react'
import { apiFetch, getUserRole } from '../../lib/api'
import { toast } from 'react-toastify'

export default function ConfiguracaoPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(false)
  
  const role = getUserRole()

  const fetchUsers = useCallback(async () => {
    if (role !== 'admin') return
    setLoading(true)
    try {
      const data = await apiFetch('/auth')
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error('Erro ao listar usuários: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [role])

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

  const handleDeleteAllParticipants = async () => {
    if (!window.confirm('ALERTA MÁXIMO!\n\nVocê tem certeza ABSOLUTA que deseja DELETAR TODOS OS PARTICIPANTES e seus históricos? Essa ação NÃO PODE ser revertida!')) return
    
    // Double confirmation for safety
    if (!window.confirm('Você entende que TODOS os dados serão apagados definitivamente?')) return

    setLoadingAction(true)
    try {
      await apiFetch('/participants/all', { method: 'DELETE' })
      toast.success('Todos os participantes foram excluídos do banco de dados definitivamente.')
    } catch (err) {
      toast.error('Erro ao excluir todos os participantes: ' + err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  if (role !== 'admin') {
    return <p className="text-white">Acesso negado.</p>
  }

  return (
    <div className="space-y-8">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-2">Usuários Convidados</h3>
        <p className="text-sm text-white/60 mb-5">
          Lista de convidados com acesso ao painel de secretaria (para visualizar e cadastrar).
        </p>

        {loading ? (
          <p className="text-sm text-white/50">Carregando usuários...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-white/50">Nenhum usuário convidado encontrado.</p>
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
        <h3 className="text-lg font-bold text-red-400 mb-2">Zona de Perigo</h3>
        <p className="text-sm text-white/60 mb-5">
          Ação irreversível. Isso apaga permanentemente todos os participantes cadastrados, incluindo histórico de frequência e estudos.
        </p>
        <button
          onClick={handleDeleteAllParticipants}
          disabled={loadingAction}
          className="text-sm font-bold bg-red-600 text-white px-5 py-2.5 rounded-xl border border-red-800 hover:bg-red-500 transition shadow-lg cursor-pointer disabled:opacity-50"
        >
          Deletar banco de participantes e históricos
        </button>
      </div>
    </div>
  )
}
