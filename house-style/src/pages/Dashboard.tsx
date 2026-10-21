import { useStore } from '../lib/store'
import { Empty, Icon, Kpi } from '../components/ui'
import { BarChart, LineChart } from '../components/Charts'
import { addDays, barberStats, brl, fmtDate, monthRange, pctChange, prevMonthSamePeriod, summary, today, topServices } from '../lib/finance'

export default function Dashboard({ onQuick, go }: { onQuick: () => void; go: (p: string) => void }) {
  const { db } = useStore()
  const t = today()
  const [mf, mt] = monthRange(0)
  const [pf, pt] = prevMonthSamePeriod()
  const cur = summary(db, mf, mt), prev = summary(db, pf, pt)
  const clients = (r: ReturnType<typeof summary>) => new Set(r.sales.map(s => s.client.toLowerCase()).filter(Boolean)).size
  const apptsIn = (a: string, b: string) => db.appts.filter(x => x.date >= a && x.date <= b && x.status !== 'Cancelado').length
  const day = summary(db, t, t)
  const points = Array.from({ length: 30 }, (_, i) => { const d = addDays(t, i - 29); return { label: d.slice(8) + '/' + d.slice(5, 7), value: summary(db, d, d).revenue } })
  const hasRevenue = points.some(p => p.value > 0)
  const top = topServices(cur.sales)
  const upcoming = db.appts.filter(a => a.date >= t && (a.status === 'Confirmado' || a.status === 'Em andamento')).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 4)
  const rank = db.barbers.map(b => ({ b, ...barberStats(db, b.id, mf, mt) })).sort((a, b) => b.revenue - a.revenue)
  const refunds = db.sales.filter(s => s.status === 'estornado' && s.date.slice(0, 10) >= mf && s.date.slice(0, 10) <= mt).reduce((a, s) => a + s.amount, 0)
  const pending = db.appts.filter(a => a.date >= mf && a.date <= mt && (a.status === 'Confirmado' || a.status === 'Em andamento')).reduce((a, x) => a + x.price, 0)
  const row = (l: string, v: number, hint?: string) => <div key={l}><div className="text-xs text-zinc-400">{l}</div><div className="mt-1 text-lg font-semibold text-zinc-50">{brl(v)}</div>{hint && <div className="text-[11px] text-zinc-500">{hint}</div>}</div>
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-gold px-6 py-3" onClick={onQuick}>Novo atendimento rápido</button>
        <button className="btn px-6 py-3" onClick={() => go('Agenda')}>Novo agendamento</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="dollar" label="Faturamento do mês" value={brl(cur.revenue)} delta={pctChange(cur.revenue, prev.revenue)} />
        <Kpi icon="calendar" label="Agendamentos do mês" value={String(apptsIn(mf, mt))} delta={pctChange(apptsIn(mf, mt), apptsIn(pf, pt))} />
        <Kpi icon="users" label="Clientes atendidos" value={String(clients(cur))} delta={pctChange(clients(cur), clients(prev))} />
        <Kpi icon="ticket" label="Ticket médio" value={brl(cur.ticket)} delta={pctChange(cur.ticket, prev.ticket)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="mb-3 text-sm font-medium text-zinc-200">Faturamento · últimos 30 dias</h3>
          {hasRevenue ? <LineChart points={points} /> : <Empty text="Nenhum atendimento nos últimos 30 dias. O gráfico aparece assim que você registrar o primeiro." action={<button className="btn btn-gold" onClick={onQuick}>Registrar atendimento</button>} />}
        </div>
        <div className="card row-span-2">
          <h3 className="mb-3 text-sm font-medium text-zinc-200">Próximos agendamentos</h3>
          {upcoming.length ? upcoming.map(a => (
            <div key={a.id} className="flex items-center justify-between border-b border-ink-700 py-3 last:border-0">
              <div className="border-l-2 border-gold pl-3"><div className="text-sm text-zinc-100">{a.client}</div><div className="text-xs text-zinc-500">{db.services.find(s => s.id === a.serviceId)?.name}</div></div>
              <div className="flex items-center gap-1.5 text-sm text-gold"><span>{a.date === t ? a.time : `${fmtDate(a.date).slice(0, 5)} ${a.time}`}</span><Icon n="clock" c="h-4 w-4" /></div>
            </div>
          )) : <Empty text="Nenhum agendamento futuro." />}
          <button className="btn mt-4 w-full border-gold/40 text-gold" onClick={() => go('Agenda')}>Ver agenda completa</button>
        </div>
        <div className="card">
          <h3 className="mb-3 text-sm font-medium text-zinc-200">Serviços mais vendidos · mês</h3>
          {top.length ? <BarChart items={top} /> : <Empty text="Sem vendas neste mês." />}
        </div>
        <div className="card">
          <h3 className="mb-3 text-sm font-medium text-zinc-200">Ranking de barbeiros · mês</h3>
          {rank.length ? rank.map((r, i) => <div key={r.b.id} className="flex justify-between border-b border-ink-700 py-2 text-sm last:border-0"><span>{i + 1}. {r.b.name}</span><span className="text-zinc-300">{brl(r.revenue)}</span></div>) : <Empty text="Cadastre barbeiros para ver o ranking." action={<button className="btn" onClick={() => go('Barbeiros')}>Cadastrar barbeiro</button>} />}
        </div>
      </div>
      <div className="card">
        <h3 className="mb-4 text-sm font-medium text-zinc-200">Resumo financeiro · mês atual</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {row('Faturamento bruto', cur.revenue)}
          {row('Estornos', refunds, 'Já fora do bruto')}
          {row('Comissões', cur.commissions)}
          {row('Despesas', cur.spent)}
          {row('Resultado líquido', cur.net, 'Bruto − comissões − despesas')}
          {row('A receber (agendados)', pending, 'Valor previsto')}
        </div>
        <p className="mt-4 text-xs text-zinc-500">Hoje: {brl(day.revenue)} em {day.count} atendimentos.</p>
      </div>
    </div>
  )
}
