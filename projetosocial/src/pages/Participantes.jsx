import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ScreenShell from '../components/ScreenShell'
import BiblicalStudyPanel from '../components/dashboard/BiblicalStudyPanel'
import ConfiguracaoPanel from '../components/dashboard/ConfiguracaoPanel'
import FrequencyPanel from '../components/dashboard/FrequencyPanel'
import { apiFetch, clearSession, getToken, getUserName, getUserRole } from '../lib/api'
import { FREQUENCY_DAYS } from '../lib/frequencyDays'

const TABS_WITH_FRESH_LIST = ['biblico', 'frequencia', 'dados', 'ranking', 'sorteio']

const ALL_TABS = [
  { id: 'inscricoes', label: 'Inscrições' },
  { id: 'biblico', label: 'Estudo bíblico' },
  { id: 'frequencia', label: 'Frequência' },
  { id: 'dados', label: 'Dados' },
  { id: 'ranking', label: 'Ranking de pontuação' },
  { id: 'sorteio', label: 'Sorteio' },
  { id: 'configuracao', label: 'Configuração' },
]

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function compareParticipantNames(a, b) {
  return (a?.name || '').localeCompare(b?.name || '', 'pt-BR', { sensitivity: 'base' })
}

function getStreetName(address) {
  const normalizedAddress = (address || '').trim()
  if (!normalizedAddress) return 'Endereço não informado'

  const [streetPart] = normalizedAddress.split(',')
  const streetName = streetPart?.trim()

  return streetName || normalizedAddress
}

const AGE_GROUPS = [
  { label: '0-11 anos', min: 0, max: 11 },
  { label: '12-17 anos', min: 12, max: 17 },
  { label: '18-24 anos', min: 18, max: 24 },
  { label: '25-39 anos', min: 25, max: 39 },
  { label: '40-59 anos', min: 40, max: 59 },
  { label: '60+ anos', min: 60, max: Number.POSITIVE_INFINITY },
]

function getAgeGroupLabel(age) {
  const parsedAge = Number(age)
  if (!Number.isFinite(parsedAge) || parsedAge < 0) return 'Idade nao informada'

  const group = AGE_GROUPS.find((range) => parsedAge >= range.min && parsedAge <= range.max)
  return group?.label || 'Idade nao informada'
}

function getParticipantAgeLabel(age) {
  const parsedAge = Number(age)
  if (!Number.isFinite(parsedAge)) return 'Idade não informada'
  return `${parsedAge} anos`
}

function formatParticipantRow(participant, index) {
  const reference = participant.reference?.trim() ? participant.reference.trim() : 'Sem referência'
  const neighborhoodStr = participant.neighborhood?.trim() ? participant.neighborhood.trim() : ''
  return `${index + 1}. ${participant.name || ''} | ${participant.address || ''} | ${neighborhoodStr} | ${participant.houseNumber || ''} | ${reference} | ${getParticipantAgeLabel(participant.age)} | ${participant.whatsapp || ''}`
}

function getParticipantExtraEntries(participant) {
  if (Array.isArray(participant?.extraEntries) && participant.extraEntries.length > 0) {
    return participant.extraEntries
  }

  if (typeof participant?.extraScore === 'number' && participant.extraScore > 0) {
    return [{ points: participant.extraScore, reason: 'Pontuação extra anterior' }]
  }

  return []
}

function getParticipantExtraTotal(participant) {
  return getParticipantExtraEntries(participant).reduce((sum, entry) => sum + Number(entry?.points || 0), 0)
}

function getParticipantFrequencyCount(participant) {
  return Array.isArray(participant?.frequencyAttended) ? participant.frequencyAttended.length : 0
}

function getCurrentFrequencyProgrammedDay(participants) {
  return participants.reduce((highestDayId, participant) => {
    if (!Array.isArray(participant?.frequencyAttended)) return highestDayId

    const participantHighestDay = participant.frequencyAttended.reduce((highestForParticipant, item) => {
      const dayId = Number(item?.dayId)
      if (!Number.isInteger(dayId) || dayId <= 0) return highestForParticipant
      return Math.max(highestForParticipant, dayId)
    }, 0)

    return Math.max(highestDayId, participantHighestDay)
  }, 0)
}

function getParticipantScoreSummary(participant, rankingConfig) {
  const frequencyCount = getParticipantFrequencyCount(participant)
  const biblicalCount = Array.isArray(participant?.biblicalLessonsCompleted) ? participant.biblicalLessonsCompleted.length : 0
  const extraCount = getParticipantExtraTotal(participant)

  const fallback = {
    frequencyCount,
    frequencyScore: Number((frequencyCount * Number(rankingConfig?.presenceWeight || 0)).toFixed(1)),
    biblicalCount,
    biblicalScore: Number((biblicalCount * Number(rankingConfig?.biblicalWeight || 0)).toFixed(1)),
    extraCount,
    extraScore: Number((extraCount * Number(rankingConfig?.extraWeight || 0)).toFixed(1)),
  }

  const summary = participant?.scoreSummary || {}
  const totalScore =
    typeof summary.totalScore === 'number'
      ? summary.totalScore
      : Number((fallback.frequencyScore + fallback.biblicalScore + fallback.extraScore).toFixed(1))

  return {
    frequencyCount: typeof summary.frequencyCount === 'number' ? summary.frequencyCount : fallback.frequencyCount,
    frequencyScore: typeof summary.frequencyScore === 'number' ? summary.frequencyScore : fallback.frequencyScore,
    biblicalCount: typeof summary.biblicalCount === 'number' ? summary.biblicalCount : fallback.biblicalCount,
    biblicalScore: typeof summary.biblicalScore === 'number' ? summary.biblicalScore : fallback.biblicalScore,
    extraCount: typeof summary.extraCount === 'number' ? summary.extraCount : fallback.extraCount,
    extraScore: typeof summary.extraScore === 'number' ? summary.extraScore : fallback.extraScore,
    totalScore,
  }
}

function getParticipantIdString(participantOrId) {
  if (participantOrId == null) return ''
  if (typeof participantOrId === 'object' && typeof participantOrId?.toString === 'function') {
    return participantOrId.toString()
  }
  return String(participantOrId)
}

function getRankingHighlight(idx) {
  if (idx === 0) {
    return {
      row: 'bg-amber-500/10 hover:bg-amber-500/14',
      rank: 'text-amber-300',
      name: 'text-amber-50',
      trophy: 'text-amber-300',
      score: 'bg-amber-400/25 text-amber-50 border-amber-300/40',
    }
  }

  if (idx === 1) {
    return {
      row: 'bg-slate-300/10 hover:bg-slate-300/14',
      rank: 'text-slate-200',
      name: 'text-slate-50',
      trophy: 'text-slate-200',
      score: 'bg-slate-300/20 text-slate-50 border-slate-200/35',
    }
  }

  if (idx === 2) {
    return {
      row: 'bg-orange-500/10 hover:bg-orange-500/14',
      rank: 'text-orange-300',
      name: 'text-orange-50',
      trophy: 'text-orange-300',
      score: 'bg-orange-500/20 text-orange-50 border-orange-300/35',
    }
  }

  return {
    row: 'hover:bg-white/5',
    rank: 'text-amber-400',
    name: 'text-white',
    trophy: 'text-white/40',
    score: 'bg-amber-500/20 text-amber-100 border-amber-500/30',
  }
}

export default function Participantes() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('inscricoes')
  const [selectedBiblicalParticipantId, setSelectedBiblicalParticipantId] = useState('')
  const [selectedFrequencyParticipantId, setSelectedFrequencyParticipantId] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [reference, setReference] = useState('')
  const [age, setAge] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deletingIds, setDeletingIds] = useState(new Set())
  const [recentlyDeleted, setRecentlyDeleted] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editNeighborhood, setEditNeighborhood] = useState('')
  const [editHouseNumber, setEditHouseNumber] = useState('')
  const [editReference, setEditReference] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [updatingIds, setUpdatingIds] = useState(new Set())
  const [extraDrafts, setExtraDrafts] = useState({})
  const [extraSavingIds, setExtraSavingIds] = useState(new Set())
  const [rankingExtraSearch, setRankingExtraSearch] = useState('')
  const [selectedExtraParticipantIds, setSelectedExtraParticipantIds] = useState([])
  const [drawMode, setDrawMode] = useState('nome')
  const [selectedDrawDay, setSelectedDrawDay] = useState('')
  const [drawNameResult, setDrawNameResult] = useState(null)
  const [numberDrawMax, setNumberDrawMax] = useState('')
  const [drawNumberResult, setDrawNumberResult] = useState(null)
  const [isDrawDayMenuOpen, setIsDrawDayMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const userRole = getUserRole()
  const [rankingConfig, setRankingConfig] = useState({
    presenceWeight: 1,
    biblicalWeight: 1,
    extraLabel: 'Extra',
    extraWeight: 0,
  })
  const [configLoading, setConfigLoading] = useState(true)
  const [rankSaving, setRankSaving] = useState(false)

  const analytics = useMemo(() => {
    const totalParticipants = list.length
    const totalPresences = list.reduce(
      (sum, p) => sum + (Array.isArray(p.frequencyAttended) ? p.frequencyAttended.length : 0),
      0
    )

    const daySet = new Set()
    list.forEach((p) => {
      if (Array.isArray(p.frequencyAttended)) {
        p.frequencyAttended.forEach((f) => {
          if (typeof f?.dayId === 'number') daySet.add(f.dayId)
        })
      }
    })
    const allDays = [...daySet].sort((a, b) => a - b)
    const maxDay = allDays.length ? Math.max(...allDays) : 0

    const frequencyByDay = []
    const presentNamesByDay = {}
    const absentNamesByDay = {}

    for (let d = 1; d <= maxDay; d += 1) {
      const presentParticipants = list.filter(
        (p) => Array.isArray(p.frequencyAttended) && p.frequencyAttended.some((f) => f.dayId === d)
      )
      const present = presentParticipants.length
      const absentParticipants = list.filter(
        (p) => !Array.isArray(p.frequencyAttended) || !p.frequencyAttended.some((f) => f.dayId === d)
      )
      const absent = absentParticipants.length

      frequencyByDay.push({ day: d, present, absent })
      presentNamesByDay[d] = presentParticipants
        .map((p) => p.name || '(sem nome)')
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
      absentNamesByDay[d] = absentParticipants
        .map((p) => p.name || '(sem nome)')
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
    }

    const inscriptionsMap = new Map()
    list.forEach((p) => {
      if (p.createdAt) {
        const date = new Date(p.createdAt)
        if (!Number.isNaN(date.getTime())) {
          const dayString = date.toLocaleDateString('pt-BR')
          inscriptionsMap.set(dayString, (inscriptionsMap.get(dayString) || 0) + 1)
        }
      }
    })

    const inscriptionsOverTime = [...inscriptionsMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')))

    let cumulative = 0
    const inscriptionsAccum = inscriptionsOverTime.map((item) => {
      cumulative += item.count
      return { ...item, cumulative }
    })

    const studyingBible = list.filter(
      (p) => (Array.isArray(p.biblicalLessonsCompleted) && p.biblicalLessonsCompleted.length > 0) || p.selectedBiblicalLesson != null
    ).length
    const notStudyingBible = totalParticipants - studyingBible

    const averageFrequency =
      totalParticipants && maxDay ? Math.round((totalPresences / (totalParticipants * maxDay)) * 100) : 0

    const topFrequency = [...list]
      .map((p) => ({ name: p.name || '(sem nome)', days: Array.isArray(p.frequencyAttended) ? p.frequencyAttended.length : 0 }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 10)

    const rankingList = [...list]
      .map((p) => {
        const scoreSummary = getParticipantScoreSummary(p, rankingConfig)
        const extraEntries = getParticipantExtraEntries(p)
        return {
          id: p._id,
          name: p.name || '(sem nome)',
          attendance: scoreSummary.frequencyCount,
          attendanceScore: scoreSummary.frequencyScore,
          biblicalLessons: scoreSummary.biblicalCount,
          biblicalScore: scoreSummary.biblicalScore,
          extra: scoreSummary.extraCount,
          extraScore: scoreSummary.extraScore,
          extraEntries,
          score: scoreSummary.totalScore,
        }
      })
      .sort((a, b) => b.score - a.score)

    const topScoreRanking = rankingList.slice(0, 10)
    const top3 = rankingList.slice(0, 3)
    const ageDistributionMap = new Map()
    list.forEach((participant) => {
      const ageLabel = getAgeGroupLabel(participant.age)
      ageDistributionMap.set(ageLabel, (ageDistributionMap.get(ageLabel) || 0) + 1)
    })

    const ageDistribution = AGE_GROUPS.map((group) => ({
      label: group.label,
      total: ageDistributionMap.get(group.label) || 0,
    }))

    if (ageDistributionMap.get('Idade não informada')) {
      ageDistribution.push({
        label: 'Idade não informada',
        total: ageDistributionMap.get('Idade não informada') || 0,
      })
    }

    const streetMap = new Map()
    const neighborhoodMap = new Map()
    list.forEach((participant) => {
      const street = getStreetName(participant?.address)
      streetMap.set(street, (streetMap.get(street) || 0) + 1)
      
      const pNeighborhood = participant?.neighborhood?.trim() || 'Não informado'
      neighborhoodMap.set(pNeighborhood, (neighborhoodMap.get(pNeighborhood) || 0) + 1)
    })

    const streetDistribution = [...streetMap.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))

    const neighborhoodDistribution = [...neighborhoodMap.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))

    return {
      totalParticipants,
      totalPresences,
      averageFrequency,
      studyingBible,
      notStudyingBible,
      frequencyByDay,
      presentNamesByDay,
      absentNamesByDay,
      inscriptionsOverTime: inscriptionsAccum,
      topFrequency,
      rankingList,
      topScoreRanking,
      top3,
      ageDistribution,
      streetDistribution,
      neighborhoodDistribution,
      maxDay,
      allDays,
    }
  }, [list, rankingConfig])

  const chartRefs = useRef({
    frequencyChart: null,
    bibleChart: null,
    inscriptionsChart: null,
    topFrequencyChart: null,
    ageDistributionChart: null,
    streetChart: null,
  })
  const drawDayMenuRef = useRef(null)
  const mobileMenuRef = useRef(null)

  // Função para renderizar gráficos
  const renderCharts = useCallback(() => {
    // Destruir gráficos existentes
    Object.values(chartRefs.current).forEach(chart => {
      if (chart) chart.destroy()
    })

    const {
      frequencyByDay,
      totalParticipants,
      studyingBible,
      notStudyingBible,
      inscriptionsOverTime,
      topFrequency,
      ageDistribution,
      streetDistribution,
      neighborhoodDistribution,
    } = analytics

    // Gráfico 1: Frequência por dia
    const frequencyOptions = {
      series: [
        {
          name: 'Presentes',
          data: frequencyByDay.map(d => d.present),
        },
        {
          name: 'Ausentes',
          data: frequencyByDay.map(d => d.absent),
        },
      ],
      chart: {
        type: 'bar',
        height: 320,
        background: 'transparent',
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded',
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      xaxis: {
        categories: frequencyByDay.map(d => `Dia ${d.day}`),
        labels: {
          style: { colors: '#fff' },
        },
      },
      yaxis: {
        title: {
          text: 'Número de participantes',
          style: { color: '#fff' },
        },
        labels: {
          style: { colors: '#fff' },
        },
      },
      fill: {
        opacity: 1,
      },
      tooltip: {
        shared: true,
        intersect: false,
        custom: function ({series, dataPointIndex}) {
          const day = frequencyByDay[dataPointIndex]?.day
          const presentNames = analytics.presentNamesByDay[day] || []
          const absentNames = analytics.absentNamesByDay[day] || []
          const presentLine = `Presentes (${presentNames.length}): ${presentNames.join(', ') || 'Nenhum'}`
          const absentLine = `Ausentes (${absentNames.length}): ${absentNames.join(', ') || 'Nenhum'}`
          return `<div style="background:#0f1117; border:1px solid #2d3748; color:#fff; padding:10px; border-radius:8px; max-width:320px;">
              <div style="font-weight:600; margin-bottom:4px;">Dia ${day}</div>
              <div style="font-size:12px; margin-bottom:4px;">${presentLine}</div>
              <div style="font-size:12px;">${absentLine}</div>
            </div>`
        },
      },
      colors: ['#10b981', '#ef4444'],
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 250,
            },
            plotOptions: {
              bar: {
                columnWidth: '70%',
              },
            },
          },
        },
      ],
    }
    chartRefs.current.frequencyChart = new ApexCharts(document.querySelector('#frequency-chart'), frequencyOptions)
    chartRefs.current.frequencyChart.render()

    // Gráfico 2: Distribuição estudo bíblico
    const bibleOptions = {
      series: [studyingBible, notStudyingBible],
      chart: {
        type: 'donut',
        height: 320,
        background: 'transparent',
      },
      labels: ['Estudando a Bíblia', 'Não estudando'],
      colors: ['#10b981', '#6b7280'],
      legend: { position: 'bottom', labels: { colors: '#fff' } },
      tooltip: {
        y: { formatter: (val) => `${val} participantes` },
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                formatter: () => totalParticipants.toString(),
              },
            },
          },
        },
      },
      responsive: [
        {
          breakpoint: 768,
          options: { chart: { height: 250 } },
        },
      ],
    }
    chartRefs.current.bibleChart = new ApexCharts(document.querySelector('#bible-chart'), bibleOptions)
    chartRefs.current.bibleChart.render()

    // Gráfico 3: Evolução inscrições
    const inscriptionsOptions = {
      series: [
        {
          name: 'Inscritos acumulados',
          data: inscriptionsOverTime.map((d) => d.cumulative),
        },
      ],
      chart: {
        type: 'line',
        height: 320,
        background: 'transparent',
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      xaxis: {
        categories: inscriptionsOverTime.map((d) => d.date),
        labels: { style: { colors: '#fff' } },
      },
      yaxis: {
        title: { text: 'Número de inscritos', style: { color: '#fff' } },
        labels: { style: { colors: '#fff' } },
      },
      colors: ['#10b981'],
      tooltip: { y: { formatter: (val) => `${val} inscritos` } },
      responsive: [
        { breakpoint: 768, options: { chart: { height: 250 } } },
      ],
    }
    chartRefs.current.inscriptionsChart = new ApexCharts(document.querySelector('#inscriptions-chart'), inscriptionsOptions)
    chartRefs.current.inscriptionsChart.render()

    // Gráfico 4: Ranking frequência
    const topFrequencyOptions = {
      series: [
        {
          name: 'Dias presentes',
          data: topFrequency.map((p) => p.days),
        },
      ],
      chart: {
        type: 'bar',
        height: 320,
        background: 'transparent',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '70%',
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: topFrequency.map((p) => p.name),
        labels: { style: { colors: '#fff' } },
      },
      yaxis: {
        title: { text: 'Dias presentes', style: { color: '#fff' } },
        labels: { style: { colors: '#fff' } },
      },
      colors: topFrequency.map((_, i) => `rgba(16, 185, 129, ${(i + 5) / 12})`),
      tooltip: { y: { formatter: (val) => `${val} dias` } },
      responsive: [{ breakpoint: 768, options: { chart: { height: 250 } } }],
    }
    chartRefs.current.topFrequencyChart = new ApexCharts(document.querySelector('#top-frequency-chart'), topFrequencyOptions)
    chartRefs.current.topFrequencyChart.render()

    // Gráfico 5: Distribuição por faixa etária
    const ageDistributionOptions = {
      series: [
        {
          name: 'Participantes',
          data: ageDistribution.map((group) => group.total),
        },
      ],
      chart: {
        type: 'bar',
        height: 320,
        background: 'transparent',
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '55%',
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ageDistribution.map((group) => group.label),
        labels: { style: { colors: '#fff' } },
      },
      yaxis: {
        title: { text: 'Quantidade', style: { color: '#fff' } },
        labels: { style: { colors: '#fff' } },
      },
      colors: ['#22c55e'],
      tooltip: { y: { formatter: (val) => `${val} participantes` } },
      responsive: [{ breakpoint: 768, options: { chart: { height: 250 } } }],
    }
    chartRefs.current.ageDistributionChart = new ApexCharts(
      document.querySelector('#age-distribution-chart'),
      ageDistributionOptions
    )
    chartRefs.current.ageDistributionChart.render()

    // Gráfico 6: Quantidade por rua
    const streetOptions = {
      series: [
        {
          name: 'Participantes',
          data: streetDistribution.map((item) => item.total),
        },
      ],
      chart: {
        type: 'bar',
        height: 320,
        background: 'transparent',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '70%',
          borderRadius: 6,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: streetDistribution.map((item) => item.name),
        labels: { style: { colors: '#fff' } },
      },
      yaxis: {
        labels: { style: { colors: '#fff' } },
      },
      colors: ['#14b8a6'],
      tooltip: { y: { formatter: (val) => `${val} participantes` } },
      responsive: [{ breakpoint: 768, options: { chart: { height: 250 } } }],
    }
    chartRefs.current.streetChart = new ApexCharts(document.querySelector('#street-chart'), streetOptions)
    chartRefs.current.streetChart.render()

    // Gráfico 7: Quantidade por bairro
    const neighborhoodOptions = {
      series: [
        {
          name: 'Participantes',
          data: neighborhoodDistribution.map((item) => item.total),
        },
      ],
      chart: {
        type: 'bar',
        height: 320,
        background: 'transparent',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '70%',
          borderRadius: 6,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: neighborhoodDistribution.map((item) => item.name),
        labels: { style: { colors: '#fff' } },
      },
      yaxis: {
        labels: { style: { colors: '#fff' } },
      },
      colors: ['#0ea5e9'],
      tooltip: { y: { formatter: (val) => `${val} participantes` } },
      responsive: [{ breakpoint: 768, options: { chart: { height: 250 } } }],
    }
    
    // Certifique-se de que o elemento não seja nulo antes de criar o gráfico
    const neighElement = document.querySelector('#neighborhood-chart');
    if (neighElement) {
      chartRefs.current.neighborhoodChart = new ApexCharts(neighElement, neighborhoodOptions)
      chartRefs.current.neighborhoodChart.render()
    }

  }, [analytics])

  // useEffect para renderizar gráficos quando tab === 'dados'
  useEffect(() => {
    if (tab !== 'dados') return
    if (analytics.totalParticipants === 0) return

    const timer = setTimeout(() => {
      renderCharts()
    }, 100)

    return () => {
      clearTimeout(timer)
      Object.values(chartRefs.current).forEach((chart) => {
        if (chart) chart.destroy()
      })
    }
  }, [tab, renderCharts, analytics])

  const handleExportPdf = () => {
    if (!window.jspdf?.jsPDF) {
      toast.error('Biblioteca jsPDF não carregada ainda.')
      return
    }

    const { jsPDF } = window.jspdf

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    })

    // ==============================
    // Configuracao da página
    // ==============================
    const pageWidth = 841.89
    const pageHeight = 595.28

    const marginX = 20
    const marginTop = 30
    const marginBottom = 30

    const contentWidth = pageWidth - marginX * 2
    const pageBottomLimit = pageHeight - marginBottom

    let y = marginTop

    // ==============================
    // Controle de paginação (corrigido)
    // ==============================
    const ensureBlockFits = (blockHeight) => {
      if (y + blockHeight > pageBottomLimit) {
        doc.addPage()
        y = marginTop
      }
    }

    const drawTextBlock = (text, lineHeight = 12, spacing = 6) => {
      const lines = doc.splitTextToSize(text, contentWidth)
      const blockHeight = lines.length * lineHeight + spacing

      ensureBlockFits(blockHeight)

      lines.forEach((line) => {
        doc.text(line, marginX, y)
        y += lineHeight
      })

      y += spacing
    }

    // ==============================
    // 📌 TÍTULO
    // ==============================
    doc.setFontSize(18)
    drawTextBlock('Relatório de Dados - Projeto Eu Quero Ser Feliz', 16, 10)

    // ==============================
    // 📌 RESUMO
    // ==============================
    doc.setFontSize(12)

    drawTextBlock(`Total de participantes: ${analytics.totalParticipants}`)
    drawTextBlock(`Total de presenças: ${analytics.totalPresences}`)
    drawTextBlock(`Taxa média de frequência: ${analytics.averageFrequency}%`)
    drawTextBlock(`Estudando a Bíblia: ${analytics.studyingBible}`)
    drawTextBlock(`Não estudando: ${analytics.notStudyingBible}`)

    // ==============================
    // 📌 FREQUÊNCIA POR DIA
    // ==============================
    doc.setFontSize(14)
    drawTextBlock('Frequência por Dia', 14, 8)

    doc.setFontSize(10)

    analytics.frequencyByDay.forEach((d) => {
      const presentNames = analytics.presentNamesByDay[d.day] || []
      const absentNames = analytics.absentNamesByDay[d.day] || []

      const header = `Dia ${d.day}: ${d.present} presentes, ${d.absent} ausentes`
      const presentLine = `Presentes (${presentNames.length}): ${presentNames.join(', ') || 'Nenhum'}`
      const absentLine = `Ausentes (${absentNames.length}): ${absentNames.join(', ') || 'Nenhum'}`

      const headerLines = doc.splitTextToSize(header, contentWidth)
      const presentLines = doc.splitTextToSize(presentLine, contentWidth)
      const absentLines = doc.splitTextToSize(absentLine, contentWidth)

      const blockHeight =
        (headerLines.length + presentLines.length + absentLines.length) * 12 + 10

      ensureBlockFits(blockHeight)

      headerLines.forEach((l) => {
        doc.text(l, marginX, y)
        y += 12
      })

      presentLines.forEach((l) => {
        doc.text(`  ${l}`, marginX, y)
        y += 12
      })

      absentLines.forEach((l) => {
        doc.text(`  ${l}`, marginX, y)
        y += 12
      })

      y += 10
    })

    // ==============================
    // 📌 LISTA DE PARTICIPANTES (CORRIGIDO)
    // ==============================
    doc.setFontSize(14)

    ensureBlockFits(20)
    doc.text('Lista de Participantes', marginX, y)
    y += 20

    doc.setFontSize(10)

    drawTextBlock('Nome | Rua | Bairro | Número da casa | Referência | Idade | WhatsApp', 12, 6)

    list.forEach((p, idx) => {
      const linha = formatParticipantRow(p, idx)

      const lines = doc.splitTextToSize(linha, contentWidth)

      // Correcao principal para nao perder linha
      const blockHeight = lines.length * 12 + 6

      ensureBlockFits(blockHeight)

      lines.forEach((line) => {
        doc.text(line, marginX, y)
        y += 12
      })

      y += 6
    })

    const participantsByStreet = [...list]
      .sort(compareParticipantNames)
      .reduce((acc, participant) => {
        const streetName = getStreetName(participant.address)

        if (!acc.has(streetName)) {
          acc.set(streetName, [])
        }

        acc.get(streetName).push(participant)
        return acc
      }, new Map())

    const sortedStreets = [...participantsByStreet.keys()]
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))

    doc.setFontSize(14)
    ensureBlockFits(20)
    doc.text('Participantes por Rua', marginX, y)
    y += 20

    doc.setFontSize(10)

    sortedStreets.forEach((streetName) => {
      const participantsOnStreet = participantsByStreet.get(streetName) || []
      const header = `${streetName} (${participantsOnStreet.length})`
      const headerLines = doc.splitTextToSize(header, contentWidth)
      const participantBlocks = participantsOnStreet.map((participant, index) =>
        doc.splitTextToSize(
          formatParticipantRow(participant, index),
          contentWidth
        )
      )

      const blockHeight =
        headerLines.length * 12 +
        participantBlocks.reduce((sum, lines) => sum + lines.length * 12, 0) +
        10

      ensureBlockFits(blockHeight)

      headerLines.forEach((line) => {
        doc.text(line, marginX, y)
        y += 12
      })

      participantBlocks.forEach((lines) => {
        lines.forEach((line) => {
          doc.text(`  ${line}`, marginX, y)
          y += 12
        })
      })

      y += 10
    })

    // ==============================
    // Rodape (paginacao)
    // ==============================
    const totalPages = doc.getNumberOfPages()

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth - 120,
        pageHeight - 20
      )
    }

    // ==============================
    // 💾 EXPORTAR
    // ==============================
    doc.save('dados-projeto-eu-quero-ser-feliz.pdf')
  }
  const handleExportParticipants = () => {
    if (!window.jspdf?.jsPDF) {
      toast.error('Biblioteca jsPDF não carregada ainda.')
      return
    }
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const contentWidth = 555
    let y = 30
    doc.setFontSize(18)
    doc.text('Lista de Participantes', 20, y)
    y += 24
    doc.setFontSize(10)
    doc.text('Nome | Rua | Bairro | Número da casa | Referência | Idade | WhatsApp', 20, y)
    y += 16

    doc.setFontSize(14)
    doc.text('Presença por Dia (detalhes de nomes)', 20, y)
    y += 20
    doc.setFontSize(10)
    analytics.frequencyByDay.forEach((d) => {
      const presentNames = analytics.presentNamesByDay[d.day] || []
      const absentNames = analytics.absentNamesByDay[d.day] || []
      if (y > 730) {
        doc.addPage(); y = 30
      }
      doc.text(`Dia ${d.day}: Presentes (${presentNames.length})`, 20, y); y += 12
      doc.text(`  ${presentNames.join(', ') || 'Nenhum'}`, 20, y); y += 12
      doc.text(`Dia ${d.day}: Ausentes (${absentNames.length})`, 20, y); y += 12
      doc.text(`  ${absentNames.join(', ') || 'Nenhum'}`, 20, y); y += 16
    })

    if (y > 760) {
      doc.addPage(); y = 30
    }
    doc.setFontSize(14)
    doc.text('Lista de Participantes', 20, y)
    y += 20
    doc.setFontSize(10)
    doc.text('Nome | Rua | Bairro | Número da casa | Referência | Idade | WhatsApp', 20, y)
    y += 14

    list.forEach((p, idx) => {
      if (y > 760) {
        doc.addPage()
        y = 30
      }
      const rowLines = doc.splitTextToSize(formatParticipantRow(p, idx), contentWidth)
      rowLines.forEach((line) => {
        doc.text(line, 20, y)
        y += 12
      })
    })

    doc.save('lista-participantes.pdf')
  }

  const loadList = useCallback(async () => {
    setLoadingList(true)
    try {
      const data = await apiFetch('/participants')
      setList(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err.message)
      if (err.message.includes('Não autorizado') || err.message.includes('Token')) {
        clearSession()
        navigate('/login', { replace: true })
      }
    } finally {
      setLoadingList(false)
    }
  }, [navigate])

  const loadRankingConfig = useCallback(async () => {
    setConfigLoading(true)
    try {
      const data = await apiFetch('/ranking-config')
      setRankingConfig({
        presenceWeight: data.presenceWeight ?? 1,
        biblicalWeight: data.biblicalWeight ?? 1,
        extraLabel: data.extraLabel ?? 'Extra',
        extraWeight: data.extraWeight ?? 0,
      })
    } catch (err) {
      toast.error('Falha ao carregar configuração de ranking: ' + err.message)
    } finally {
      setConfigLoading(false)
    }
  }, [])

  const saveRankingConfig = useCallback(async () => {
    setRankSaving(true)
    try {
      const updated = await apiFetch('/ranking-config', {
        method: 'PUT',
        body: JSON.stringify(rankingConfig),
      })
      setRankingConfig({
        presenceWeight: updated.presenceWeight ?? 1,
        biblicalWeight: updated.biblicalWeight ?? 1,
        extraLabel: updated.extraLabel ?? 'Extra',
        extraWeight: updated.extraWeight ?? 0,
      })
      toast.success('Configuração de ranking salva com sucesso.')
    } catch (err) {
      toast.error('Erro ao salvar configuração de ranking: ' + err.message)
    } finally {
      setRankSaving(false)
    }
  }, [rankingConfig])

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true })
      return
    }
    loadList()
    loadRankingConfig()
  }, [navigate, loadList, loadRankingConfig])

  /* Atualiza a lista ao entrar nas abas dependentes dos dados, sem recarga automática em segundo plano. */
  useEffect(() => {
    if (!getToken()) return
    if (TABS_WITH_FRESH_LIST.includes(tab)) loadList()
  }, [tab, loadList])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [tab])

  useEffect(() => {
    function handleClickOutside(event) {
      if (!mobileMenuRef.current?.contains(event.target)) {
        setIsMobileMenuOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    function handleResize() {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const n = name.trim()
    const a = address.trim()
    const nh = neighborhood.trim()
    const hn = houseNumber.trim()
    const ref = reference.trim()
    const parsedAge = Number(age)
    const w = whatsapp.trim()
    if (!n || !a || !nh || !hn || !w || !Number.isInteger(parsedAge) || parsedAge < 0) {
      toast.error('Preencha nome, rua, bairro, número da casa, idade e WhatsApp.')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/participants', {
        method: 'POST',
        body: JSON.stringify({ name: n, address: a, neighborhood: nh, houseNumber: hn, reference: ref, age: parsedAge, whatsapp: w }),
      })
      setName('')
      setAddress('')
      setNeighborhood('')
      setHouseNumber('')
      setReference('')
      setAge('')
      setWhatsapp('')
      toast.success('Participante cadastrado com sucesso.')
      await loadList()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function requestDelete(participantId) {
    setDeleteConfirmId(participantId)
  }

  function cancelDelete() {
    setDeleteConfirmId(null)
  }

  async function handleUndoDelete() {
    if (!recentlyDeleted) return

    const { name: delName, address: delAddress, neighborhood: delNeighborhood, houseNumber: delHouseNumber, reference: delReference, age: delAge, whatsapp: delWhatsapp } = recentlyDeleted
    setLoadingList(true)
    try {
      const restored = await apiFetch('/participants', {
        method: 'POST',
        body: JSON.stringify({ name: delName, address: delAddress, neighborhood: delNeighborhood, houseNumber: delHouseNumber, reference: delReference, age: delAge, whatsapp: delWhatsapp }),
      })

      // Se houver dados em progresso, re-aplicar em endpoints específicos.
      if (recentlyDeleted.selectedBiblicalLesson != null || recentlyDeleted.biblicalLessonsCompleted?.length > 0) {
        await apiFetch(`/participants/${restored._id}/biblical-study`, {
          method: 'PATCH',
          body: JSON.stringify({
            selectedBiblicalLesson: recentlyDeleted.selectedBiblicalLesson ?? null,
            biblicalLessonsCompleted: recentlyDeleted.biblicalLessonsCompleted ?? [],
          }),
        })
      }
      if (recentlyDeleted.frequencyAttended?.length > 0) {
        await apiFetch(`/participants/${restored._id}/frequency`, {
          method: 'PATCH',
          body: JSON.stringify({ frequencyAttended: recentlyDeleted.frequencyAttended }),
        })
      }
      if (getParticipantExtraEntries(recentlyDeleted).length > 0) {
        for (const entry of getParticipantExtraEntries(recentlyDeleted)) {
          await apiFetch(`/participants/${restored._id}/extra-score`, {
            method: 'PATCH',
            body: JSON.stringify({
              points: Number(entry.points || 0),
              reason: entry.reason || 'Pontuação extra restaurada',
            }),
          })
        }
      }

      toast.success('Participante restaurado com sucesso.')
      setRecentlyDeleted(null)
      await loadList()
    } catch (err) {
      toast.error(`Erro ao restaurar participante: ${err.message}`)
    } finally {
      setLoadingList(false)
    }
  }

  function startEdit(participant) {
    setEditingId(participant._id)
    setEditName(participant.name)
    setEditAddress(participant.address)
    setEditNeighborhood(participant.neighborhood || '')
    setEditHouseNumber(participant.houseNumber || '')
    setEditReference(participant.reference || '')
    setEditAge(participant.age != null ? String(participant.age) : '')
    setEditWhatsapp(participant.whatsapp)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditAddress('')
    setEditNeighborhood('')
    setEditHouseNumber('')
    setEditReference('')
    setEditAge('')
    setEditWhatsapp('')
  }

  async function handleUpdate(e) {
    e.preventDefault()
    const id = editingId
    if (!id) return

    const n = editName.trim()
    const a = editAddress.trim()
    const nh = editNeighborhood.trim()
    const hn = editHouseNumber.trim()
    const ref = editReference.trim()
    const parsedAge = Number(editAge)
    const w = editWhatsapp.trim()
    if (!n || !a || !nh || !hn || !w || !Number.isInteger(parsedAge) || parsedAge < 0) {
      toast.error('Preencha nome, rua, bairro, número da casa, idade e WhatsApp.')
      return
    }

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      await apiFetch(`/participants/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: n, address: a, neighborhood: nh, houseNumber: hn, reference: ref, age: parsedAge, whatsapp: w }),
      })
      setEditingId(null)
      setEditName('')
      setEditAddress('')
      setEditNeighborhood('')
      setEditHouseNumber('')
      setEditReference('')
      setEditAge('')
      setEditWhatsapp('')
      toast.success('Participante atualizado com sucesso.')
      await loadList()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function confirmDelete() {
    const participantId = deleteConfirmId
    if (!participantId) return

    const participant = list.find((p) => p._id === participantId) || null
    setDeletingIds((prev) => new Set(prev).add(participantId))
    try {
      await apiFetch(`/participants/${participantId}`, {
        method: 'DELETE',
      })

      setRecentlyDeleted(participant)
      toast.success(
        <div className="flex items-center gap-3">
          <span>Participante excluído.</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="rounded-full border border-emerald-500/50 bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
          >
            Desfazer
          </button>
        </div>,
        { autoClose: 6000 }
      )
      await loadList()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(participantId)
        return next
      })
      setDeleteConfirmId(null)
    }
  }

  function handleLogout() {
    clearSession()
    toast.info('Sessão encerrada.')
    navigate('/login', { replace: true })
  }

  const userLabel = getUserName()

  const sortedParticipants = useMemo(
    () => [...list].sort(compareParticipantNames),
    [list]
  )

  const currentFrequencyProgrammedDay = useMemo(
    () => getCurrentFrequencyProgrammedDay(sortedParticipants),
    [sortedParticipants]
  )

  const attendanceSummary = useMemo(() => {
    const participantStats = sortedParticipants
      .map((participant) => {
        const presenceCount = getParticipantFrequencyCount(participant)
        const absences = Math.max(currentFrequencyProgrammedDay - presenceCount, 0)

        return {
          id: getParticipantIdString(participant._id),
          name: participant.name || '(sem nome)',
          presenceCount,
          absences,
        }
      })
      .sort((a, b) => {
        if (b.presenceCount !== a.presenceCount) return b.presenceCount - a.presenceCount
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      })

    const topAttendees = participantStats.slice(0, 5)
    const highestAbsences = [...participantStats]
      .sort((a, b) => {
        if (b.absences !== a.absences) return b.absences - a.absences
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      })
      .slice(0, 5)
    const noAbsenceCount =
      currentFrequencyProgrammedDay > 0
        ? participantStats.filter((participant) => participant.absences === 0).length
        : 0
    const inactiveCount = participantStats.filter((participant) => participant.presenceCount === 0).length
    const latestDay = analytics.maxDay
    const latestDayStats =
      latestDay > 0
        ? analytics.frequencyByDay.find((day) => day.day === latestDay) || null
        : null

    return {
      topAttendees,
      highestAbsences,
      noAbsenceCount,
      inactiveCount,
      latestDay,
      latestDayStats,
    }
  }, [analytics.frequencyByDay, analytics.maxDay, currentFrequencyProgrammedDay, sortedParticipants])

  function handleParticipantTabNavigation(nextTab, participantId) {
    const normalizedParticipantId = getParticipantIdString(participantId)

    if (nextTab === 'biblico') {
      setSelectedBiblicalParticipantId(normalizedParticipantId)
    }

    if (nextTab === 'frequencia') {
      setSelectedFrequencyParticipantId(normalizedParticipantId)
    }

    setTab(nextTab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const rankingExtraCandidates = useMemo(() => {
    const term = rankingExtraSearch.trim().toLowerCase()
    const baseList = [...list]
      .map((participant) => {
        const scoreSummary = getParticipantScoreSummary(participant, rankingConfig)
        return {
          id: participant._id,
          name: participant.name || '(sem nome)',
          score: scoreSummary.totalScore,
        }
      })
      .sort((a, b) => b.score - a.score)

    if (!term) {
      return baseList.slice(0, 8)
    }

    return baseList
      .filter((participant) => participant.name.toLowerCase().includes(term))
      .slice(0, 8)
  }, [list, rankingConfig, rankingExtraSearch])

  const selectedExtraParticipants = useMemo(() => {
    return sortedParticipants.filter((participant) => selectedExtraParticipantIds.includes(participant._id))
  }, [selectedExtraParticipantIds, sortedParticipants])

  function handleToggleExtraParticipant(id) {
    setSelectedExtraParticipantIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id)
      }
      return [...prev, id]
    })
  }

  const frequencyDayOptions = useMemo(
    () =>
      FREQUENCY_DAYS.filter((day) =>
        sortedParticipants.some(
          (participant) =>
            Array.isArray(participant.frequencyAttended) &&
            participant.frequencyAttended.some((item) => item?.dayId === day.id)
        )
      ),
    [sortedParticipants]
  )

  const participantsForSelectedDrawDay = useMemo(() => {
    const dayId = Number(selectedDrawDay)
    if (!Number.isInteger(dayId) || dayId <= 0) return []

    return sortedParticipants.filter(
      (participant) =>
        Array.isArray(participant.frequencyAttended) &&
        participant.frequencyAttended.some((item) => item?.dayId === dayId)
    )
  }, [selectedDrawDay, sortedParticipants])

  const selectedDrawDayMeta = useMemo(
    () => FREQUENCY_DAYS.find((day) => day.id === Number(selectedDrawDay)) || null,
    [selectedDrawDay]
  )

  useEffect(() => {
    if (frequencyDayOptions.length === 0) {
      setSelectedDrawDay('')
      return
    }

    const currentStillExists = frequencyDayOptions.some((day) => String(day.id) === selectedDrawDay)
    if (!currentStillExists) {
      setSelectedDrawDay(String(frequencyDayOptions[0].id))
    }
  }, [frequencyDayOptions, selectedDrawDay])

  useEffect(() => {
    setDrawNameResult(null)
  }, [selectedDrawDay])

  useEffect(() => {
    setDrawNumberResult(null)
  }, [numberDrawMax])

  useEffect(() => {
    function handleClickOutside(event) {
      if (!drawDayMenuRef.current?.contains(event.target)) {
        setIsDrawDayMenuOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsDrawDayMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function updateExtraDraft(participantId, field, value) {
    setExtraDrafts((prev) => ({
      ...prev,
      [participantId]: {
        points: prev[participantId]?.points || '',
        reason: prev[participantId]?.reason || '',
        [field]: value,
      },
    }))
  }

  async function handleAddExtraScoreBulk() {
    const draft = extraDrafts['bulk'] || { points: '', reason: '' }
    const points = Number(draft.points)
    const reason = (draft.reason || '').trim()

    if (!Number.isFinite(points) || points <= 0) {
      toast.error('Informe uma pontuação extra maior que zero.')
      return
    }

    if (!reason) {
      toast.error('Informe o motivo da pontuação extra.')
      return
    }

    const ids = selectedExtraParticipants.map(p => p._id)
    if (ids.length === 0) {
      toast.error('Selecione pelo menos um participante.')
      return
    }

    setExtraSavingIds((prev) => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })

    try {
      await Promise.all(
        ids.map((id) =>
          apiFetch(`/participants/${id}/extra-score`, {
            method: 'PATCH',
            body: JSON.stringify({ points, reason }),
          })
        )
      )

      setExtraDrafts((prev) => ({
        ...prev,
        ['bulk']: { points: '', reason: '' },
      }))
      setRankingExtraSearch('')
      setSelectedExtraParticipantIds([])
      toast.success('Pontuação extra adicionada com sucesso aos participantes.')
      await loadList()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setExtraSavingIds((prev) => {
        const next = new Set(prev)
        ids.forEach(id => next.delete(id))
        return next
      })
    }
  }

  function handleNameDraw() {
    if (!selectedDrawDay) {
      toast.error('Selecione um dia da frequência para sortear por nome.')
      return
    }

    if (participantsForSelectedDrawDay.length === 0) {
      toast.error('Nenhum participante encontrado para o dia selecionado.')
      return
    }

    const randomIndex = Math.floor(Math.random() * participantsForSelectedDrawDay.length)
    const winner = participantsForSelectedDrawDay[randomIndex]
    setDrawNameResult(winner)
    toast.success(`Nome sorteado: ${winner.name || 'Participante sem nome'}`)
  }

  function handleNumberDraw() {
    const parsedMax = Number(numberDrawMax)
    if (!Number.isInteger(parsedMax) || parsedMax <= 0) {
      toast.error('Digite um número máximo válido para o sorteio.')
      return
    }

    const winnerNumber = Math.floor(Math.random() * parsedMax) + 1
    setDrawNumberResult(winnerNumber)
    toast.success(`Número sorteado: ${winnerNumber}`)
  }

  const filteredList = sortedParticipants.filter(p => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    // Nome
    if (p.name.toLowerCase().includes(term)) return true
    // WhatsApp
    if (p.whatsapp.toLowerCase().includes(term)) return true
    // Endereço
    if (p.address.toLowerCase().includes(term)) return true
    if ((p.houseNumber || '').toLowerCase().includes(term)) return true
    if ((p.reference || '').toLowerCase().includes(term)) return true
    if (String(p.age ?? '').includes(term)) return true
    // Data de presença (formato completo)
    if (p.frequencyAttended?.some(date => formatDate(date).toLowerCase().includes(term))) return true
    // Dia das datas de presença
    const dayNum = parseInt(term)
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
      if (p.frequencyAttended?.some(date => new Date(date).getDate() === dayNum)) return true
    }
    // Quantidade de dias
    if (!isNaN(dayNum) && p.frequencyAttended?.length === dayNum) return true
    // Estudo bíblico
    if (p.selectedBiblicalLesson != null && `lição ${p.selectedBiblicalLesson}`.toLowerCase().includes(term)) return true
    if (p.biblicalLessonsCompleted?.length > 0 && `${p.biblicalLessonsCompleted.length}/15 lições`.toLowerCase().includes(term)) return true
    return false
  })

  const visibleTabs = ALL_TABS.filter((t) => t.id !== 'configuracao' || userRole === 'admin')

  return (
    <ScreenShell maxWidthClass="max-w-7xl" alignClass="items-start sm:items-center">
      <div className="mx-auto w-full space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-center lg:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Painel da secretaria</h1>
            <p className="text-sm text-white/55 mt-1">Projeto Eu Quero Ser Feliz</p>
            {userLabel ? (
              <p className="text-xs text-white/40 mt-1">Logado como: {userLabel}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 lg:hidden" ref={mobileMenuRef}>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome, rua, número, referência, idade, WhatsApp, dia..."
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white transition hover:bg-white/10"
                aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-panel-menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                  )}
                </svg>
              </button>
            </div>
            {isMobileMenuOpen ? (
              <div
                id="mobile-panel-menu"
                className="rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-xl"
              >
                <nav className="flex flex-col gap-2" aria-label="Seções do painel">
                  {visibleTabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                        tab === t.id
                          ? 'bg-white/15 text-white shadow-inner'
                          : 'text-white/55 hover:text-white/85 hover:bg-white/5'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </nav>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-3 w-full rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
                >
                  Sair
                </button>
              </div>
            ) : null}
          </div>
          <div className="hidden lg:flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 max-w-xs">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome, rua, número, referência, idade, WhatsApp, dia..."
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
              />
            </div>
            <nav
              className="flex flex-wrap justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5"
              aria-label="Seções do painel"
            >
              {visibleTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition cursor-pointer ${
                    tab === t.id
                      ? 'bg-white/15 text-white shadow-inner'
                      : 'text-white/55 hover:text-white/85 hover:bg-white/5'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition self-center cursor-pointer"
            >
              Sair
            </button>
          </div>
        </header>

        {tab === 'inscricoes' && (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-center lg:gap-8">
            {userRole === 'admin' && (
              <div className="relative w-full max-w-xl shrink-0 rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden lg:mx-0 mx-auto">
                <div className="absolute inset-0 bg-linear-to-br from-slate-500/15 via-transparent to-slate-700/15" />

                <div className="relative px-5 py-6 sm:px-7 sm:py-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Inscrição de participantes</h2>
                    <p className="text-xs sm:text-sm text-white/60 mt-1">
                      Cadastre pessoas atendidas pelo projeto social
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-xs font-semibold tracking-wide text-white/80 uppercase text-center sm:text-left">
                      Novo cadastro
                    </h3>

                    <div className="space-y-3">
                      <label className="block">
                        <span className="text-xs text-white/50 mb-1 block">Nome completo</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="Nome da pessoa"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-white/50 mb-1 block">Rua</span>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="Nome da rua"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-white/50 mb-1 block">Número da casa</span>
                        <input
                          type="text"
                          value={houseNumber}
                          onChange={(e) => setHouseNumber(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="Ex: 123"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-white/50 mb-1 block">Bairro</span>
                        <input
                          type="text"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="Nome do bairro"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-white/50 mb-1 block">Referência</span>
                        <input
                          type="text"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="Ex: Perto da igreja"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-white/50 mb-1 block">Idade</span>
                        <input
                          type="number"
                          min="0"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="Ex: 14"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-white/50 mb-1 block">WhatsApp</span>
                        <input
                          type="tel"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="(00) 00000-0000"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full cursor-pointer rounded-full bg-linear-to-r from-emerald-900/90 via-emerald-800 to-emerald-900/90 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Salvando…' : 'Inscrever participante'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            <article
              className={`relative w-full min-w-0 ${userRole === 'admin' ? 'flex-1' : ''} rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden lg:mx-0 mx-auto`}
              aria-labelledby="dashboard-heading"
            >
              <div className="absolute inset-0 bg-linear-to-br from-emerald-950/20 via-transparent to-slate-800/20" />

              <div className="relative flex flex-col h-full min-h-[min(70vh,32rem)] lg:min-h-[min(85vh,40rem)]">
                <header className="px-5 py-4 sm:px-6 border-b border-white/10 shrink-0">
                  <h2
                    id="dashboard-heading"
                    className="text-base sm:text-lg font-bold text-white text-center sm:text-left"
                  >
                    Dashboard — participantes
                  </h2>
                  <p className="text-xs text-white/50 mt-1 text-center sm:text-left">
                    Todos os participantes cadastrados
                  </p>
                  <div className="mt-3 flex justify-center sm:justify-start">
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-200/90">
                      Total: {loadingList ? '…' : filteredList.length}
                    </span>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto max-h-[26rem] px-4 py-4 sm:px-5 sm:py-5 custom-scrollbar">
                  {loadingList ? (
                    <p className="text-sm text-white/50 text-center py-8">Carregando…</p>
                  ) : filteredList.length === 0 ? (
                    <p className="text-sm text-white/50 text-center py-8">Nenhuma inscrição ainda.</p>
                  ) : (
                    <ul className="space-y-3 max-w-2xl mx-auto lg:mx-0">
                      {filteredList.map((p) => (
                        <li
                          key={p._id}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                        >
                          {editingId === p._id ? (
                            <form onSubmit={handleUpdate} className="space-y-3">
                              <div className="space-y-2">
                                <label className="block">
                                  <span className="text-xs text-white/50">Nome completo</span>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                    placeholder="Nome da pessoa"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-white/50">Rua</span>
                                  <input
                                    type="text"
                                    value={editAddress}
                                    onChange={(e) => setEditAddress(e.target.value)}
                                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                    placeholder="Nome da rua"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-white/50">Número da casa</span>
                                  <input
                                    type="text"
                                    value={editHouseNumber}
                                    onChange={(e) => setEditHouseNumber(e.target.value)}
                                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                    placeholder="Ex: 123"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-white/50">Bairro</span>
                                  <input
                                    type="text"
                                    value={editNeighborhood}
                                    onChange={(e) => setEditNeighborhood(e.target.value)}
                                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                    placeholder="Nome do bairro"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-white/50">Referência</span>
                                  <input
                                    type="text"
                                    value={editReference}
                                    onChange={(e) => setEditReference(e.target.value)}
                                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                    placeholder="Ex: Perto da igreja"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-white/50">Idade</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editAge}
                                    onChange={(e) => setEditAge(e.target.value)}
                                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                    placeholder="Ex: 14"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-white/50">WhatsApp</span>
                                  <input
                                    type="tel"
                                    value={editWhatsapp}
                                    onChange={(e) => setEditWhatsapp(e.target.value)}
                                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                    placeholder="(00) 00000-0000"
                                  />
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={updatingIds.has(p._id)}
                                  className="flex-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                  {updatingIds.has(p._id) ? 'Salvando…' : 'Salvar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="flex-1 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-white">{p.name}</p>
                                {userRole === 'admin' && (
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(p)}
                                      className="rounded-full border px-2 py-1 text-xs transition border-blue-400/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 cursor-pointer"
                                      title="Editar participante"
                                      aria-label="Editar participante"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="h-3.5 w-3.5"
                                      >
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => requestDelete(p._id)}
                                      disabled={deletingIds.has(p._id)}
                                      className={`rounded-full border px-2 py-1 text-xs transition inline-flex items-center gap-1 cursor-pointer ${deletingIds.has(p._id) ? 'border-white/20 bg-white/10 text-white/40 cursor-not-allowed' : 'border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20'}`}
                                      title="Excluir participante"
                                      aria-label="Excluir participante"
                                    >
                                      {deletingIds.has(p._id) ? (
                                        <>
                                          <svg
                                            className="h-3.5 w-3.5 animate-spin text-white/70"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              stroke="currentColor"
                                              strokeWidth="4"
                                            />
                                            <path
                                              className="opacity-75"
                                              fill="currentColor"
                                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                            />
                                          </svg>
                                          Aguarde
                                        </>
                                      ) : (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                          className="h-3.5 w-3.5"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M6 2a1 1 0 00-1 1v1H3a1 1 0 100 2h14a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zm2 5a1 1 0 011 1v7a1 1 0 11-2 0V8a1 1 0 011-1zm4 0a1 1 0 011 1v7a1 1 0 11-2 0V8a1 1 0 011-1z"
                                            clipRule="evenodd"
                                          />
                                          <path d="M8 7h4v1H8V7z" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                              <p className="text-white/70 mt-1 wrap-break-word">Rua: {p.address}</p>
                              <p className="text-white/60 mt-1">Número da casa: {p.houseNumber || 'Não informado'}</p>
                              <p className="text-white/60 mt-1">Bairro: {p.neighborhood?.trim() ? p.neighborhood : 'Não informado'}</p>
                              <p className="text-white/60 mt-1">Referência: {p.reference || 'Não informada'}</p>
                              <p className="text-white/60 mt-1">Idade: {getParticipantAgeLabel(p.age)}</p>
                              <p className="text-emerald-300/90 mt-1">{p.whatsapp}</p>
                              <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                                {p.selectedBiblicalLesson != null ? (
                                  <button
                                    type="button"
                                    onClick={() => handleParticipantTabNavigation('biblico', p._id)}
                                    className="cursor-pointer rounded-full bg-amber-500/20 text-amber-100/90 px-2 py-0.5 border border-amber-500/25 transition hover:bg-amber-500/30 hover:border-amber-400/40"
                                  >
                                    Estudo bíblico: lição {p.selectedBiblicalLesson}
                                  </button>
                                ) : null}
                                {p.biblicalLessonsCompleted?.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleParticipantTabNavigation('biblico', p._id)}
                                    className="cursor-pointer rounded-full bg-emerald-500/15 text-emerald-100/85 px-2 py-0.5 border border-emerald-500/20 transition hover:bg-emerald-500/25 hover:border-emerald-400/35"
                                  >
                                    {p.biblicalLessonsCompleted.length}/15 lições concluídas
                                  </button>
                                ) : null}
                                {currentFrequencyProgrammedDay > 0 ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleParticipantTabNavigation('frequencia', p._id)}
                                      className="cursor-pointer rounded-full bg-blue-500/15 text-blue-100/85 px-2 py-0.5 border border-blue-500/20 transition hover:bg-blue-500/25 hover:border-blue-400/35"
                                    >
                                      {getParticipantFrequencyCount(p)}/{currentFrequencyProgrammedDay} dias de frequência
                                    </button>
                                    <span className="rounded-full bg-rose-500/15 text-rose-100/85 px-2 py-0.5 border border-rose-500/20">
                                      {Math.max(currentFrequencyProgrammedDay - getParticipantFrequencyCount(p), 0)} faltas
                                    </span>
                                  </>
                                ) : null}
                              </div>
                              <p className="text-xs text-white/40 mt-2">{formatDate(p.createdAt)}</p>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          </div>
        )}

        {tab === 'biblico' && (
          <section
            className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden px-5 py-6 sm:px-8 sm:py-8"
            aria-labelledby="biblico-heading"
          >
            <div className="absolute inset-0 bg-linear-to-br from-amber-950/15 via-transparent to-slate-900/25 pointer-events-none" />
            <div className="relative">
              <h2 id="biblico-heading" className="text-lg font-bold text-white text-center sm:text-left">
                Estudo bíblico — dashboard interativo
              </h2>
              <p className="text-sm text-white/55 mt-1 mb-8 text-center sm:text-left max-w-2xl">
                Escolha um participante <strong className="text-white/85">já inscrito</strong>, defina a
                lição em estudo (anel ou cartões) e marque as concluídas. Salve para registrar no
                sistema.
              </p>
              <BiblicalStudyPanel
                key={selectedBiblicalParticipantId || 'biblical-panel'}
                participants={sortedParticipants}
                loadingList={loadingList}
                onUpdated={loadList}
                readOnly={userRole !== 'admin'}
                initialParticipantId={selectedBiblicalParticipantId}
              />
            </div>
          </section>
        )}

        {tab === 'configuracao' && userRole === 'admin' && (
          <section
            className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden px-5 py-6 sm:px-8 sm:py-8"
            aria-labelledby="configuracao-heading"
          >
            <div className="absolute inset-0 bg-linear-to-br from-violet-950/15 via-transparent to-slate-900/25 pointer-events-none" />
            <div className="relative">
              <h2 id="configuracao-heading" className="text-lg font-bold text-white text-center sm:text-left">
                Configurações da Plataforma
              </h2>
              <p className="text-sm text-white/55 mt-1 mb-8 text-center sm:text-left">
                Gerencie permissões de acesso e realize manutenções no banco de dados.
              </p>
              <ConfiguracaoPanel />
            </div>
          </section>
        )}

        {tab === 'frequencia' && (
          <section
            className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden px-5 py-6 sm:px-8 sm:py-8"
            aria-labelledby="frequencia-heading"
          >
            <div className="absolute inset-0 bg-linear-to-br from-blue-950/15 via-transparent to-slate-900/25 pointer-events-none" />
            <div className="relative">
              <h2 id="frequencia-heading" className="text-lg font-bold text-white text-center sm:text-left">
                Frequência — registro de presença
              </h2>
              <p className="text-sm text-white/55 mt-1 mb-8 text-center sm:text-left max-w-2xl">
                Escolha um participante <strong className="text-white/85">já inscrito</strong> e marque os dias de presença.
              </p>
              <FrequencyPanel
                key={selectedFrequencyParticipantId || 'frequency-panel'}
                participants={sortedParticipants}
                loadingList={loadingList}
                onUpdated={loadList}
                readOnly={userRole !== 'admin'}
                initialParticipantId={selectedFrequencyParticipantId}
              />

              <div className="mt-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold text-white/80">Dia programado atual</h3>
                    <p className="mt-2 text-2xl font-bold text-blue-300">
                      {currentFrequencyProgrammedDay > 0 ? `Dia ${currentFrequencyProgrammedDay}` : 'Sem registros'}
                    </p>
                    <p className="mt-2 text-xs text-white/55">
                      Baseado no maior dia já marcado entre os participantes.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold text-white/80">Sem faltas até agora</h3>
                    <p className="mt-2 text-2xl font-bold text-emerald-300">{attendanceSummary.noAbsenceCount}</p>
                    <p className="mt-2 text-xs text-white/55">
                      Participantes com presença completa até o dia atual.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold text-white/80">Sem nenhuma presença</h3>
                    <p className="mt-2 text-2xl font-bold text-rose-300">{attendanceSummary.inactiveCount}</p>
                    <p className="mt-2 text-xs text-white/55">
                      Pessoas que ainda não tiveram presença registrada.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold text-white/80">Último fechamento</h3>
                    <p className="mt-2 text-2xl font-bold text-cyan-300">
                      {attendanceSummary.latestDayStats
                        ? `${attendanceSummary.latestDayStats.present} presentes`
                        : 'Sem dados'}
                    </p>
                    <p className="mt-2 text-xs text-white/55">
                      {attendanceSummary.latestDayStats
                        ? `${attendanceSummary.latestDayStats.absent} ausentes no dia ${attendanceSummary.latestDay}.`
                        : 'Os indicadores aparecerão quando houver frequência registrada.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                    <h3 className="text-lg font-semibold text-white">Participantes com mais presenças</h3>
                    <p className="mt-1 text-sm text-white/55">
                      Ranking rápido para identificar quem está mais engajado.
                    </p>
                    <div className="mt-4 space-y-3">
                      {attendanceSummary.topAttendees.length > 0 ? (
                        attendanceSummary.topAttendees.map((participant, index) => (
                          <div
                            key={`presence-${participant.id}`}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {index + 1}. {participant.name}
                              </p>
                              <p className="text-xs text-white/55">
                                {participant.absences} faltas registradas até o momento.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleParticipantTabNavigation('frequencia', participant.id)}
                              className="cursor-pointer rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/20"
                            >
                              {participant.presenceCount} presenças
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-white/45">Ainda não há presenças registradas.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                    <h3 className="text-lg font-semibold text-white">Participantes com mais faltas</h3>
                    <p className="mt-1 text-sm text-white/55">
                      Indicador útil para acompanhamento e busca ativa.
                    </p>
                    <div className="mt-4 space-y-3">
                      {attendanceSummary.highestAbsences.some((participant) => participant.absences > 0) ? (
                        attendanceSummary.highestAbsences.map((participant, index) => (
                          <div
                            key={`absence-${participant.id}`}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {index + 1}. {participant.name}
                              </p>
                              <p className="text-xs text-white/55">
                                {participant.presenceCount} presenças no total.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleParticipantTabNavigation('frequencia', participant.id)}
                              className="cursor-pointer rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                            >
                              {participant.absences} faltas
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-white/45">
                          Nenhuma falta registrada até agora.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'dados' && (
          <section
            className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden px-5 py-6 sm:px-8 sm:py-8"
            aria-labelledby="dados-heading"
          >
            <div className="absolute inset-0 bg-linear-to-br from-green-950/15 via-transparent to-slate-900/25 pointer-events-none" />
            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                <div>
                  <h2 id="dados-heading" className="text-lg font-bold text-white text-center sm:text-left">
                    Análise de dados
                  </h2>
                  <p className="text-sm text-white/55 mt-1 text-center sm:text-left">
                    Visão geral do projeto
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleExportParticipants}
                    className="cursor-pointer rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    Exportar lista participantes
                  </button>
                  {userRole === 'admin' && (
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      className="cursor-pointer rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      Exportar PDF
                    </button>
                  )}
                </div>
              </div>

              {/* Cards de resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white/80">Total de participantes</h3>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">{analytics.totalParticipants}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white/80">Total de presenças</h3>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">{analytics.totalPresences}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white/80">Taxa média de frequência</h3>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">{analytics.averageFrequency}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white/80">Estudantes da Bíblia</h3>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">{analytics.studyingBible} / {analytics.totalParticipants}</p>
                </div>
              </div>

              {/* Gráficos */}
              <div className="space-y-8">
                {/* Gráfico 1: Frequência por dia */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Presença e ausência por dia</h3>
                  <div id="frequency-chart"></div>
                </div>

                {/* Gráfico 2 e 3 lado a lado */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Estudo bíblico — participantes</h3>
                    <div id="bible-chart"></div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Crescimento de inscrições</h3>
                    <div id="inscriptions-chart"></div>
                  </div>
                </div>

                {/* Gráfico 4: Ranking frequência */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Top 10 participantes por frequência</h3>
                  <div id="top-frequency-chart"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Participantes por faixa etaria</h3>
                    <div id="age-distribution-chart"></div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Quantidade por rua</h3>
                    <div id="street-chart"></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Quantidade por bairro</h3>
                  <div id="neighborhood-chart"></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'ranking' && (
          <section
            className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden px-5 py-6 sm:px-8 sm:py-8"
            aria-labelledby="ranking-heading"
          >
            <div className="absolute inset-0 bg-linear-to-br from-indigo-950/15 via-transparent to-slate-900/25 pointer-events-none" />
            <div className="relative">
              <h2 id="ranking-heading" className="text-lg font-bold text-white text-center sm:text-left">
                Ranking de pontuação
              </h2>
              <p className="text-sm text-white/55 mt-1 mb-8 text-center sm:text-left max-w-3xl">
                Configure os pesos dos critérios e visualize o ranking calculado dos participantes
              </p>

              {userRole === 'admin' && (
                <div className="mb-8 rounded-2xl border border-indigo-500/20 bg-indigo-950/30 p-6">
                  <h3 className="text-base font-semibold text-white mb-4">Configuração de pesos</h3>
                  {configLoading ? (
                    <p className="text-sm text-white/60">Carregando configuração…</p>
                  ) : (
                    <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <label className="block">
                        <span className="block text-xs text-white/70 font-semibold mb-2">Peso da frequência</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={rankingConfig.presenceWeight}
                          onChange={(e) =>
                            setRankingConfig({
                              ...rankingConfig,
                              presenceWeight: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-xs text-white/70 font-semibold mb-2">Peso do estudo bíblico</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={rankingConfig.biblicalWeight}
                          onChange={(e) =>
                            setRankingConfig({
                              ...rankingConfig,
                              biblicalWeight: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-xs text-white/70 font-semibold mb-2">Label customizado</span>
                        <input
                          type="text"
                          value={rankingConfig.extraLabel}
                          onChange={(e) =>
                            setRankingConfig({
                              ...rankingConfig,
                              extraLabel: e.target.value || 'Extra',
                            })
                          }
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                          placeholder="Ex: Comportamento"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-xs text-white/70 font-semibold mb-2">Peso do {rankingConfig.extraLabel}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={rankingConfig.extraWeight}
                          onChange={(e) =>
                            setRankingConfig({
                              ...rankingConfig,
                              extraWeight: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                        />
                      </label>
                    </form>
                  )}
                  <button
                    type="button"
                    onClick={saveRankingConfig}
                    disabled={rankSaving || configLoading}
                    className="mt-6 cursor-pointer rounded-full bg-linear-to-r from-indigo-900/90 via-indigo-800 to-indigo-900/90 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {rankSaving ? 'Salvando…' : 'Salvar configuração'}
                  </button>
                </div>
              )}

              {userRole === 'admin' && (
                <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-base font-semibold text-white">Adicionar {rankingConfig.extraLabel.toLowerCase()}</h3>
                    <p className="mt-1 text-sm text-white/60">
                      Procure o participante pelo nome e registre a pontuação extra no banco de dados.
                    </p>

                    <div className="mt-4 space-y-3">
                      <input
                        type="text"
                        value={rankingExtraSearch}
                        onChange={(e) => {
                          setRankingExtraSearch(e.target.value)
                        }}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30"
                        placeholder="Buscar participante por nome"
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        {rankingExtraCandidates.length > 0 ? (
                          rankingExtraCandidates.map((participant) => (
                            <button
                              key={participant.id}
                              type="button"
                              onClick={() => handleToggleExtraParticipant(participant.id)}
                              className={`rounded-xl border px-3 py-2 text-left text-sm transition cursor-pointer ${
                                selectedExtraParticipantIds.includes(participant.id)
                                  ? 'border-indigo-400/50 bg-indigo-500/15 text-white'
                                  : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                              }`}
                            >
                              <span className="block font-medium">{participant.name}</span>
                              <span className="mt-1 block text-xs text-white/50">
                                Total atual: {participant.score.toFixed(1)}
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="sm:col-span-2 rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-white/45">
                            Nenhum participante encontrado para essa busca.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
                    <h3 className="text-base font-semibold text-white">Lançamento selecionado</h3>
                    {selectedExtraParticipants.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-4 max-h-40 overflow-y-auto">
                          <p className="text-sm font-semibold text-white mb-2">
                            {selectedExtraParticipants.length} participante(s) selecionado(s):
                          </p>
                          <ul className="text-xs text-white/70 space-y-1 list-disc pl-4">
                            {selectedExtraParticipants.map(p => (
                              <li key={p._id}>{p.name} (Atual: {getParticipantScoreSummary(p, rankingConfig).totalScore.toFixed(1)})</li>
                            ))}
                          </ul>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={extraDrafts['bulk']?.points || ''}
                          onChange={(e) => updateExtraDraft('bulk', 'points', e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30"
                          placeholder="Valor da pontuação extra (para todos)"
                        />
                        <input
                          type="text"
                          value={extraDrafts['bulk']?.reason || ''}
                          onChange={(e) => updateExtraDraft('bulk', 'reason', e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30"
                          placeholder="Motivo da pontuação"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddExtraScoreBulk()}
                          disabled={selectedExtraParticipants.some(p => extraSavingIds.has(p._id))}
                          className="w-full rounded-full border border-indigo-400/30 bg-indigo-500/15 px-4 py-2.5 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                          {selectedExtraParticipants.some(p => extraSavingIds.has(p._id))
                            ? 'Salvando...'
                            : `Adicionar ${rankingConfig.extraLabel}`}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-white/55">
                        Selecione um ou mais participantes na busca para registrar a pontuação extra em massa.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tabela de ranking */}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10 bg-white/10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/80">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/80">Nome</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-white/80">Frequência geral</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-white/80">Estudo bíblico</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-white/80">{rankingConfig.extraLabel} geral</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-yellow-300">Pontuação geral</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.rankingList && analytics.rankingList.length > 0 ? (
                      analytics.rankingList.map((item, idx) => {
                        const highlight = getRankingHighlight(idx)

                        return (
                        <tr key={item.id} className={`border-b border-white/5 transition ${highlight.row}`}>
                          <td className={`px-4 py-3 font-bold ${highlight.rank}`}>{idx + 1}</td>
                          <td className={`px-4 py-3 ${highlight.name}`}>
                            <span className="inline-flex items-center gap-2">
                              {idx < 3 ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className={`h-4 w-4 shrink-0 ${highlight.trophy}`}
                                  aria-hidden="true"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M15 3a1 1 0 011 1v1h1.5A1.5 1.5 0 0119 6.5V7a5 5 0 01-4 4.9V13a3 3 0 01-2 2.816V17h1.5a.75.75 0 010 1.5h-9a.75.75 0 010-1.5H7v-1.184A3 3 0 015 13v-1.1A5 5 0 011 7V6.5A1.5 1.5 0 012.5 5H4V4a1 1 0 011-1h10zM4 6.5H2.5V7A3.5 3.5 0 005 10.465V6.5H4zm11 3.965A3.5 3.5 0 0017.5 7v-.5H16v3.965z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : null}
                              <span className="font-medium">{item.name}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-white/80">
                            <span className="block font-semibold text-white">{item.attendanceScore.toFixed(1)}</span>
                            <span className="text-xs text-white/45">
                              {item.attendance} x {rankingConfig.presenceWeight}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-white/80">
                            <span className="block font-semibold text-white">{item.biblicalScore.toFixed(1)}</span>
                            <span className="text-xs text-white/45">
                              {item.biblicalLessons} x {rankingConfig.biblicalWeight}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-white/80">
                            <span
                              className="inline-flex cursor-help items-center rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-white/90"
                              title={
                                item.extraEntries.length > 0
                                  ? item.extraEntries.map((entry) => `+${entry.points}: ${entry.reason}`).join('\n')
                                  : 'Sem pontuacao extra registrada.'
                              }
                            >
                              {item.extraScore.toFixed(1)}
                            </span>
                            <span className="mt-2 block text-xs text-white/45">
                              {item.extra} x {rankingConfig.extraWeight}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${highlight.score}`}>
                              {item.score.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      )})
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                          Nenhum participante cadastrado ainda
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === 'sorteio' && (
          <section
            className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden px-5 py-6 sm:px-8 sm:py-8"
            aria-labelledby="sorteio-heading"
          >
            <div className="absolute inset-0 bg-linear-to-br from-fuchsia-950/15 via-transparent to-slate-900/25 pointer-events-none" />
            <div className="relative">
              <h2 id="sorteio-heading" className="text-lg font-bold text-white text-center sm:text-left">
                Sorteio
              </h2>
              <p className="text-sm text-white/55 mt-1 mb-8 text-center sm:text-left max-w-3xl">
                Escolha entre sortear um participante por dia de frequência ou gerar um número aleatório.
              </p>

              <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-base font-semibold text-white">Tipo de sorteio</h3>
                  <div className="mt-4 grid gap-3">
                    <button
                      type="button"
                      onClick={() => setDrawMode('nome')}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        drawMode === 'nome'
                          ? 'border-fuchsia-400/50 bg-fuchsia-500/15 text-white'
                          : 'border-white/10 bg-black/20 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      <span className="block text-sm font-semibold">Sorteio por nome</span>
                      <span className="mt-1 block text-xs text-white/55">
                        Filtra os participantes pelo dia de frequência e sorteia um nome.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDrawMode('numero')}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        drawMode === 'numero'
                          ? 'border-fuchsia-400/50 bg-fuchsia-500/15 text-white'
                          : 'border-white/10 bg-black/20 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      <span className="block text-sm font-semibold">Sorteio por número</span>
                      <span className="mt-1 block text-xs text-white/55">
                        Define um número máximo e sorteia um valor de 1 até esse limite.
                      </span>
                    </button>
                  </div>
                </div>

                {drawMode === 'nome' ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div className="relative block w-full max-w-md" ref={drawDayMenuRef}>
                        <span className="block text-xs text-white/70 font-semibold mb-2">Dia da frequência</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (frequencyDayOptions.length > 0) {
                              setIsDrawDayMenuOpen((prev) => !prev)
                            }
                          }}
                          className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm text-white outline-none transition hover:bg-white/10 focus:border-white/30"
                          aria-haspopup="listbox"
                          aria-expanded={isDrawDayMenuOpen}
                          disabled={frequencyDayOptions.length === 0}
                        >
                          <span>
                            {selectedDrawDayMeta?.label || 'Nenhum dia com frequência registrada'}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className={`h-5 w-5 text-white/60 transition ${isDrawDayMenuOpen ? 'rotate-180' : ''}`}
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>

                        {isDrawDayMenuOpen && frequencyDayOptions.length > 0 ? (
                          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
                            <div
                              role="listbox"
                              aria-label="Dias da frequência"
                              className="max-h-64 overflow-y-auto p-2 custom-scrollbar"
                            >
                              {frequencyDayOptions.map((day) => {
                                const isSelected = String(day.id) === selectedDrawDay
                                return (
                                  <button
                                    key={day.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                      setSelectedDrawDay(String(day.id))
                                      setIsDrawDayMenuOpen(false)
                                    }}
                                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition ${
                                      isSelected
                                        ? 'bg-fuchsia-500/15 text-white ring-1 ring-fuchsia-400/30'
                                        : 'text-white/75 hover:bg-white/8 hover:text-white'
                                    }`}
                                  >
                                    <span>{day.label}</span>
                                    {isSelected ? (
                                      <span className="text-xs font-semibold text-fuchsia-200">Selecionado</span>
                                    ) : null}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={handleNameDraw}
                        disabled={participantsForSelectedDrawDay.length === 0}
                        className="rounded-full bg-linear-to-r from-fuchsia-900/90 via-fuchsia-700 to-fuchsia-900/90 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      >
                        Sortear nome
                      </button>
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <h3 className="text-sm font-semibold text-white">
                          Participantes do {selectedDrawDayMeta?.label || 'dia selecionado'}
                        </h3>
                        <p className="mt-1 text-xs text-white/55">
                          Total elegível: {participantsForSelectedDrawDay.length}
                        </p>

                        {participantsForSelectedDrawDay.length > 0 ? (
                          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                            {participantsForSelectedDrawDay.map((participant, index) => (
                              <div
                                key={participant._id}
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85"
                              >
                                <span className="font-semibold text-fuchsia-200">{index + 1}.</span> {participant.name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">
                            Nenhum participante com presença registrada nesse dia.
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4">
                        <h3 className="text-sm font-semibold text-white">Resultado do sorteio</h3>
                        {drawNameResult ? (
                          <div className="mt-4 rounded-2xl border border-fuchsia-400/30 bg-black/20 p-5">
                            <p className="text-xs uppercase tracking-wide text-fuchsia-200/80">Nome sorteado</p>
                            <p className="mt-2 text-2xl font-bold text-white">{drawNameResult.name}</p>
                            <p className="mt-3 text-sm text-white/60">
                              Dia usado no sorteio: {selectedDrawDayMeta?.label || 'Não informado'}
                            </p>
                            <p className="mt-1 text-sm text-white/60">
                              WhatsApp: {drawNameResult.whatsapp || 'Não informado'}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">
                            Escolha um dia da frequência e clique em sortear nome.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="max-w-md">
                      <label className="block">
                        <span className="block text-xs text-white/70 font-semibold mb-2">Número máximo</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={numberDrawMax}
                          onChange={(e) => setNumberDrawMax(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30"
                          placeholder="Ex: 100"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleNumberDraw}
                        className="mt-4 rounded-full bg-linear-to-r from-fuchsia-900/90 via-fuchsia-700 to-fuchsia-900/90 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition cursor-pointer"
                      >
                        Sortear número
                      </button>
                    </div>

                    <div className="mt-6 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-5">
                      <h3 className="text-sm font-semibold text-white">Resultado do sorteio</h3>
                      {drawNumberResult != null ? (
                        <div className="mt-4 rounded-2xl border border-fuchsia-400/30 bg-black/20 p-6 text-center">
                          <p className="text-xs uppercase tracking-wide text-fuchsia-200/80">Número sorteado</p>
                          <p className="mt-3 text-5xl font-black text-white">{drawNumberResult}</p>
                          <p className="mt-3 text-sm text-white/55">Intervalo considerado: 1 até {numberDrawMax}</p>
                        </div>
                      ) : (
                        <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">
                          Informe o limite máximo e clique em sortear número.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {deleteConfirmId ? (
          <div
            className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
          >
            <div
              className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950/95 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="confirm-delete-title" className="text-lg font-bold text-white">
                Confirmar exclusão
              </h2>
              <p className="text-sm text-white/70 mt-3">
                Tem certeza que deseja excluir este participante? Esta ação não pode ser desfeita.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
                  disabled={deletingIds.has(deleteConfirmId)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-full border border-red-400/40 bg-red-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={deletingIds.has(deleteConfirmId)}
                >
                  {deletingIds.has(deleteConfirmId) ? 'Aguarde…' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ScreenShell>
  )
}



