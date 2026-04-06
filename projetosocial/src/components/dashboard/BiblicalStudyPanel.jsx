import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { apiFetch } from '../../lib/api'
import { BIBLICAL_LESSONS } from '../../lib/biblicalLessons'
import LessonProgressRing from './LessonProgressRing'

function participantIdString(p) {
  if (!p || p._id == null) return ''
  const id = p._id
  if (typeof id === 'object' && id !== null && typeof id.toString === 'function') {
    return id.toString()
  }
  return String(id)
}

function getCompletedSet(participant) {
  return new Set(participant?.biblicalLessonsCompleted || [])
}

function getRankingVisual(index) {
  if (index === 0) {
    return {
      medal: 'Ouro',
      icon: '1',
      badge: 'from-amber-300 via-yellow-200 to-amber-500 text-amber-950',
      card: 'border-amber-300/35 bg-linear-to-br from-amber-300/18 via-amber-950/28 to-black/30',
      glow: 'shadow-[0_16px_50px_rgba(251,191,36,0.16)]',
      bar: 'from-amber-200 via-yellow-300 to-amber-500',
    }
  }

  if (index === 1) {
    return {
      medal: 'Prata',
      icon: '2',
      badge: 'from-slate-100 via-slate-300 to-slate-500 text-slate-950',
      card: 'border-slate-300/25 bg-linear-to-br from-slate-200/12 via-slate-900/24 to-black/30',
      glow: 'shadow-[0_16px_50px_rgba(203,213,225,0.10)]',
      bar: 'from-slate-100 via-slate-300 to-slate-500',
    }
  }

  if (index === 2) {
    return {
      medal: 'Bronze',
      icon: '3',
      badge: 'from-orange-200 via-orange-400 to-amber-700 text-orange-950',
      card: 'border-orange-300/25 bg-linear-to-br from-orange-300/12 via-orange-950/24 to-black/30',
      glow: 'shadow-[0_16px_50px_rgba(251,146,60,0.12)]',
      bar: 'from-orange-200 via-orange-400 to-amber-600',
    }
  }

  return {
    medal: `#${index + 1}`,
    icon: String(index + 1),
    badge: 'from-white/90 via-slate-200 to-slate-400 text-slate-950',
    card: 'border-white/10 bg-black/20',
    glow: '',
    bar: 'from-emerald-400 via-amber-300 to-amber-500',
  }
}

export default function BiblicalStudyPanel({
  participants,
  loadingList,
  onUpdated,
  onLessonSelected,
  onParticipantSelected,
  readOnly = false,
  initialParticipantId = '',
}) {
  const [participantId, setParticipantId] = useState(initialParticipantId)
  const [currentLesson, setCurrentLesson] = useState(() => {
    const initialParticipant = participants.find((p) => participantIdString(p) === initialParticipantId)
    return initialParticipant?.selectedBiblicalLesson != null ? initialParticipant.selectedBiblicalLesson : null
  })
  const [completed, setCompleted] = useState(() => {
    const initialParticipant = participants.find((p) => participantIdString(p) === initialParticipantId)
    return getCompletedSet(initialParticipant)
  })
  const [rankingLimit, setRankingLimit] = useState(5)
  const [rankingMetric, setRankingMetric] = useState('completed')

  const selected = useMemo(
    () => participants.find((p) => participantIdString(p) === participantId),
    [participants, participantId]
  )

  useEffect(() => {
    if (typeof onLessonSelected === 'function') {
      onLessonSelected(currentLesson)
    }
  }, [currentLesson, onLessonSelected])

  useEffect(() => {
    if (typeof onParticipantSelected === 'function') {
      onParticipantSelected(participantId)
    }
  }, [participantId, onParticipantSelected])

  const rankingParticipants = useMemo(() => {
    const ranked = [...participants].sort((a, b) => {
      const aCompleted = Array.isArray(a?.biblicalLessonsCompleted) ? a.biblicalLessonsCompleted.length : 0
      const bCompleted = Array.isArray(b?.biblicalLessonsCompleted) ? b.biblicalLessonsCompleted.length : 0
      const aCurrent = Number.isInteger(Number(a?.selectedBiblicalLesson)) ? Number(a.selectedBiblicalLesson) : 0
      const bCurrent = Number.isInteger(Number(b?.selectedBiblicalLesson)) ? Number(b.selectedBiblicalLesson) : 0
      const aProgress = aCompleted + (aCurrent > 0 ? 0.5 : 0)
      const bProgress = bCompleted + (bCurrent > 0 ? 0.5 : 0)

      if (rankingMetric === 'progress' && bProgress !== aProgress) return bProgress - aProgress
      if (bCompleted !== aCompleted) return bCompleted - aCompleted
      if (bCurrent !== aCurrent) return bCurrent - aCurrent
      return (a?.name || '').localeCompare(b?.name || '', 'pt-BR', { sensitivity: 'base' })
    })

    return rankingLimit === 'all' ? ranked : ranked.slice(0, rankingLimit)
  }, [participants, rankingLimit, rankingMetric])

  function toggleCompleted(lessonId) {
    if (readOnly) return

    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(lessonId)) next.delete(lessonId)
      else next.add(lessonId)
      return next
    })
  }

  async function handleSave() {
    if (readOnly) {
      toast.info('Somente o administrador pode alterar o estudo bíblico.')
      return
    }

    if (!participantId) {
      toast.error('Selecione um participante já inscrito.')
      return
    }

    if (currentLesson == null) {
      toast.error('Escolha a lição do estudo.')
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

      toast.success('Estudo biblico atualizado com sucesso.')
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
      <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 px-6 py-10 text-center">
        <p className="text-white/90 font-medium">Nenhum participante inscrito ainda.</p>
        <p className="text-sm text-white/55 mt-2">
          Cadastre alguem na aba <strong className="text-white/80">Inscrições</strong> para depois
          atribuir lições ao estudo bíblico.
        </p>
      </div>
    )
  }

  const completedArr = Array.from(completed)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="block flex-1 max-w-md">
          <span className="text-xs text-white/50 mb-2 block">Participante inscrito</span>
          <select
            value={participantId}
            onChange={(e) => {
              const nextParticipantId = e.target.value
              const nextSelected = participants.find((p) => participantIdString(p) === nextParticipantId)
              setParticipantId(nextParticipantId)
              setCurrentLesson(nextSelected?.selectedBiblicalLesson != null ? nextSelected.selectedBiblicalLesson : null)
              setCompleted(getCompletedSet(nextSelected))
            }}
            className="participant-select w-full rounded-xl border border-white/15 px-4 py-3 text-sm outline-none focus:border-amber-400/50 cursor-pointer"
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
            Visualizacao apenas. O estudo bíblico so pode ser alterado pelo administrador.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={!participantId}
            className="rounded-full bg-linear-to-r from-amber-700/90 via-amber-600 to-amber-700/90 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition disabled:opacity-40 cursor-pointer"
          >
            Salvar progresso
          </button>
        )}
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
              readOnly={readOnly}
            />

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-2">
              <h3 className="text-sm font-semibold text-amber-200/90">Legenda</h3>
              <ul className="text-xs text-white/65 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-emerald-400/80" /> Concluida
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
            <h3 className="text-sm font-semibold text-white/90 mb-3">Licoes (1 a 15)</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                        disabled={readOnly}
                        className={`text-xs rounded-full px-3 py-1.5 font-medium transition cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-500/30 text-amber-100'
                            : 'bg-white/10 text-white/75 hover:bg-white/15'
                        } ${readOnly ? 'cursor-default opacity-80' : ''}`}
                      >
                        {readOnly ? (isCurrent ? 'Estudo atual' : 'Pendente') : 'Estudo atual'}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleCompleted(lesson.id)}
                        disabled={readOnly}
                        className={`text-xs rounded-full px-3 py-1.5 font-medium transition cursor-pointer ${
                          isDone
                            ? 'bg-emerald-600/40 text-emerald-100'
                            : 'bg-white/10 text-white/65 hover:bg-white/15'
                        } ${readOnly ? 'cursor-default opacity-80' : ''}`}
                      >
                        {readOnly ? (isDone ? 'Concluída' : 'Pendente') : isDone ? 'Concluida' : 'Marcar concluída'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      <section className="relative overflow-hidden rounded-[28px] border border-amber-400/15 bg-linear-to-br from-amber-950/35 via-slate-950/40 to-black/50 p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(52,211,153,0.12),transparent_24%)]" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/65">
              Ranking bíblico
            </p>
            <h3 className="mt-2 text-xl font-bold text-white">Participantes com mais estudos concluídos</h3>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Clique em um participante do ranking para abrir o progresso dele no painel acima.
            </p>
          </div>

          <div className="relative flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'completed', label: 'Mais concluídas' },
                { id: 'progress', label: 'Progresso geral' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRankingMetric(option.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                    rankingMetric === option.id
                      ? 'border-amber-300/60 bg-amber-400/20 text-amber-50'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 5, label: 'Top 5' },
                { id: 10, label: 'Top 10' },
                { id: 'all', label: 'Todos' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRankingLimit(option.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                    rankingLimit === option.id
                      ? 'border-white/25 bg-white/15 text-white'
                      : 'border-white/10 bg-black/20 text-white/65 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3">
          {rankingParticipants.map((participant, index) => {
            const id = participantIdString(participant)
            const completedLessons = Array.isArray(participant?.biblicalLessonsCompleted)
              ? participant.biblicalLessonsCompleted.length
              : 0
            const currentSelectedLesson = Number.isInteger(Number(participant?.selectedBiblicalLesson))
              ? Number(participant.selectedBiblicalLesson)
              : null
            const overallProgress = Math.min(
              ((completedLessons + (currentSelectedLesson ? 0.5 : 0)) / BIBLICAL_LESSONS.length) * 100,
              100
            )
            const isSelected = participantId === id
            const visual = getRankingVisual(index)

            return (
              <button
                key={id}
                type="button"
                onClick={() => setParticipantId(id)}
                className={`w-full rounded-3xl border px-4 py-4 text-left transition cursor-pointer ${
                  isSelected
                    ? 'border-amber-300/45 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,0.15)]'
                    : `${visual.card} ${visual.glow} hover:border-white/20 hover:bg-white/5`
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="space-y-2">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${visual.badge} text-base font-black shadow-lg`}
                      >
                        {visual.icon}
                      </div>
                      <span className="block text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                        {visual.medal}
                      </span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{participant?.name || 'Sem nome'}</h4>
                        {isSelected ? (
                          <span className="rounded-full border border-amber-300/30 bg-amber-300/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                            Em edição
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        {completedLessons}/{BIBLICAL_LESSONS.length} lições concluídas
                        {currentSelectedLesson ? ` • Lição atual ${currentSelectedLesson}` : ' • Sem lição em andamento'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-end">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="block text-[11px] uppercase tracking-[0.18em] text-white/45">Concluídas</span>
                      <strong className="mt-1 block text-base text-emerald-300">{completedLessons}</strong>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="block text-[11px] uppercase tracking-[0.18em] text-white/45">Lição atual</span>
                      <strong className="mt-1 block text-base text-sky-200">{currentSelectedLesson || '—'}</strong>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="block text-[11px] uppercase tracking-[0.18em] text-white/45">Progresso</span>
                      <strong className="mt-1 block text-base text-amber-200">{overallProgress.toFixed(0)}%</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/40">
                    <span>Avanço nas 15 lições</span>
                    <span>{overallProgress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className={`h-full rounded-full bg-linear-to-r ${visual.bar} transition-[width] duration-300`}
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
