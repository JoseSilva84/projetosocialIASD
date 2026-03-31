import { useEffect, useState } from 'react'
import { PROJECT_COURSES } from '../../lib/courses'

export default function CoursesPanel() {
  const [openId, setOpenId] = useState(null)
  const open = openId ? PROJECT_COURSES.find((c) => c.id === openId) : null

  useEffect(() => {
    if (!openId) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId])

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 text-center max-w-2xl mx-auto">
        Área de cursos do projeto: trilhas formativas para apoiar o desenvolvimento das pessoas
        inscritas. <strong className="text-white/80">Clique num curso</strong> para ver detalhes e
        como participar.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PROJECT_COURSES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            className={`text-left relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br ${c.accent} p-5 flex flex-col min-h-[160px] cursor-pointer transition hover:brightness-110 hover:ring-2 hover:ring-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60`}
          >
            <h3 className="text-base font-semibold text-white">{c.title}</h3>
            <p className="text-sm text-white/70 mt-2 flex-1">{c.description}</p>
            <span className="inline-flex mt-4 self-start rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] text-white/55">
              Clique para detalhes
            </span>
          </button>
        ))}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="course-dialog-title"
          onClick={() => setOpenId(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-slate-950/95 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="course-dialog-title" className="text-lg font-bold text-white pr-10">
              {open.title}
            </h2>
            <p className="text-sm text-white/75 mt-3">{open.description}</p>
            <p className="text-sm text-white/60 mt-4 leading-relaxed">{open.detail}</p>
            <p className="text-xs text-white/45 mt-5 border-t border-white/10 pt-4">
              Para turmas, horários e vagas, fale com a coordenação do projeto na secretária.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/85 hover:bg-white/10 cursor-pointer"
              >
                Fechar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
