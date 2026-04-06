import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import jogo from '../../../backend/quiz.json'
import { apiFetch } from '../lib/api'

function normalizeText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join('; ')
  }

  if (value && typeof value === 'object') {
    return Object.values(value).map((item) => String(item).trim()).filter(Boolean).join('; ')
  }

  return String(value || '').trim()
}

function shuffleArray(array) {
  return array.slice().sort(() => Math.random() - 0.5)
}

function buildOptions(question, questions) {
  const correctText = normalizeText(question.resposta)
  const options = []

  if (Array.isArray(question.opcoes) && question.opcoes.length >= 2) {
    const correctOption = question.opcoes.find((option) => {
      if (Array.isArray(question.resposta)) {
        return question.resposta.some((answer) => normalizeText(answer) === normalizeText(option))
      }
      return normalizeText(option) === correctText
    })
    const wrongOption = question.opcoes.find((option) => {
      if (Array.isArray(question.resposta)) {
        return !question.resposta.some((answer) => normalizeText(answer) === normalizeText(option))
      }
      return normalizeText(option) !== correctText
    }) || question.opcoes.find((option) => option !== correctOption) || question.opcoes[0]

    if (correctOption) {
      options.push({ text: normalizeText(correctOption), isCorrect: true })
      options.push({ text: normalizeText(wrongOption), isCorrect: false })
    } else {
      options.push({ text: correctText, isCorrect: true })
      options.push({ text: normalizeText(question.opcoes[0]), isCorrect: false })
    }
  } else {
    const distractor = questions
      .map((item) => normalizeText(item.resposta))
      .filter((text) => text && text !== correctText)[0] || 'Nenhuma das alternativas'

    options.push({ text: correctText, isCorrect: true })
    options.push({ text: distractor, isCorrect: false })
  }

  return shuffleArray(options)
}

function getStudyIndexFromParam(raw) {
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return 0
  return Math.max(0, Math.min(parsed - 1, (jogo.estudos?.length || 1) - 1))
}

function createAudioContext() {
  return new (window.AudioContext || window.webkitAudioContext)()
}

function playTone(audioContext, frequency, duration, type = 'sine', delay = 0) {
  const now = audioContext.currentTime + delay
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.05)
}

const Quiz = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const audioContext = useMemo(() => createAudioContext(), [])
  const [participants, setParticipants] = useState([])
  const [loadingParticipants, setLoadingParticipants] = useState(true)
  const [studyIndex, setStudyIndex] = useState(() => getStudyIndexFromParam(new URLSearchParams(location.search).get('study')))
  const [selectedScoringParticipantId, setSelectedScoringParticipantId] = useState(() => new URLSearchParams(location.search).get('participant') || '')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [score, setScore] = useState(0)
  const [questionPoints, setQuestionPoints] = useState(10)
  const [confirmOption, setConfirmOption] = useState(null)

  const loadParticipants = async () => {
    try {
      const data = await apiFetch('/participants')
      setParticipants(data || [])
    } catch (err) {
      toast.error('Erro ao recarregar participantes: ' + err.message)
    }
  }

  useEffect(() => {
    let active = true

    async function load() {
      setLoadingParticipants(true)
      try {
        await loadParticipants()
      } catch (err) {
        if (active) {
          toast.error('Não foi possível carregar os participantes: ' + err.message)
        }
      } finally {
        if (active) {
          setLoadingParticipants(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setStudyIndex(getStudyIndexFromParam(params.get('study')))
    setSelectedScoringParticipantId(params.get('participant') || '')
  }, [location.search])

  const studies = useMemo(() => jogo.estudos || [], [])
  const currentStudy = useMemo(() => studies[studyIndex] || { perguntas: [] }, [studies, studyIndex])
  const questions = useMemo(() => currentStudy.perguntas || [], [currentStudy])
  const question = questions[questionIndex]

  const options = useMemo(() => {
    if (!question) return []
    return buildOptions(question, questions)
  }, [question, questions])

  const handleStudyChange = (event) => {
    const nextIndex = Number(event.target.value)
    setStudyIndex(nextIndex)
    setQuestionIndex(0)
    setSelectedOption(null)
    setIsCorrect(null)
    setScore(0)
    setQuestionPoints(10)
    setConfirmOption(null)
  }

  const resumeAudioContext = async () => {
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
  }

  const playSuccessSound = async () => {
    await resumeAudioContext()
    playTone(audioContext, 880, 0.16, 'triangle')
    playTone(audioContext, 1040, 0.12, 'triangle', 0.12)
    await new Promise((resolve) => setTimeout(resolve, 260))
  }

  const playErrorSound = async () => {
    await resumeAudioContext()
    playTone(audioContext, 220, 0.14, 'sine')
    playTone(audioContext, 180, 0.14, 'sine', 0.12)
    await new Promise((resolve) => setTimeout(resolve, 280))
  }

  const handleOptionClick = (option) => {
    if (selectedOption || !question) return
    setConfirmOption(option)
  }

  const confirmAnswer = async () => {
    if (!confirmOption) return
    const option = confirmOption
    setConfirmOption(null)
    setSelectedOption(option.text)
    setIsCorrect(option.isCorrect)

    if (option.isCorrect) {
      setScore((prevScore) => prevScore + 1)
      await playSuccessSound()
      toast.success('Resposta correta!')

      if (selectedScoringParticipantId) {
        try {
          await apiFetch(`/participants/${selectedScoringParticipantId}/extra-score`, {
            method: 'PATCH',
            body: JSON.stringify({ points: questionPoints, reason: `Quiz: ${currentStudy.tema} - Pergunta ${questionIndex + 1}` }),
          })
          toast.success(`Pontos registrados no ranking!`)
          await loadParticipants()
        } catch (err) {
          toast.error('Falha ao registrar pontos: ' + err.message)
        }
      }
    } else {
      await playErrorSound()
      toast.error('Resposta incorreta!')
    }
  }

  const cancelConfirm = () => {
    setConfirmOption(null)
  }

  const handleNextQuestion = () => {
    if (questionIndex + 1 >= questions.length) {
      return
    }
    setQuestionIndex((prev) => prev + 1)
    setSelectedOption(null)
    setIsCorrect(null)
  }

  const handleRestart = () => {
    setQuestionIndex(0)
    setSelectedOption(null)
    setIsCorrect(null)
    setScore(0)
    setQuestionPoints(10)
    setConfirmOption(null)
  }

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const scoreA = (a.scoreSummary?.totalScore || 0)
      const scoreB = (b.scoreSummary?.totalScore || 0)
      if (scoreB !== scoreA) return scoreB - scoreA
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' })
    })
  }, [participants])

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('/participantes')}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 cursor-pointer"
            >
              Voltar ao Estudo Bíblico
            </button>
            <div className="rounded-full bg-amber-500/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-amber-200">
              Quiz bíblico
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white">{jogo.titulo}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">{currentStudy.tema || 'Selecione um estudo para iniciar o quiz bíblico.'}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-white/70">
              Estudo do quiz
              <select
                value={studyIndex}
                onChange={handleStudyChange}
                className="rounded-3xl bg-slate-900/90 border border-white/10 px-4 py-3 text-white outline-none transition focus:border-amber-400 cursor-pointer"
              >
                {studies.map((study, index) => (
                  <option key={study.estudo || index} value={index}>
                    Estudo {study.estudo} — {study.tema}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-white/70">
              Participante para pontuação
              <select
                value={selectedScoringParticipantId}
                onChange={(event) => setSelectedScoringParticipantId(event.target.value)}
                className="rounded-3xl bg-slate-900/90 border border-white/10 px-4 py-3 text-white outline-none transition focus:border-amber-400 cursor-pointer"
              >
                <option value="">Nenhum participante selecionado</option>
                {sortedParticipants.map((participant) => (
                  <option key={participant._id} value={participant._id}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-white/70">
              Pontos por pergunta (padrão 10)
              <input
                type="number"
                min="1"
                value={questionPoints}
                onChange={(event) => setQuestionPoints(Number(event.target.value) || 10)}
                className="rounded-3xl bg-slate-900/90 border border-white/10 px-4 py-3 text-white outline-none transition focus:border-amber-400 cursor-pointer"
              />
            </label>
          </div>
          {loadingParticipants && (
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              Carregando participantes para pontuação...
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-inner shadow-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Resumo do quiz</p>
              <p className="mt-2 text-lg font-semibold text-white">
                Estudo: {currentStudy.tema || 'Nenhum estudo selecionado'}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              Acertos: {score} / {questions.length || 1}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-950/90 p-4 text-sm text-slate-300">
            Use este quiz para revisar cada lição do estudo atual. Ao finalizar, registre a pontuação manualmente no ranking.
          </div>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
          Nenhuma pergunta encontrada para este estudo.
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Pergunta {questionIndex + 1} de {questions.length}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{question?.pergunta}</h2>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                {isCorrect === null ? 'Escolha uma alternativa' : isCorrect ? 'Resposta correta' : 'Resposta incorreta'}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {options.map((option, index) => {
                const selected = selectedOption === option.text
                const optionClass = selected
                  ? option.isCorrect
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100'
                    : 'border-rose-400 bg-rose-500/10 text-rose-100'
                  : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'

                return (
                  <button
                    type="button"
                    key={`${option.text}-${index}`}
                    disabled={!!selectedOption}
                    onClick={() => handleOptionClick(option)}
                    className={`rounded-3xl border px-5 py-5 text-left text-sm font-medium transition cursor-pointer ${optionClass}`}
                  >
                    {option.text}
                  </button>
                )
              })}
            </div>

            {confirmOption && (
              <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-6">
                <p className="text-lg font-semibold text-white">Tem certeza da sua resposta?</p>
                <p className="mt-2 text-sm text-slate-300">Você selecionou: <strong>{confirmOption.text}</strong></p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={confirmAnswer}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-emerald-500 transition cursor-pointer"
                  >
                    Sim, confirmar
                  </button>
                  <button
                    type="button"
                    onClick={cancelConfirm}
                    className="rounded-full bg-slate-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-slate-500 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {selectedOption && (
              <div className={`mt-6 rounded-3xl border px-5 py-4 text-sm ${isCorrect ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100' : 'border-rose-400 bg-rose-500/10 text-rose-100'}`}>
                <p className="font-semibold">{isCorrect ? 'Muito bem!' : 'Essa não foi a melhor escolha.'}</p>
                {!isCorrect && (
                  <p className="mt-2 text-white/80">Resposta certa: {normalizeText(question.resposta)}</p>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {selectedOption && questionIndex < questions.length - 1 && (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-amber-500 transition cursor-pointer"
                >
                  Próxima pergunta
                </button>
              )}

              {selectedOption && questionIndex === questions.length - 1 && (
                <div className="flex flex-col gap-3 text-right">
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="rounded-full bg-slate-700 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-600 transition cursor-pointer"
                  >
                    Refazer quiz
                  </button>
                  <p className="text-sm text-white/70">
                    Quiz finalizado — você acertou {score} de {questions.length} perguntas.
                  </p>
                </div>
              )}
            </div>
          </div>

          {selectedOption && questionIndex === questions.length - 1 && (
            <section className="mt-6">
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
                <h3 className="text-lg font-semibold text-white">Resumo da lição</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {currentStudy.tema}
                </p>
                <div className="mt-5 grid gap-3 text-sm text-slate-300">
                  <div className="rounded-3xl bg-white/5 px-4 py-3">
                    <p className="font-semibold text-white">Estudo</p>
                    <p className="mt-2 text-slate-300">{currentStudy.estudo}</p>
                  </div>
                  <div className="rounded-3xl bg-white/5 px-4 py-3">
                    <p className="font-semibold text-white">Perguntas</p>
                    <p className="mt-2 text-slate-300">{questions.length} perguntas</p>
                  </div>
                  <div className="rounded-3xl bg-white/5 px-4 py-3">
                    <p className="font-semibold text-white">Pontuação obtida</p>
                    <p className="mt-2 text-slate-300">{score} pontos de acerto</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="mt-6 rounded-full bg-slate-700 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-600 transition cursor-pointer"
                >
                  Refazer quiz
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
        <h3 className="text-lg font-semibold text-white">Ranking dos Participantes</h3>
        <p className="mt-2 text-sm text-slate-400">Pontuações atualizadas em tempo real.</p>
        <div className="mt-4 space-y-2">
          {sortedParticipants.slice(0, 10).map((participant, index) => {
            const scoreSummary = participant.scoreSummary || {}
            const totalScore = scoreSummary.totalScore || 0
            return (
              <div key={participant._id} className="flex items-center justify-between rounded-3xl bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-amber-400">#{index + 1}</span>
                  <span className="text-sm text-white">{participant.name}</span>
                </div>
                <span className="text-sm font-semibold text-white">{totalScore} pontos</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default Quiz
