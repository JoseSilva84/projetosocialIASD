import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { apiFetch } from '../../lib/api'
import { BIBLICAL_LESSONS } from '../../lib/biblicalLessons'
import LessonProgressRing from './LessonProgressRing'

/** Mongo / JSON podem devolver _id como string ou objeto; o select compara com string. */
function participantIdString(p) {
  if (!p || p._id == null) return ''
  const id = p._id
  if (typeof id === 'object' && id !== null && typeof id.toString === 'function') {
    return id.toString()
  }
  return String(id)
}

export default function BiblicalStudyPanel({ participants, loadingList, onUpdated }) {
  const [participantId, setParticipantId] = useState('')
  const [currentLesson, setCurrentLesson] = useState(null)
  const [completed, setCompleted] = useState(() => new Set())

  const selected = useMemo(
    () => participants.find((p) => participantIdString(p) === participantId),
    [participants, participantId]
  )

  useEffect(() => {
    if (!selected) {
      setCurrentLesson(null)
      setCompleted(new Set())
      return
    }
    setCurrentLesson(
      selected.selectedBiblicalLesson != null ? selected.selectedBiblicalLesson : null
    )
    setCompleted(new Set(selected.biblicalLessonsCompleted || []))
  }, [selected])

  function toggleCompleted(lessonId) {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(lessonId)) next.delete(lessonId)
      else next.add(lessonId)
      return next
    })
  }

  async function handleSave() {
    if (!participantId) {
      toast.error('Selecione um participante já inscrito.')
      return
    }
    if (currentLesson == null) {
      toast.error('Escolha a lição em estudo (anel ou cartão).')
      return
    }
    try {
      await apiFetch(`/participants/${participantId}/biblical-study`, {
        method: 'PATCH',
        body: JSON.stringify({
          selectedBiblicalLesson: currentLesson,
          biblicalLessonsCompleted: Array.from(completed).sort((a, b) => a - b),
        }),
      })
      toast.success('Estudo bíblico atualizado com sucesso.')
      onUpdated?.()
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loadingList) {
    return <p className="text-sm text-white/50 text-center py-12">Carregando participantes…</p>
  }

  if (participants.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 px-6 py-10 text-center">
        <p className="text-white/90 font-medium">Nenhum participante inscrito ainda.</p>
        <p className="text-sm text-white/55 mt-2">
          Cadastre alguém na aba <strong className="text-white/80">Inscrições</strong> para depois
          atribuir lições de estudo bíblico.
        </p>
      </div>
    )
  }

  const completedArr = Array.from(completed)

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <label className="block flex-1 max-w-md">
          <span className="text-xs text-white/50 mb-2 block">Participante inscrito</span>
          <select
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="participant-select w-full rounded-xl border border-white/15 px-4 py-3 text-sm outline-none focus:border-amber-400/50 cursor-pointer"
          >
            <option value="">Selecione…</option>
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
        <button
          type="button"
          onClick={handleSave}
          disabled={!participantId}
          className="rounded-full bg-linear-to-r from-amber-700/90 via-amber-600 to-amber-700/90 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition disabled:opacity-40"
        >
          Salvar progresso
        </button>
      </div>

      {!participantId ? (
        <p className="text-sm text-white/45 text-center py-6">Escolha um participante para ver o painel.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <LessonProgressRing
              completedIds={completedArr}
              currentId={currentLesson}
              onSegmentClick={(id) => setCurrentLesson(id)}
            />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-2">
              <h3 className="text-sm font-semibold text-amber-200/90">Legenda</h3>
              <ul className="text-xs text-white/65 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-emerald-400/80" /> Concluída
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-amber-400/85" /> Estudo atual
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-slate-400/40" /> Pendente
                </li>
              </ul>
              <p className="text-xs text-white/45 pt-2 border-t border-white/10">
                Participante: <span className="text-white/80">{selected?.name}</span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/90 mb-3">Lições (1 a 15)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {BIBLICAL_LESSONS.map((lesson) => {
                const isDone = completed.has(lesson.id)
                const isCurrent = currentLesson === lesson.id
                return (
                  <div
                    key={lesson.id}
                    className={`rounded-2xl border px-4 py-3 transition ${
                      isCurrent
                        ? 'border-amber-400/60 bg-amber-950/35 ring-1 ring-amber-500/30'
                        : 'border-white/10 bg-black/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-amber-200/80">Lição {lesson.id}</p>
                        <p className="text-sm font-medium text-white mt-0.5">{lesson.title}</p>
                        <p className="text-xs text-white/45 mt-1">{lesson.ref}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => setCurrentLesson(lesson.id)}
                        className={`text-xs rounded-full px-3 py-1.5 font-medium transition ${
                          isCurrent
                            ? 'bg-amber-500/30 text-amber-100'
                            : 'bg-white/10 text-white/75 hover:bg-white/15'
                        }`}
                      >
                        Estudo atual
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCompleted(lesson.id)}
                        className={`text-xs rounded-full px-3 py-1.5 font-medium transition ${
                          isDone
                            ? 'bg-emerald-600/40 text-emerald-100'
                            : 'bg-white/10 text-white/65 hover:bg-white/15'
                        }`}
                      >
                        {isDone ? 'Concluída ✓' : 'Marcar concluída'}
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
