export default function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-[5] border-t border-white/10 bg-slate-950/85 py-3 px-4 text-center text-xs text-white/55 backdrop-blur-md"
      role="contentinfo"
    >
      © {year} @ Projeto Eu Quero Ser Feliz
    </footer>
  )
}
