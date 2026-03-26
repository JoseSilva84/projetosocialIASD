import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { apiFetch } from '../../lib/api'
import { FREQUENCY_DAYS } from '../../lib/frequencyDays'

function participantIdString(p) {
  if (!p || p._id == null) return ''
  const id = p._id
  if (typeof id === 'object' && id !== null && typeof id.toString === 'function') {
    return id.toString()
  }
  return String(id)
}

export default function FrequencyPanel({ participants, loadingList, onUpdated, readOnly = false }) {
  const [participantId, setParticipantId] = useState('')
  const [attended, setAttended] = useState(() => new Map())

  const selected = useMemo(
    () => participants.find((p) => participantIdString(p) === participantId),
    [participants, participantId]
  )

  useEffect(() => {
    if (!selected) {
      setAttended(new Map())
      return
    }

    const attendedMap = new Map()
    if (selected.frequencyAttended) {
      selected.frequencyAttended.forEach((item) => {
        attendedMap.set(item.dayId, item.markedDate)
      })
    }
    setAttended(attendedMap)
  }, [selected])

  function toggleAttended(dayId) {
    if (readOnly) return

    setAttended((prev) => {
      const next = new Map(prev)
      if (next.has(dayId)) next.delete(dayId)
      else next.set(dayId, new Date().toISOString())
      return next
    })
  }

  async function handleSave() {
    if (readOnly) {
      toast.info('Somente o administrador pode alterar a frequencia.')
      return
    }

    if (!participantId) {
      toast.error('Selecione um participante ja inscrito.')
      return
    }

    try {
      const frequencyAttended = Array.from(attended.entries()).map(([dayId, markedDate]) => ({
        dayId,
        markedDate,
      }))

      await apiFetch(`/participants/${participantId}/frequency`, {
        method: 'PATCH',
        body: JSON.stringify({ frequencyAttended }),
      })

      toast.success('Frequencia atualizada com sucesso.')
      onUpdated?.()
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loadingList) {
    return <p className="text-sm text-white/50 text-center py-12">Carregando participantes...</p>
  }

  if (participants.length === 0) {
    return (
      <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 px-6 py-10 text-center">
        <p className="text-white/90 font-medium">Nenhum participante inscrito ainda.</p>
        <p className="text-sm text-white/55 mt-2">
          Cadastre alguem na aba <strong className="text-white/80">Inscricoes</strong> para depois
          registrar frequencia.
        </p>
      </div>
    )
  }

  const attendedArr = Array.from(attended.keys())

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="block flex-1 max-w-md">
          <span className="text-xs text-white/50 mb-2 block">Participante inscrito</span>
          <select
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="participant-select w-full rounded-xl border border-white/15 px-4 py-3 text-sm outline-none focus:border-blue-400/50 cursor-pointer"
          >
            <option value="">Selecione...</option>
            {participants.map((p) => {
              const id = participantIdString(p)
              return (
                <option key={id} value={id}>
                  {p.name}
                </option>
              )
            })}
          </select>
        </label>

        {readOnly ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/65">
            Visualizacao apenas. A frequencia so pode ser alterada pelo administrador.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={!participantId}
            className="rounded-full bg-linear-to-r from-blue-700/90 via-blue-600 to-blue-700/90 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition disabled:opacity-40 cursor-pointer"
          >
            Salvar frequencia
          </button>
        )}
      </div>

      {!participantId ? (
        <p className="text-sm text-white/45 text-center py-6">
          Escolha um participante para ver o painel de frequencia.
        </p>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-2">
            <h3 className="text-sm font-semibold text-blue-200/90">Resumo da frequencia</h3>
            <ul className="text-xs text-white/65 space-y-2">
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-emerald-400/80" /> Presente
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-slate-400/40" /> Ausente
              </li>
            </ul>
            <p className="text-xs text-white/45 pt-2 border-t border-white/10">
              Participante: <span className="text-white/80">{selected?.name}</span> | Presencas:{' '}
              {attendedArr.length}/25
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/90 mb-3">Dias de frequencia (1 a 25)</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {FREQUENCY_DAYS.map((day) => {
                const isAttended = attended.has(day.id)

                return (
                  <div
                    key={day.id}
                    className={`rounded-2xl border px-4 py-3 transition ${
                      isAttended
                        ? 'border-emerald-400/60 bg-emerald-950/35 ring-1 ring-emerald-500/30'
                        : 'border-white/10 bg-black/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-blue-200/80">Dia {day.id}</p>
                        <p className="text-sm font-medium text-white mt-0.5">{day.label}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => toggleAttended(day.id)}
                        disabled={readOnly}
                        className={`text-xs rounded-full px-3 py-1.5 font-medium transition ${
                          isAttended
                            ? 'bg-emerald-600/40 text-emerald-100'
                            : 'bg-white/10 text-white/75 hover:bg-white/15'
                        } ${readOnly ? 'cursor-default opacity-80' : ''}`}
                      >
                        {readOnly
                          ? isAttended
                            ? 'Presente'
                            : 'Ausente'
                          : isAttended
                            ? 'Presente'
                            : 'Marcar presente'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
