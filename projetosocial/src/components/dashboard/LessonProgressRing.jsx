import { BIBLICAL_LESSON_COUNT } from '../../lib/biblicalLessons'

/**
 * Anel interativo: 15 segmentos — clique define a lição em estudo (callback).
 * Cores: concluída (verde), atual (âmbar), pendente (cinza).
 */
export default function LessonProgressRing({
  completedIds = [],
  currentId = null,
  onSegmentClick,
}) {
  const cx = 100
  const cy = 100
  const rOuter = 78
  const rInner = 52
  const segments = BIBLICAL_LESSON_COUNT
  const gap = 0.04

  function polar(cx0, cy0, r, angleRad) {
    return {
      x: cx0 + r * Math.cos(angleRad),
      y: cy0 + r * Math.sin(angleRad),
    }
  }

  const arcs = []
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * 2 * Math.PI - Math.PI / 2
    const a1 = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2
    const a0g = a0 + gap
    const a1g = a1 - gap
    const id = i + 1
    const done = completedIds.includes(id)
    const current = currentId === id

    let fill = 'rgba(148, 163, 184, 0.35)'
    if (done) fill = 'rgba(52, 211, 153, 0.75)'
    else if (current) fill = 'rgba(251, 191, 36, 0.85)'

    const p1 = polar(cx, cy, rOuter, a0g)
    const p2 = polar(cx, cy, rOuter, a1g)
    const p3 = polar(cx, cy, rInner, a1g)
    const p4 = polar(cx, cy, rInner, a0g)
    const large = a1g - a0g > Math.PI ? 1 : 0

    const d = [
      `M ${p1.x} ${p1.y}`,
      `A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y}`,
      `L ${p3.x} ${p3.y}`,
      `A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y}`,
      'Z',
    ].join(' ')

    arcs.push(
      <path
        key={id}
        d={d}
        fill={fill}
        stroke="rgba(15, 23, 42, 0.6)"
        strokeWidth={0.8}
        className="cursor-pointer transition hover:opacity-90 focus:outline-none"
        onClick={() => onSegmentClick?.(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSegmentClick?.(id)
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Lição ${id}${current ? ', estudo atual' : ''}${done ? ', concluída' : ''}`}
      />
    )
  }

  const doneCount = completedIds.length

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 200 200"
        className="w-full max-w-[min(100%,280px)] drop-shadow-lg"
        aria-hidden="false"
        aria-label="Gráfico circular do progresso nas 15 lições"
      >
        {arcs}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="rgba(255,255,255,0.95)"
          style={{ fontSize: '15px', fontWeight: 700 }}
        >
          {doneCount}/{BIBLICAL_LESSON_COUNT}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          style={{ fontSize: '10px' }}
        >
          lições concluídas
        </text>
      </svg>
      <p className="text-[11px] text-white/45 text-center max-w-xs">
        Clique em um segmento para definir a lição em estudo. Use os cartões abaixo para marcar como
        concluída.
      </p>
    </div>
  )
}
