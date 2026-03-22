export default function ScreenShell({ children, maxWidthClass = 'max-w-sm' }) {
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-black" />
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-slate-700/20 blur-3xl" />
      <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-slate-600/20 blur-3xl" />

      <div className={`relative w-full ${maxWidthClass}`}>{children}</div>
    </section>
  )
}
