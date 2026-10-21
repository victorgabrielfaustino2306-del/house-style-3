import { FormEvent, useState } from 'react'
import { useAuth, supabaseReady } from '../lib/auth-context'

type Mode = 'login' | 'signup' | 'recovery'

export default function Login() {
  const { signIn, signUp, resetPassword, profileError } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordAgain, setPasswordAgain] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setSuccess('')
    setPassword('')
    setPasswordAgain('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setError('')
    setSuccess('')
    if (mode === 'signup') {
      if (name.trim().length < 2) return setError('Informe seu nome completo.')
      if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
      if (password !== passwordAgain) return setError('As senhas não são iguais.')
    }
    if (mode === 'recovery' && !email.trim()) return setError('Informe o e-mail da sua conta.')

    setBusy(true)
    const result = mode === 'login'
      ? await signIn(email, password, remember)
      : mode === 'signup'
        ? await signUp(email, password, name)
        : await resetPassword(email)
    setBusy(false)
    if (result) setError(result)
    else if (mode === 'recovery') setSuccess('Se houver uma conta para esse e-mail, enviaremos um link para redefinir sua senha.')
    else if (mode === 'signup') setSuccess('Cadastro realizado. Verifique seu e-mail para confirmar a conta, se solicitado.')
  }

  const title = mode === 'login' ? 'Bem-vindo de volta' : mode === 'signup' ? 'Crie sua conta' : 'Recuperar senha'

  return (
    <main className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="auth-glow pointer-events-none absolute inset-0" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-ink-900/90 shadow-2xl shadow-black/40 lg:grid-cols-[1fr_0.92fr]">
        <section className="auth-brand-panel relative hidden min-h-[640px] flex-col justify-between overflow-hidden border-r border-white/10 p-12 lg:flex">
          <div aria-hidden="true" className="auth-brand-mark absolute -bottom-28 -left-16 font-serif">H</div>
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 font-serif text-xl text-gold">H</div>
            <span className="font-serif text-xl tracking-[0.18em] text-zinc-100">HOUSE STYLE</span>
          </div>
          <div className="relative max-w-md">
            <div className="mb-5 h-px w-16 bg-gold" />
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Barbearia · Desde sempre, com estilo</p>
            <h1 className="font-serif text-5xl leading-tight text-zinc-50">Seu estilo.<br />Seu espaço.</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-400">Entre para acompanhar a rotina da House Style com a experiência de cuidado que você merece.</p>
          </div>
          <p className="relative text-xs tracking-wide text-zinc-500">PRECISÃO · PRESENÇA · PERSONALIDADE</p>
        </section>

        <section className="flex min-h-[600px] flex-col justify-center px-6 py-9 sm:px-12 lg:px-14">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 font-serif text-lg text-gold">H</div>
            <span className="font-serif text-lg tracking-[0.16em] text-zinc-100">HOUSE STYLE</span>
          </div>
          <div className="mb-7">
            <p className="text-xs uppercase tracking-[0.24em] text-gold">Acesso exclusivo</p>
            <h2 className="mt-2 font-serif text-3xl text-zinc-50">{title}</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {mode === 'login' ? 'Acesse sua conta para continuar.' : mode === 'signup' ? 'Novos cadastros começam com perfil de cliente.' : 'Enviaremos as instruções para o seu e-mail.'}
            </p>
          </div>

          {mode !== 'recovery' && (
            <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Acesso">
              <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => switchMode('login')} className={'rounded-lg px-3 py-2.5 text-sm transition ' + (mode === 'login' ? 'bg-gold text-ink-950' : 'text-zinc-400 hover:text-zinc-100')}>Entrar</button>
              <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => switchMode('signup')} className={'rounded-lg px-3 py-2.5 text-sm transition ' + (mode === 'signup' ? 'bg-gold text-ink-950' : 'text-zinc-400 hover:text-zinc-100')}>Criar conta</button>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-name" className="label">Nome completo</label>
                <input id="auth-name" className="input auth-input" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required minLength={2} />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="label">E-mail</label>
              <div className="relative">
                <input id="auth-email" className="input auth-input pl-10" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required />
                <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              </div>
            </div>
            {mode !== 'recovery' && (
              <div>
                <label htmlFor="auth-password" className="label">Senha</label>
                <div className="relative">
                  <input id="auth-password" className="input auth-input pr-12" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 6 : undefined} />
                  <button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-0 px-3 text-xs text-zinc-400 transition hover:text-gold">{showPassword ? 'Ocultar' : 'Mostrar'}</button>
                </div>
              </div>
            )}
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-password-again" className="label">Confirme sua senha</label>
                <input id="auth-password-again" className="input auth-input" type={showPassword ? 'text' : 'password'} value={passwordAgain} onChange={event => setPasswordAgain(event.target.value)} autoComplete="new-password" required minLength={6} />
              </div>
            )}
            {mode === 'login' && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-zinc-400">
                  <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} className="accent-[#c8a96a]" />
                  Lembrar-me neste aparelho
                </label>
                <button type="button" onClick={() => switchMode('recovery')} className="text-gold-soft transition hover:text-gold">Esqueci minha senha</button>
              </div>
            )}
            {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</p>}
            {success && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300">{success}</p>}
            {profileError && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">{profileError}</p>}
            {!supabaseReady && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">Autenticação indisponível: configure o projeto Supabase no arquivo <code>.env.local</code>. Nenhuma conta de demonstração será criada neste navegador.</p>}
            <button type="submit" disabled={busy || !supabaseReady} className="btn btn-gold w-full py-3.5 text-sm">
              {busy && <span aria-hidden="true" className="auth-spinner" />}
              {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar na minha conta' : mode === 'signup' ? 'Criar conta' : 'Enviar link de recuperação'}
            </button>
          </form>

          {mode === 'recovery' && <button type="button" onClick={() => switchMode('login')} className="mt-5 text-sm text-zinc-400 transition hover:text-gold">Voltar para entrar</button>}
          {mode === 'signup' && <p className="mt-5 text-center text-xs leading-5 text-zinc-500">Ao criar sua conta, você receberá acesso de cliente. Perfis administrativos só podem ser atribuídos por um administrador autorizado.</p>}
        </section>
      </div>
    </main>
  )
}
