import { useState } from 'react'
import { Empty, PeriodBar, Stat } from '../components/ui'
import { barberStats, brl, fmtDate, Period, rangeOf } from '../lib/finance'
import { useStore } from '../lib/store'

export default function MeusRendimentos({ barberId }: { barberId?: string }) {
  const { db } = useStore()
  const [period, setPeriod] = useState<Period>('mes')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  if (!barberId) {
    return <div role="alert" className="card text-sm text-amber-200">Seu perfil ainda não está vinculado a um barbeiro. Entre em contato com a administração.</div>
  }

  const [start, end] = rangeOf(period, from, to)
  const stats = barberStats(db, barberId, start, end)

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-400">Este resumo mostra apenas os rendimentos associados ao seu perfil de barbeiro.</p>
      <PeriodBar p={period} setP={setPeriod} from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Atendimentos" value={String(stats.count)} />
        <Stat label="Faturamento próprio" value={brl(stats.revenue)} />
        <Stat label="Minha comissão" value={brl(stats.commission)} />
        <Stat label="Ticket médio" value={brl(stats.ticket)} />
      </div>
      <section className="card">
        <h2 className="mb-3 text-sm font-medium text-zinc-200">Meu histórico de serviços</h2>
        {stats.sales.length === 0
          ? <Empty text="Nenhum atendimento registrado neste período." />
          : <div className="space-y-2">
            {stats.sales.map(sale => (
              <div key={sale.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700 py-3 last:border-0">
                <div><div className="text-sm text-zinc-100">{sale.serviceName}</div><div className="text-xs text-zinc-500">{fmtDate(sale.date)} · {sale.origin === 'rapido' ? 'Atendimento rápido' : 'Agendamento'}{sale.status === 'estornado' ? ' · Estornado' : ''}</div></div>
                <div className="text-right"><div className="text-sm text-zinc-100">{brl(sale.amount)}</div><div className="text-xs text-zinc-500">Comissão: {brl(sale.amount * sale.commissionPct / 100)}</div></div>
              </div>
            ))}
          </div>}
      </section>
    </div>
  )
}
