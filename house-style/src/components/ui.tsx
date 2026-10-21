import { ReactNode } from 'react'

export const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="card">
    <div className="text-xs text-zinc-400">{label}</div>
    <div className="mt-2 text-2xl font-semibold text-zinc-50">{value}</div>
    {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
  </div>
)
export const Field = ({ label, children }: { label: string; children: ReactNode }) => (<div><label className="label">{label}</label>{children}</div>)
export const Empty = ({ text, action }: { text: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-zinc-500">{text}{action}</div>
)
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="pop max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-ink-600 bg-ink-900 p-6 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-zinc-50">{title}</h2><button className="text-zinc-500 hover:text-zinc-200" onClick={onClose} aria-label="Fechar">✕</button></div>
        {children}
      </div>
    </div>
  )
}
export const PeriodBar = ({ p, setP, from, to, setFrom, setTo }: any) => (
  <div className="flex flex-wrap items-center gap-2">
    {([['hoje', 'Hoje'], ['semana', 'Esta semana'], ['mes', 'Este mês'], ['custom', 'Período']] as const).map(([k, l]) => (
      <button key={k} onClick={() => setP(k)} className={'btn ' + (p === k ? 'border-gold text-gold' : '')}>{l}</button>
    ))}
    {p === 'custom' && (<><input type="date" className="input w-auto" value={from} onChange={e => setFrom(e.target.value)} /><input type="date" className="input w-auto" value={to} onChange={e => setTo(e.target.value)} /></>)}
  </div>
)

const P: Record<string, string> = {
  dollar: 'M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  users: 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  ticket: 'M3 9a2 2 0 002-2V5h14v2a2 2 0 002 2v6a2 2 0 00-2 2v2H5v-2a2 2 0 00-2-2V9z',
  clock: 'M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z'
}
export const Icon = ({ n, c = '' }: { n: string; c?: string }) => (
  <svg viewBox="0 0 24 24" className={'h-5 w-5 ' + c} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={P[n]} /></svg>
)
export const Kpi = ({ icon, label, value, delta }: { icon: string; label: string; value: string; delta?: number | null }) => (
  <div className="card flex items-center gap-4">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold"><Icon n={icon} /></div>
    <div className="min-w-0">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="truncate text-2xl font-semibold text-zinc-50">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">
        {delta == null ? 'Sem base de comparação' : <span className={delta >= 0 ? 'text-gold' : 'text-red-400'}>{delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1).replace('.', ',')}% <span className="text-zinc-500">vs. mês anterior</span></span>}
      </div>
    </div>
  </div>
)
