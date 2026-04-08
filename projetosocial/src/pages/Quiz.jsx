import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import jogo from '../../../backend/quiz.json'
import { apiFetch, getUserRole } from '../lib/api'


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

function getCorrectAnswers(question) {
  if (Array.isArray(question.resposta)) {
    return question.resposta.map((item) => normalizeText(item)).filter(Boolean)
  }

  if (question.resposta && typeof question.resposta === 'object') {
    return Object.values(question.resposta).map((item) => normalizeText(item)).filter(Boolean)
  }

  return [normalizeText(question.resposta)]
}

function buildOptions(question, questions) {
  const correctAnswers = getCorrectAnswers(question)
  if (Array.isArray(question.opcoes) && question.opcoes.length > 0) {
    const options = question.opcoes
      .map((optionText) => normalizeText(optionText))
      .filter(Boolean)
      .map((optionText) => ({
        text: optionText,
        isCorrect: correctAnswers.includes(optionText),
      }))

    return shuffleArray(options)
  }

  const correctText = correctAnswers[0] || ''
  const options = [{ text: correctText, isCorrect: true }]

  const distractors = questions
    .filter((q) => q !== question)
    .map((q) => normalizeText(q.resposta))
    .filter((text) => text && text !== correctText)

  const shuffledDistractors = shuffleArray(distractors).slice(0, 2)

  while (shuffledDistractors.length < 2) {
    const variation = correctText + ' (alternativa incorreta)'
    if (!shuffledDistractors.includes(variation)) {
      shuffledDistractors.push(variation)
    } else {
      break
    }
  }

  shuffledDistractors.forEach((distractor) => {
    options.push({ text: distractor, isCorrect: false })
  })

  return shuffleArray(options)
}

function getRandomQuestions(studies) {
  const allQuestions = []
  for (const study of studies) {
    if (study.perguntas && Array.isArray(study.perguntas)) {
      allQuestions.push(...study.perguntas)
    }
  }
  return shuffleArray(allQuestions)
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
  const [selectedOptions, setSelectedOptions] = useState([])
  const [isCorrect, setIsCorrect] = useState(null)
  const [score, setScore] = useState(0)
  const [showQuizRankingAll, setShowQuizRankingAll] = useState(false)
  const [questionPoints, setQuestionPoints] = useState(10)
  const [inputPointsValue, setInputPointsValue] = useState("10")
  const [confirmOption, setConfirmOption] = useState(null)
  const [wrongQuestionIndexes, setWrongQuestionIndexes] = useState([])
  const [timeLeft, setTimeLeft] = useState(60)
  const [isTimerPaused, setIsTimerPaused] = useState(false)
  const [quizConfig, setQuizConfig] = useState({ quizEnabled: false, quizQuestionPoints: 10 })
  const [quizStarted, setQuizStarted] = useState(false)
  const userRole = getUserRole()
  
  // Inicializar pontos com config do servidor
  useEffect(() => {
    if (quizConfig.quizQuestionPoints) {
      setQuestionPoints(quizConfig.quizQuestionPoints)
      setInputPointsValue(quizConfig.quizQuestionPoints.toString())
    }
  }, [quizConfig.quizQuestionPoints])

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
      try {
        const [participantsData, configData] = await Promise.all([
          apiFetch('/participants').catch(() => []),
          apiFetch('/ranking-config').catch(() => ({ quizEnabled: false, quizQuestionPoints: 10 }))
        ])
        if (active) {
          setParticipants(participantsData)
          setQuizConfig(configData)
          // Se quiz desabilitado para convidado e usuário é convidado, redirecionar ou mostrar aviso
          if (!configData.quizEnabled && userRole === 'convidado') {
            toast.warning('Quiz desabilitado para usuários convidados pelo administrador.')
            navigate('/participantes')
            return
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do quiz:', err)
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
  }, [userRole])

  useEffect(() => {
    setTimeLeft(60)
    setIsTimerPaused(false)
    setConfirmOption(null)
    setSelectedOptions([])
    setSelectedOption(null)
    setIsCorrect(null)
  }, [questionIndex])

  const studies = useMemo(() => jogo.estudos || [], [])
  const currentStudy = useMemo(() => {
    if (studyIndex === -1) {
      // Perguntas Aleatórias
      return {
        tema: 'Perguntas Aleatórias',
        estudo: 'Aleató​rio',
        perguntas: getRandomQuestions(studies)
      }
    }
    return studies[studyIndex] || { perguntas: [] }
  }, [studies, studyIndex])
  const questions = useMemo(() => currentStudy.perguntas || [], [currentStudy])
  const question = questions[questionIndex]

  const options = useMemo(() => {
    if (!question) return []
    return buildOptions(question, questions)
  }, [question, questions])

  const handleStudyChange = (event) => {
    const nextIndex = parseInt(event.target.value, 10)
    setStudyIndex(nextIndex)
    setQuestionIndex(0)
    setSelectedOption(null)
    setSelectedOptions([])
    setIsCorrect(null)
    setScore(0)
    setQuestionPoints(10)
    setInputPointsValue("10")
    setConfirmOption(null)
    setWrongQuestionIndexes([])
    setTimeLeft(60)
    setIsTimerPaused(false)
  }

  const resumeAudioContext = useCallback(async () => {
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
  }, [audioContext])

  const playSuccessSound = useCallback(async () => {
    await resumeAudioContext()
    playTone(audioContext, 880, 0.16, 'triangle')
    playTone(audioContext, 1040, 0.12, 'triangle', 0.12)
    await new Promise((resolve) => setTimeout(resolve, 260))
  }, [audioContext, resumeAudioContext])

  const playErrorSound = useCallback(async () => {
    await resumeAudioContext()
    playTone(audioContext, 220, 0.14, 'sine')
    playTone(audioContext, 180, 0.14, 'sine', 0.12)
    await new Promise((resolve) => setTimeout(resolve, 280))
  }, [audioContext, resumeAudioContext])

  useEffect(() => {
    if (isTimerPaused || selectedOption) {
      return
    }
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !selectedOption) {
      setSelectedOption('timeout')
      setIsCorrect(false)
      setWrongQuestionIndexes((prev) => (prev.includes(questionIndex) ? prev : [...prev, questionIndex]))
      playErrorSound()
      toast.error('Tempo esgotado!')
    }
  }, [timeLeft, selectedOption, playErrorSound, isTimerPaused, questionIndex])

  const handleToggleTimer = () => {
    if (!selectedOption && timeLeft > 0) {
      setIsTimerPaused(!isTimerPaused)
    }
  }

  const handleOptionClick = (option) => {
    if (selectedOption || timeLeft === 0 || !question) return
    if (question?.tipo === 'multipla_escolha') {
      setSelectedOptions((prev) => {
        if (prev.includes(option.text)) {
          return prev.filter((text) => text !== option.text)
        }
        return [...prev, option.text]
      })
      return
    }
    setConfirmOption(option)
  }

  const confirmAnswer = async () => {
    if (!question) return

    let answerText = ''
    let correct = false

    if (question?.tipo === 'multipla_escolha') {
      if (selectedOptions.length === 0) {
        toast.error('Selecione pelo menos uma opção para confirmar.')
        return
      }
      const correctAnswers = getCorrectAnswers(question)
      const normalizedSelected = selectedOptions.map(normalizeText)
      const normalizedCorrect = correctAnswers.map(normalizeText)

      correct =
        normalizedSelected.length === normalizedCorrect.length &&
        normalizedSelected.every((selectedText) => normalizedCorrect.includes(selectedText))

      answerText = selectedOptions.join('; ')
      setConfirmOption(null)
    } else {
      if (!confirmOption) return
      const option = confirmOption
      answerText = option.text
      correct = option.isCorrect
      setConfirmOption(null)
    }

    setSelectedOption(answerText)
    setIsCorrect(correct)

    if (correct) {
      setWrongQuestionIndexes((prev) => prev.filter((index) => index !== questionIndex))
      setScore((prevScore) => prevScore + 1)
      await playSuccessSound()
      toast.success('Resposta correta!')

      if (selectedScoringParticipantId) {
        try {
          const pointsToRegister = Math.max(1, questionPoints)
          
          // Registrar acerto do quiz
          try {
            await apiFetch(`/participants/${selectedScoringParticipantId}/quiz-correct-answer`, {
              method: 'PATCH',
            })
          } catch (quizErr) {
            console.error('Erro ao registrar acerto do quiz:', quizErr)
            toast.error('Falha ao registrar acerto: ' + quizErr.message)
            throw quizErr
          }

          // Registrar pontuação extra
          try {
            await apiFetch(`/participants/${selectedScoringParticipantId}/extra-score`, {
              method: 'PATCH',
              body: JSON.stringify({ points: pointsToRegister, reason: `Quiz: ${currentStudy.tema} - Pergunta ${questionIndex + 1}` }),
            })
          } catch (scoreErr) {
            console.error('Erro ao registrar pontuação extra:', scoreErr)
            toast.error('Falha ao registrar pontos: ' + scoreErr.message)
            throw scoreErr
          }

          toast.success(`Acerto e pontuação registrados no ranking!`)
          await loadParticipants()
        } catch (err) {
          console.error('Erro geral ao registrar acerto:', err)
        }
      }
    } else {
      setWrongQuestionIndexes((prev) => (prev.includes(questionIndex) ? prev : [...prev, questionIndex]))
      await playErrorSound()
      toast.error('Resposta incorreta!')
    }
  }

  const cancelConfirm = () => {
    setConfirmOption(null)
    setSelectedOptions([])
  }

  const handleNextQuestion = () => {
    if (questionIndex + 1 >= questions.length) {
      return
    }
    setQuestionIndex((prev) => prev + 1)
    setSelectedOption(null)
    setIsCorrect(null)
    setTimeLeft(60)
    setIsTimerPaused(false)
  }

  const handleRestart = () => {
    setQuestionIndex(0)
    setSelectedOption(null)
    setSelectedOptions([])
    setIsCorrect(null)
    setScore(0)
    setQuestionPoints(10)
    setInputPointsValue("10")
    setConfirmOption(null)
    setWrongQuestionIndexes([])
    setTimeLeft(60)
    setIsTimerPaused(false)
  }

  const selectedParticipant = useMemo(
    () => participants.find((participant) => participant._id === selectedScoringParticipantId),
    [participants, selectedScoringParticipantId]
  )

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const scoreA = (a.scoreSummary?.totalScore || 0)
      const scoreB = (b.scoreSummary?.totalScore || 0)
      if (scoreB !== scoreA) return scoreB - scoreA
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' })
    })
  }, [participants])

  const sortedParticipantsByQuizCorrectAnswers = useMemo(() => {
    return [...participants].sort((a, b) => {
      const aCorrect = Number(a.quizCorrectAnswers || 0)
      const bCorrect = Number(b.quizCorrectAnswers || 0)
      if (bCorrect !== aCorrect) return bCorrect - aCorrect
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' })
    })
  }, [participants])

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto overflow-x-hidden">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-4 sm:p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigate('/participantes')}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 cursor-pointer w-full max-w-fit"
              >
                Voltar
              </button>
            </div>
            <div className="flex-shrink-0 rounded-full bg-amber-500/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-amber-200">
              Quiz bíblico
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white">{jogo.titulo}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">{currentStudy.tema || 'Selecione um estudo para iniciar o quiz bíblico.'}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-white/70 min-w-0">
              Estudo do quiz
              <select
                value={studyIndex}
                onChange={handleStudyChange}
                className="rounded-3xl bg-slate-900/90 border border-white/10 px-4 py-3 text-white outline-none transition focus:border-amber-400 cursor-pointer"
              >
                <option value={-1}>🎲 Perguntas Aleatórias</option>
                {studies.map((study, index) => (
                  <option key={study.estudo || index} value={index}>
                    Estudo {study.estudo} — {study.tema}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-white/70 min-w-0">
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
            <label className="flex flex-col gap-2 text-sm text-white/70 min-w-0">
              Pontos por pergunta (padrão 10)
              <input
                type="number"
                min="1"
                value={inputPointsValue}
                onChange={(event) => setInputPointsValue(event.target.value)}
                onBlur={(event) => {
                  const val = Number(event.target.value)
                  const nextValue = isNaN(val) || val <= 0 ? 10 : val
                  setQuestionPoints(nextValue)
                  setInputPointsValue(nextValue.toString())
                }}
                className="rounded-3xl bg-slate-900/90 border border-white/10 px-4 py-3 text-white outline-none transition focus:border-amber-400 cursor-pointer"
              />
            </label>
          </div>
          {loadingParticipants && (
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              Carregando participantes para pontuação...
            </div>
          )}
          {!quizStarted && (
            <div className="pt-8 border-t border-white/10 flex flex-col items-center gap-4">
              <button
                onClick={() => {
                  setQuizStarted(true)
                  setTimeLeft(60)
                }}
                className="w-full max-w-sm rounded-3xl bg-gradient-to-r from-amber-500/90 to-amber-600/90 p-6 text-xl font-bold text-white shadow-2xl shadow-amber-500/25 transition hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/40 active:scale-[0.98] cursor-pointer"
              >
                🚀 Começar Quiz Bíblico
              </button>
              <p className="max-w-md text-center text-sm text-white/60">
                Estudo: <span className="font-semibold text-white">{currentStudy.tema || 'Nenhum selecionado'}</span> | Participante: <span className="font-semibold text-white">{selectedParticipant?.name || 'Nenhum'}</span> | Pontos por pergunta: <span className="font-semibold text-white">{questionPoints}</span>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:p-6 shadow-inner shadow-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Resumo do quiz</p>
              <p className="mt-2 text-lg font-semibold text-white">
                Estudo: {currentStudy.tema || 'Nenhum estudo selecionado'}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                <div className="font-semibold">Acertos: {score} / {questions.length || 1}</div>                {selectedParticipant && (
                  <div className="mt-3 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-slate-200">
                    <div className="text-xs uppercase tracking-[0.28em] text-emerald-200">Participante selecionado</div>
                    <div className="mt-2 text-sm font-semibold text-white">{selectedParticipant.name}</div>
                    <div className="mt-1 text-sm">Acertos no quiz: {score} / {questions.length || 1}</div>
                  </div>
                )}                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-200">
                  <span>Erros: {wrongQuestionIndexes.length}</span>
                  {wrongQuestionIndexes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuestionIndex(wrongQuestionIndexes[0])}
                      className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/15 cursor-pointer"
                    >
                      Ir para primeira correção
                    </button>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>

      {(!quizStarted || questions.length === 0) ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
          {!quizStarted ? (
            <p>Selecione estudo, participante e pontos, depois clique em "Começar Quiz".</p>
          ) : (
            <p>Nenhuma pergunta encontrada para este estudo.</p>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:p-6 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Pergunta {questionIndex + 1} de {questions.length}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{question?.pergunta}</h2>
              </div>
              <button
                type="button"
                onClick={handleToggleTimer}
                disabled={!!selectedOption || timeLeft === 0}
                className={`flex items-center gap-2 rounded-full px-5 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold transition cursor-pointer shadow-lg shadow-black/40 ${
                  isTimerPaused
                    ? 'border border-yellow-500/50 bg-linear-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 hover:from-yellow-500/30 hover:to-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'border border-cyan-500/50 bg-linear-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 hover:from-cyan-500/30 hover:to-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {isTimerPaused ? (
                  <>
                    <span className="text-lg">⏸</span>
                    <span>{timeLeft}s</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">▶</span>
                    <span>{timeLeft}s</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {options.map((option, index) => {
                const isMultiple = question?.tipo === 'multipla_escolha'
                const selected = isMultiple
                  ? selectedOptions.includes(option.text)
                  : selectedOption === option.text
const isPreSelected = isMultiple 
  ? selectedOptions.includes(option.text)
  : confirmOption?.text === option.text

const optionClass = selectedOption 
  ? (option.isCorrect 
      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100 ring-2 ring-emerald-400/50' 
      : 'border-rose-400 bg-rose-500/10 text-rose-100 ring-2 ring-rose-400/50')
  : isPreSelected
    ? 'border-blue-400 bg-blue-500/20 text-blue-100 ring-2 ring-blue-400/50'
    : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white/5';

                return (
                  <button
                    type="button"
                    key={`${option.text}-${index}`}
                    disabled={!!selectedOption}
                    onClick={() => handleOptionClick(option)}
                    className={`rounded-3xl border px-4 py-4 sm:px-5 sm:py-5 text-left text-sm font-medium transition cursor-pointer ${optionClass}`}
                  >
                    <div className="flex items-center gap-3">
                      {isMultiple && (
                        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200' : 'border-white/20 text-transparent'}`}>
                          ✓
                        </span>
                      )}
                      <span>{option.text}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {(confirmOption || (question?.tipo === 'multipla_escolha' && selectedOptions.length > 0)) && (
              <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-6">
                <p className="text-lg font-semibold text-white">Tem certeza da sua resposta?</p>
                <p className="mt-2 text-sm text-slate-300">
                  Você selecionou:{' '}
                  <strong>
                    {question?.tipo === 'multipla_escolha'
                      ? selectedOptions.join('; ')
                      : confirmOption?.text}
                  </strong>
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
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
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 sm:p-6">
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
                {wrongQuestionIndexes.length > 0 && (
                  <div className="mt-4 rounded-3xl border border-rose-500/10 bg-rose-500/5 px-4 py-3 text-sm text-slate-100">
                    <p className="font-semibold text-white">Revisar erros</p>
                    <p className="mt-2 text-slate-200">Você errou {wrongQuestionIndexes.length} pergunta(s). Clique para revisar:</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {wrongQuestionIndexes.map((index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setQuestionIndex(index)}
                          className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                        >
                          Pergunta {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

      <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:p-6 shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ranking do quiz</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Top 3 de acertos acumulados</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Veja quem está com mais acertos acumulados no quiz e acompanhe o desempenho do participante selecionado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowQuizRankingAll((prev) => !prev)}
            className="self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 cursor-pointer"
          >
            {showQuizRankingAll ? 'Ver menos' : 'Ver todos'}
          </button>
        </div>
        {selectedParticipant && (
          <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-slate-100">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.28em] text-emerald-200">Participante selecionado</span>
              <span className="text-xl font-semibold text-white">{selectedParticipant.name}</span>
              <span className="text-sm text-slate-200">Acertos acumulados no quiz: <span className="font-semibold text-white">{Number(selectedParticipant.quizCorrectAnswers || 0)}</span></span>
              <span className="text-sm text-slate-300">Pontuação atual no ranking: <span className="font-semibold text-white">{selectedParticipant.scoreSummary?.totalScore || 0} pts</span></span>
            </div>
          </div>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {sortedParticipantsByQuizCorrectAnswers.slice(0, 3).map((participant, index) => {
            const correctAnswers = Number(participant.quizCorrectAnswers || 0)
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
            return (
              <div key={participant._id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-black/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">{medal} #{index + 1}</p>
                    <h3 className="mt-3 text-lg font-semibold text-white truncate">{participant.name}</h3>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                    Acertos
                  </div>
                </div>
                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-bold text-white">{correctAnswers}</p>
                    <p className="mt-1 text-sm text-slate-400">Acertos acumulados</p>
                  </div>
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-400/10 p-2">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900/90 text-sm font-semibold text-amber-200">
                      {index + 1}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {showQuizRankingAll && (
          <div className="mt-6 space-y-3">
            <div className="grid gap-3">
              {sortedParticipantsByQuizCorrectAnswers.slice(3, 10).map((participant, index) => {
                const correctAnswers = Number(participant.quizCorrectAnswers || 0)
                return (
                  <div key={participant._id} className="rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-amber-400/30 hover:bg-white/10">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.32em] text-slate-400">#{index + 4}</p>
                        <p className="mt-1 text-sm font-semibold text-white truncate">{participant.name}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-900/80 px-3 py-2 text-sm font-semibold text-white">
                        {correctAnswers} acertos
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
      <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white">Ranking dos Participantes</h3>
        <p className="mt-2 text-sm text-slate-400">Pontuações atualizadas em tempo real.</p>
        <div className="mt-4 space-y-2">
          {sortedParticipants.slice(0, 10).map((participant, index) => {
            const scoreSummary = participant.scoreSummary || {}
            const totalScore = scoreSummary.totalScore || 0
            let rankClass = 'text-amber-400'
            let bgClass = 'bg-white/5'
            let medal = ''
            if (index === 0) {
              rankClass = 'text-yellow-400'
              bgClass = 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20'
              medal = '🥇'
            } else if (index === 1) {
              rankClass = 'text-gray-300'
              bgClass = 'bg-gradient-to-r from-gray-400/10 to-gray-500/10 border border-gray-400/20'
              medal = '🥈'
            } else if (index === 2) {
              rankClass = 'text-orange-400'
              bgClass = 'bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20'
              medal = '🥉'
            }
            return (
              <div key={participant._id} className={`flex items-center justify-between rounded-3xl ${bgClass} px-3 py-3 sm:px-4 sm:py-3`}>
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <span className={`text-sm sm:text-base font-semibold ${rankClass} shrink-0`}>
                    {medal || `#${index + 1}`}
                  </span>
                  <span className="text-sm sm:text-base text-white truncate">{participant.name}</span>
                </div>
                <span className="text-sm sm:text-base font-semibold text-white shrink-0 ml-2">{totalScore} pts</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default Quiz
