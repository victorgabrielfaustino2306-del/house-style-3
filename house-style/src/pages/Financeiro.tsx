import { useState } from 'react'
import { useStore, uid } from '../lib/store'
import { Empty, Field, PeriodBar, Stat } from '../components/ui'
import { brl, byPayment, download, fmtDate, Period, rangeOf, summary, toCSV, today } from '../lib/finance'
import { CATEGORIES, PAYMENTS, Payment } from '../types'

export default function Financeiro() {
  const { db, update, toast } = useStore()
  const [p, setP] = useState<Period>('mes'); const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [e, setE] = useState({ desc: '', category: CATEGORIES[0], amount: 0, date: today(), payment: 'Pix' as Payment })
  const [a, b] = rangeOf(p, from, to)
  const s = summary(db, a, b)
  const pay = byPayment(s.sales)
  const cats = CATEGORIES.map(c => [c, s.expenses.filter(x => x.category === c).reduce((t, x) => t + x.amount, 0)] as const).filter(x => x[1] > 0)
  const add = () => {
    if (!e.desc.trim() || !(e.amount > 0) || !e.date) return toast('Informe descrição, valor e data.', true)
    update(d => ({ ...d, expenses: [{ id: uid(), ...e, desc: e.desc.trim(), amount: Number(e.amount) }, ...d.expenses] }))
    setE({ ...e, desc: '', amount: 0 }); toast('Despesa registrada.')
  }
  const exportCsv = () => download(`financeiro-${a}-${b}.csv`, toCSV([['Tipo', 'Data', 'Descrição', 'Barbeiro', 'Pagamento', 'Valor'], ...s.sales.map(x => ['Receita', fmtDate(x.date), x.serviceName, db.barbers.find(y => y.id === x.barberId)?.name ?? '', x.payment, x.amount.toFixed(2).replace('.', ',')]), ...s.expenses.map(x => ['Despesa', fmtDate(x.date), `${x.category}: ${x.desc}`, '', x.payment, (-x.amount).toFixed(2).replace('.', ',')])]))
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><PeriodBar p={p} setP={setP} from={from} to={to} setFrom={setFrom} setTo={setTo} /><button className="btn" onClick={exportCsv}>Exportar CSV</button></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Receitas (bruto)" value={brl(s.revenue)} hint={`${s.count} pagamentos`} />
        <Stat label="Despesas" value={brl(s.spent)} />
        <Stat label="Comissões estimadas" value={brl(s.commissions)} />
        <Stat label="Resultado líquido" value={brl(s.net)} hint="Receita − comissões − despesas" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h3 className="mb-3 text-sm font-medium text-zinc-300">Por forma de pagamento</h3>{PAYMENTS.map(k => <div key={k} className="flex justify-between py-1 text-sm"><span className="text-zinc-400">{k}</span><span>{brl(pay[k])}</span></div>)}</div>
        <div className="card"><h3 className="mb-3 text-sm font-medium text-zinc-300">Despesas por categoria</h3>{cats.length ? cats.map(([c, v]) => <div key={c} className="flex justify-between py-1 text-sm"><span className="text-zinc-400">{c}</span><span>{brl(v)}</span></div>) : <Empty text="Sem despesas no período." />}</div>
      </div>
      <div className="card"><h3 className="mb-3 text-sm font-medium text-zinc-300">Nova despesa</h3>
        <div className="grid gap-3 sm:grid-cols-5">
          <Field label="Descrição"><input className="input" value={e.desc} onChange={x => setE({ ...e, desc: x.target.value })} /></Field>
          <Field label="Categoria"><select className="input" value={e.category} onChange={x => setE({ ...e, category: x.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Valor (R$)"><input type="number" min="0" step="0.01" className="input" value={e.amount} onChange={x => setE({ ...e, amount: Number(x.target.value) })} /></Field>
          <Field label="Data"><input type="date" className="input" value={e.date} onChange={x => setE({ ...e, date: x.target.value })} /></Field>
          <Field label="Pagamento"><select className="input" value={e.payment} onChange={x => setE({ ...e, payment: x.target.value as Payment })}>{PAYMENTS.map(c => <option key={c}>{c}</option>)}</select></Field>
        </div><button className="btn btn-gold mt-4" onClick={add}>Registrar despesa</button></div>
      <div className="space-y-2">{s.expenses.map(x => <div key={x.id} className="card flex items-center justify-between py-3 text-sm"><span>{x.desc} <span className="text-xs text-zinc-500">· {x.category} · {fmtDate(x.date)}</span></span><span className="flex items-center gap-3">{brl(x.amount)}<button className="btn" onClick={() => { if (confirm('Excluir esta despesa?')) update(d => ({ ...d, expenses: d.expenses.filter(y => y.id !== x.id) })) }}>Excluir</button></span></div>)}</div>
    </div>
  )
}
