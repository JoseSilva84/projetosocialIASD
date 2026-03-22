export default function ScreenShell({
  children,
  maxWidthClass = 'max-w-sm',
  alignClass = 'items-center',
}) {
  return (
    <section
      className={`relative min-h-screen w-full flex ${alignClass} justify-center px-4 sm:px-6 pt-8 pb-28 sm:pt-10 sm:pb-32 overflow-x-hidden overflow-y-auto`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-black" />
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-slate-700/20 blur-3xl" />
      <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-slate-600/20 blur-3xl" />

      <div className={`relative z-[1] w-full ${maxWidthClass}`}>{children}</div>
    </section>
  )
}
