import { useState } from 'react'
import { useStore } from '../lib/store'
import { Empty } from '../components/ui'
import { brl, commissionOf, fmtDate, refundSale } from '../lib/finance'

export default function Atendimentos({ onQuick, restricted = false, barberId, authorize }: { onQuick: () => void; restricted?: boolean; barberId?: string; authorize?: () => Promise<boolean> }) {
  const { db, update, toast } = useStore()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState('')
  const barber = (id: string) => db.barbers.find(b => b.id === id)?.name ?? '—'
  const ownSales = db.sales.filter(s => !restricted || (barberId && s.barberId === barberId))
  const rows = ownSales.filter(s => (s.client + s.serviceName + barber(s.barberId)).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-4">
      {restricted && !barberId && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-200">Seu perfil ainda não está vinculado a um barbeiro. O histórico ficará vazio até que o administrador configure esse vínculo.</p>}
      <div className="flex flex-wrap gap-3"><input className="input max-w-xs" placeholder="Buscar cliente, serviço ou barbeiro" value={q} onChange={e => setQ(e.target.value)} /><button className="btn btn-gold" onClick={onQuick}>Novo atendimento rápido</button></div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="card"><Empty text={ownSales.length ? 'Nenhum atendimento encontrado para essa busca.' : 'Nenhum atendimento registrado ainda.'} action={!ownSales.length && <button className="btn btn-gold" onClick={onQuick}>Registrar o primeiro</button>} /></div>}
        {rows.map(s => (
          <div key={s.id} className={'card py-3 ' + (s.status === 'estornado' ? 'opacity-60' : '')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button className="text-left" onClick={() => setOpen(open === s.id ? '' : s.id)}>
                <div className="text-sm text-zinc-100">{s.serviceName}{s.client && ` · ${s.client}`}</div>
                <div className="text-xs text-zinc-500">{fmtDate(s.date)} {s.date.slice(11, 16)} · {barber(s.barberId)} · {s.payment} · {s.origin === 'rapido' ? 'Rápido' : 'Agenda'}</div>
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm"><div className={s.status === 'estornado' ? 'line-through' : ''}>{brl(s.amount)}</div><div className="text-xs text-zinc-500">comissão {brl(commissionOf(s))}</div></div>
                {s.status === 'ativo' && !restricted ? <button className="btn" onClick={async () => { if (confirm('Estornar este atendimento? A receita e a comissão saem dos cálculos, e o registro continua no histórico.') && (!authorize || await authorize())) { update(d => refundSale(d, s.id)); toast('Atendimento estornado.') } }}>Estornar</button> : s.status === 'estornado' ? <span className="text-xs text-red-400">Estornado</span> : null}
              </div>
            </div>
            {open === s.id && <div className="pop mt-3 grid gap-1 border-t border-ink-700 pt-3 text-xs text-zinc-400 sm:grid-cols-2">
              <span>Valor cobrado: {brl(s.amount)}</span><span>Comissão: {s.commissionPct}% = {brl(commissionOf(s))}</span>
              <span>Parte da barbearia: {brl(s.amount - commissionOf(s))}</span><span>Situação: {s.status === 'ativo' ? 'Contabilizado' : 'Estornado'}</span>
              {s.notes && <span className="sm:col-span-2">Observações: {s.notes}</span>}
            </div>}
          </div>
        ))}
      </div>
    </div>
  )
}
