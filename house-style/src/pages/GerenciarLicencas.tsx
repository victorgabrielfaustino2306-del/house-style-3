import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'

interface Account {
  user_id: string
  email: string
  full_name: string
  role: 'customer' | 'barber'
  barber_id: string | null
}

interface LicenseRow {
  license_id: string
  user_id: string
  email: string
  barber_name: string
  barber_id: string
  code_last4: string
  status: 'pending' | 'active' | 'expired' | 'blocked' | 'cancelled'
  days_remaining: number | null
  created_at: string
  activated_at: string | null
  expires_at: string | null
  last_renewed_at: string | null
}

interface HistoryRow {
  action: string
  actor_email: string
  created_at: string
  details: Record<string, unknown>
}

const ACTION_LABEL: Record<string, string> = {
  generated: 'Código gerado',
  activated: 'Licença ativada',
  renewed: 'Licença renovada',
  blocked: 'Acesso bloqueado',
  unblocked: 'Acesso desbloqueado',
  cancelled: 'Licença cancelada'
}

const STATUS_LABEL: Record<LicenseRow['status'], string> = {
  pending: 'Aguardando ativação',
  active: 'Ativo',
  expired: 'Expirado',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado'
}

function dateTime(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('pt-BR')
}

function daysLeft(days: number | null) {
  if (days === null) return '—'
  if (days <= 0) return `Expirado há ${Math.max(1, Math.abs(days))} dia(s)`
  return days <= 5 ? `Atenção — faltam ${days} dia(s)` : `Faltam ${days} dia(s)`
}

function parseRows<T>(data: unknown): T[] {
  if (!Array.isArray(data)) throw new Error('O Supabase retornou uma lista inválida.')
  return data as T[]
}

export default function GerenciarLicencas() {
  const { db, toast } = useStore()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const [accounts, setAccounts] = useState<Account[]>([])
  const [licenses, setLicenses] = useState<LicenseRow[]>([])
  const [accountId, setAccountId] = useState('')
  const [barberId, setBarberId] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generatedCode, setGeneratedCode] = useState('')
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [showCode, setShowCode] = useState(false)

  const refresh = useCallback(async () => {
    if (!supabase) {
      toastRef.current('O Supabase não está configurado.', true)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [accountResult, licenseResult] = await Promise.all([
        supabase.rpc('admin_list_license_accounts'),
        supabase.rpc('admin_list_barber_licenses')
      ])
      if (accountResult.error) throw accountResult.error
      if (licenseResult.error) throw licenseResult.error
      setAccounts(parseRows<Account>(accountResult.data))
      setLicenses(parseRows<LicenseRow>(licenseResult.data))
    } catch (error) {
      toastRef.current(error instanceof Error ? error.message : 'Não foi possível carregar as licenças.', true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const assignBarber = async () => {
    const account = accounts.find(item => item.user_id === accountId)
    const barber = db.barbers.find(item => item.id === barberId)
    if (!account || !barber) return toast('Selecione uma conta e um barbeiro cadastrado neste navegador.', true)
    if (!confirm(`Vincular ${account.email} à ficha local de ${barber.name} e atribuir o perfil de barbeiro?`)) return
    setBusy(true)
    try {
      const { error } = await supabase!.rpc('admin_assign_barber', {
        p_user_id: account.user_id,
        p_barber_id: barber.id
      })
      if (error) throw error
      toast('Conta vinculada ao perfil de barbeiro.')
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível vincular a conta.', true)
    } finally {
      setBusy(false)
    }
  }

  const generate = async (userId: string) => {
    const account = accounts.find(item => item.user_id === userId)
    if (!account || !confirm(`Gerar um código exclusivo para ${account.full_name || account.email}? O código será exibido uma única vez.`)) return
    setBusy(true)
    setGeneratedCode('')
    setShowCode(true)
    try {
      const { data, error } = await supabase!.rpc('admin_generate_barber_license', { p_barber_user_id: userId })
      if (error) throw error
      if (!data || typeof data !== 'object' || !('code' in data) || typeof data.code !== 'string') throw new Error('A resposta do Supabase não incluiu o código gerado.')
      setGeneratedCode(data.code)
      toast('Licença criada. Copie o código e entregue-o ao barbeiro.')
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível gerar a licença.', true)
      setShowCode(false)
    } finally {
      setBusy(false)
    }
  }

  const performAction = async (license: LicenseRow, action: 'renew' | 'block' | 'unblock' | 'cancel') => {
    const labels = {
      renew: license.status === 'blocked' ? 'renovar e reativar explicitamente' : 'renovar por mais 30 dias',
      block: 'bloquear o acesso',
      unblock: 'desbloquear o acesso',
      cancel: 'cancelar definitivamente esta licença'
    }
    if (!confirm(`Deseja ${labels[action]} de ${license.barber_name}?`)) return
    setBusy(true)
    try {
      const result = action === 'renew'
        ? await supabase!.rpc('admin_renew_barber_license', { p_license_id: license.license_id })
        : await supabase!.rpc('admin_change_barber_license_status', {
          p_license_id: license.license_id,
          p_action: action
        })
      if (result.error) throw result.error
      toast(action === 'renew' ? 'Licença renovada; acesso revalidado.' : 'Status da licença atualizado.')
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível alterar a licença.', true)
    } finally {
      setBusy(false)
    }
  }

  const showHistory = async (license: LicenseRow) => {
    setBusy(true)
    try {
      const { data, error } = await supabase!.rpc('admin_barber_license_history', { p_license_id: license.license_id })
      if (error) throw error
      setHistory(parseRows<HistoryRow>(data))
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Não foi possível ler o histórico.', true)
    } finally {
      setBusy(false)
    }
  }

  const copyCode = async () => {
    if (!generatedCode) return
    try {
      await navigator.clipboard.writeText(generatedCode)
      toast('Código copiado.')
    } catch {
      toast('Não foi possível copiar. Selecione o código e copie manualmente.', true)
    }
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Vincular uma conta de barbeiro</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">Selecione uma conta já cadastrada e uma ficha de barbeiro existente. O usuário deve confirmar o e-mail antes de aparecer nesta lista.</p>
        </div>
        {db.barbers.length === 0
          ? <p className="text-sm text-amber-300">Cadastre primeiro a ficha do barbeiro na aba Barbeiros deste navegador.</p>
          : <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div><label htmlFor="license-account" className="label">Conta</label><select id="license-account" className="input" value={accountId} onChange={event => setAccountId(event.target.value)}><option value="">Selecione uma conta</option>{accounts.map(account => <option key={account.user_id} value={account.user_id}>{account.full_name || account.email} · {account.email} ({account.role === 'barber' ? 'Barbeiro' : 'Cliente'})</option>)}</select></div>
            <div><label htmlFor="license-barber" className="label">Ficha local do barbeiro</label><select id="license-barber" className="input" value={barberId} onChange={event => setBarberId(event.target.value)}><option value="">Selecione um barbeiro</option>{db.barbers.map(barber => <option key={barber.id} value={barber.id}>{barber.name} ({barber.id})</option>)}</select></div>
            <button className="btn btn-gold" onClick={assignBarber} disabled={busy || loading || !accountId || !barberId}>Vincular</button>
          </div>}
      </section>

      {showCode && generatedCode && (
        <section className="card border-emerald-500/30" role="status">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-medium text-emerald-300">Código gerado — copie agora</h2><p className="mt-1 text-sm text-zinc-400">Por segurança, o código completo não é armazenado nem poderá ser revelado novamente.</p></div>
            <button className="btn" onClick={() => { setShowCode(false); setGeneratedCode('') }}>Fechar</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-ink-600 bg-black/30 px-4 py-3 text-lg tracking-widest text-zinc-50">{generatedCode}</code>
            <button className="btn btn-gold" onClick={copyCode}>Copiar código</button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-zinc-100">Licenças dos barbeiros</h2><p className="mt-1 text-sm text-zinc-500">A validade é iniciada na ativação e calculada no servidor.</p></div>
          <button className="btn" onClick={() => void refresh()} disabled={loading || busy}>{loading ? 'Carregando...' : 'Atualizar lista'}</button>
        </div>
        {licenses.length === 0 && !loading && <div className="card text-sm text-zinc-500">Ainda não há licenças geradas.</div>}
        <div className="space-y-3">
          {licenses.map(license => {
            const canRenew = ['active', 'expired', 'blocked'].includes(license.status)
            const color = license.status === 'active' ? 'border-emerald-500/30 text-emerald-300' : license.status === 'expired' ? 'border-red-500/30 text-red-300' : license.status === 'pending' ? 'border-amber-500/30 text-amber-200' : 'border-zinc-600 text-zinc-400'
            const canUnblock = license.status === 'blocked' && license.expires_at !== null && new Date(license.expires_at).getTime() > Date.now()
            return (
              <article key={license.license_id} className="card space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-medium text-zinc-100">{license.barber_name || 'Barbeiro'}</h3><p className="text-sm text-zinc-400">{license.email}</p><p className="mt-1 text-xs text-zinc-500">Ficha: {license.barber_id} · Código termina em •••• {license.code_last4}</p></div>
                  <span className={'rounded-full border px-3 py-1 text-xs ' + color}>{(license.status === 'active' || license.status === 'expired') && license.expires_at ? daysLeft(license.days_remaining) : STATUS_LABEL[license.status]}</span>
                </div>
                <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-zinc-500">Ativação</dt><dd className="mt-1 text-zinc-300">{dateTime(license.activated_at)}</dd></div>
                  <div><dt className="text-zinc-500">Expiração</dt><dd className="mt-1 text-zinc-300">{dateTime(license.expires_at)}</dd></div>
                  <div><dt className="text-zinc-500">Última renovação</dt><dd className="mt-1 text-zinc-300">{dateTime(license.last_renewed_at)}</dd></div>
                  <div><dt className="text-zinc-500">Criada</dt><dd className="mt-1 text-zinc-300">{dateTime(license.created_at)}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-3">
                  {canRenew && <button className="btn btn-gold" onClick={() => void performAction(license, 'renew')} disabled={busy}>Renovar +30 dias{license.status === 'blocked' ? ' e reativar' : ''}</button>}
                  {license.status === 'active' && <button className="btn" onClick={() => void performAction(license, 'block')} disabled={busy}>Bloquear acesso</button>}
                  {canUnblock && <button className="btn" onClick={() => void performAction(license, 'unblock')} disabled={busy}>Desbloquear acesso</button>}
                  {license.status !== 'cancelled' && <button className="btn" onClick={() => void performAction(license, 'cancel')} disabled={busy}>Cancelar licença</button>}
                  <button className="btn" onClick={() => void showHistory(license)} disabled={busy}>Ver histórico</button>
                  {license.status === 'cancelled' && <button className="btn btn-gold" onClick={() => void generate(license.user_id)} disabled={busy}>Gerar novo código</button>}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {accounts.some(account => account.role === 'barber' && !licenses.some(license => license.user_id === account.user_id)) && (
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">Barbeiros sem código</h2>
          <div className="space-y-2">
            {accounts.filter(account => account.role === 'barber' && !licenses.some(license => license.user_id === account.user_id)).map(account => (
              <div key={account.user_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700 py-2 last:border-0">
                <div><span className="text-sm text-zinc-200">{account.full_name || 'Sem nome'}</span><span className="ml-2 text-xs text-zinc-500">{account.email}</span></div>
                <button className="btn btn-gold" onClick={() => void generate(account.user_id)} disabled={busy || !account.barber_id}>Gerar licença</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {history && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={() => setHistory(null)}>
          <section className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-ink-600 bg-ink-900 p-6 sm:rounded-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-zinc-100">Histórico da licença</h2><button className="btn" onClick={() => setHistory(null)}>Fechar</button></div>
            {history.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Nenhuma alteração registrada.</p> : <ol className="mt-4 space-y-3">{history.map((item, index) => <li key={`${item.created_at}-${index}`} className="border-l-2 border-gold/50 pl-3"><p className="text-sm text-zinc-100">{ACTION_LABEL[item.action] ?? item.action}</p><p className="mt-1 text-xs text-zinc-400">{dateTime(item.created_at)} · {item.actor_email}</p></li>)}</ol>}
          </section>
        </div>
      )}
    </div>
  )
}
