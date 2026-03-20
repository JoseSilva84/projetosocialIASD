const EmailIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M4 6.75C4 5.7835 4.7835 5 5.75 5H18.25C19.2165 5 20 5.7835 20 6.75V17.25C20 18.2165 19.2165 19 18.25 19H5.75C4.7835 19 4 18.2165 4 17.25V6.75Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M6.2 7.6L12 12L17.8 7.6"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M7.5 10.5V8.6C7.5 6.372 9.298 4.575 11.526 4.575C13.754 4.575 15.552 6.372 15.552 8.6V10.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M7.2 10.5H16.2C17.177 10.5 17.97 11.293 17.97 12.27V17.13C17.97 18.107 17.177 18.9 16.2 18.9H7.2C6.223 18.9 5.43 18.107 5.43 17.13V12.27C5.43 11.293 6.223 10.5 7.2 10.5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M11.7 14V15.7"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const UserSilhouette = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M12 12.2C14.2091 12.2 16 10.4091 16 8.2C16 5.99086 14.2091 4.2 12 4.2C9.79086 4.2 8 5.99086 8 8.2C8 10.4091 9.79086 12.2 12 12.2Z"
      fill="currentColor"
      fillOpacity="0.9"
    />
    <path
      d="M4.5 19.8C5.9 16.4 8.4 14.7 12 14.7C15.6 14.7 18.1 16.4 19.5 19.8"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const Login = () => {
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center px-4 py-10 overflow-hidden">     {/* Fundo gradiente + borrões (igual ao modelo do print) */}
      <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-black" />
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-slate-700/20 blur-3xl" />
      <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-slate-600/20 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-slate-500/15 via-transparent to-slate-700/15" />

          <div className="relative px-7 py-9">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/5">
              <UserSilhouette className="h-12 w-12 text-white/60" aria-hidden="true" />
            </div>

            <form
              onSubmit={(e) => {
                // Evita recarregar a página enquanto não houver backend.
                e.preventDefault();
              }}
              className="space-y-6"
            >
              <h1 className="text-2xl font-bold text-center text-white">Projeto Eu quero Ser Feliz</h1>

              <div className="flex items-center gap-3 border-b border-white/25 pb-3">
                <EmailIcon className="h-4 w-4 text-white/70" aria-hidden="true" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email ID"
                  autoComplete="email"
                  className="w-full bg-transparent py-1 text-sm text-white placeholder:text-white/60 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 border-b border-white/25 pb-3">
                <LockIcon className="h-4 w-4 text-white/70" aria-hidden="true" />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full bg-transparent py-1 text-sm text-white placeholder:text-white/60 outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-white/70">
                <label className="flex items-center gap-2 select-none cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-white/25 text-slate-300 focus:ring-slate-400/30" />
                  <span>Lembrar-me</span>
                </label>
                <button
                  type="button"
                  className="cursor-pointer text-white/70 underline decoration-white/40 underline-offset-2 hover:decoration-white/70"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-linear-to-r from-slate-800 via-slate-700 to-slate-800 px-6 py-3 text-sm font-semibold tracking-widest text-white
                shadow-lg shadow-slate-900/20 hover:brightness-110 transition cursor-pointer"
              >
                LOGIN
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;