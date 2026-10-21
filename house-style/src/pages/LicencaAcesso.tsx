import { FormEvent, useState } from 'react'
import { BarberLicense } from '../lib/auth'
import { useAuth } from '../lib/auth-context'

function dateTime(value?: string | null) {
  if (!value) return 'Ainda não ativada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

function remaining(expiration?: string | null, serverDays?: number | null) {
  if (!expiration) return ''
  const days = serverDays ?? Math.ceil((new Date(expiration).getTime() - Date.now()) / 86_400_000)
  if (days <= 0) return `Expirado há ${Math.max(1, Math.abs(days))} dia(s).`
  return days <= 5 ? `Atenção — faltam ${days} dia(s).` : `Ativo — faltam ${days} dia(s).`
}

export default function LicencaAcesso() {
  const { profile, license, licenseLoading, licenseError, activateLicense, validateLicense } = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const isExpired = license?.status === 'expired'
  const statusMessage = license?.status === 'blocked'
    ? 'Licença bloqueada. Entre em contato com a administração.'
    : license?.status === 'cancelled'
      ? 'Esta licença foi cancelada. Entre em contato com a administração.'
      : isExpired
        ? 'Sua licença expirou! Entre em contato com a administração para renovar o seu acesso.'
        : license?.status === 'pending'
          ? 'Sua licença ainda precisa ser ativada com o código enviado pela administração.'
          : license?.status === 'missing'
            ? 'Nenhuma licença foi localizada para esta conta. Solicite um código à administração.'
            : licenseError

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (code.trim().length < 6) return setError('Digite o código de licença recebido.')
    setBusy(true)
    const result = await activateLicense(code)
    setBusy(false)
    if (result) setError(result)
    else {
      setCode('')
      setMessage('Licença ativada. Verificando o acesso...')
    }
  }

  if (licenseLoading && !license) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-zinc-400"><span className="auth-spinner mr-3" />Verificando sua licença...</main>
  }

  return (
    <main className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <section className="card relative w-full max-w-lg space-y-5 border-white/10 bg-ink-900/95 p-6 sm:p-9">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 font-serif text-xl text-gold">H</div>
          <div>
            <p className="font-serif text-xl tracking-wide text-zinc-100">HOUSE STYLE</p>
            <p className="text-xs text-zinc-500">Acesso do barbeiro</p>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Licença de acesso</h1>
          <p className="mt-2 text-sm text-zinc-400">Olá, {profile?.full_name || 'barbeiro'}. Este código é vinculado à sua conta autenticada.</p>
        </div>
        {statusMessage && <p role={licenseError || isExpired || license?.status === 'blocked' ? 'alert' : 'status'} className={'rounded-lg border p-3 text-sm ' + (isExpired || license?.status === 'blocked' || license?.status === 'cancelled' || licenseError ? 'border-red-500/30 bg-red-950/30 text-red-300' : 'border-amber-500/30 bg-amber-950/20 text-amber-200')}>{statusMessage}</p>}
        {license?.expires_at && (
          <div className="rounded-lg border border-ink-600 bg-black/20 p-4 text-sm">
            <div className="text-zinc-400">Validade até <span className="text-zinc-100">{dateTime(license.expires_at)}</span></div>
            <div className="mt-1 text-gold">{remaining(license.expires_at, license.days_remaining)}</div>
          </div>
        )}
        {licenseError && <button type="button" className="btn w-full" onClick={() => void validateLicense()} disabled={licenseLoading}>{licenseLoading ? 'Verificando...' : 'Tentar validar novamente'}</button>}
        {license?.status !== 'blocked' && license?.status !== 'cancelled' && !licenseError && (
          <form onSubmit={submit} className="space-y-3">
            <label className="label" htmlFor="barber-license-code">Código da licença</label>
            <input id="barber-license-code" className="input auth-input uppercase tracking-wider" value={code} onChange={event => setCode(event.target.value.toUpperCase())} autoComplete="one-time-code" autoCapitalize="characters" required />
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
            <button className="btn btn-gold w-full py-3" type="submit" disabled={busy || licenseLoading}>
              {busy && <span aria-hidden="true" className="auth-spinner" />}
              {busy ? 'Validando...' : isExpired ? 'Informar novo código' : 'Ativar licença'}
            </button>
          </form>
        )}
        <p className="text-xs leading-5 text-zinc-500">A ativação é validada pelo Supabase e usa o horário do servidor. Não compartilhe seu código: ele só funciona na conta vinculada pela administração.</p>
      </section>
    </main>
  )
}
