import { useState } from 'react'
import { useStore, uid } from '../lib/store'
import { Empty, Field, PeriodBar, Stat } from '../components/ui'
import { barberStats, brl, fmtDate, Period, rangeOf } from '../lib/finance'

export default function Barbeiros() {
  const { db, update, toast } = useStore()
  const [f, setF] = useState({ name: '', phone: '', commission: 50 })
  const [p, setP] = useState<Period>('mes'); const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [sel, setSel] = useState('')
  const [a, b] = rangeOf(p, from, to)
  const add = () => {
    if (!f.name.trim()) return toast('Informe o nome do barbeiro.', true)
    if (f.commission < 0 || f.commission > 100) return toast('A comissão deve estar entre 0 e 100%.', true)
    update(d => ({ ...d, barbers: [...d.barbers, { id: uid(), name: f.name.trim(), phone: f.phone, commission: Number(f.commission), active: true }] }))
    setF({ name: '', phone: '', commission: 50 }); toast('Barbeiro cadastrado.')
  }
  const cur = db.barbers.find(x => x.id === sel) ?? db.barbers[0]
  const st = cur ? barberStats(db, cur.id, a, b) : null
  return (
    <div className="space-y-6">
      <div className="card"><h3 className="mb-3 text-sm font-medium text-zinc-300">Novo barbeiro</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Nome completo"><input className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Telefone"><input className="input" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Comissão (%)"><input type="number" className="input" value={f.commission} onChange={e => setF({ ...f, commission: Number(e.target.value) })} /></Field>
          <div className="flex items-end"><button className="btn btn-gold w-full" onClick={add}>Cadastrar</button></div>
        </div></div>
      {db.barbers.length === 0 ? <div className="card"><Empty text="Nenhum barbeiro cadastrado." /></div> : <>
        <div className="space-y-2">{db.barbers.map(x => (
          <div key={x.id} className={'card flex flex-wrap items-center justify-between gap-3 py-3 ' + (x.id === cur?.id ? 'border-gold' : '')}>
            <button className="text-left text-sm text-zinc-100" onClick={() => setSel(x.id)}>{x.name}<span className="ml-2 text-xs text-zinc-500">{x.active ? 'Ativo' : 'Inativo'}</span></button>
            <div className="flex items-center gap-2"><span className="text-xs text-zinc-500">Comissão</span>
              <input type="number" className="input w-20" value={x.commission} onChange={e => update(d => ({ ...d, barbers: d.barbers.map(y => (y.id === x.id ? { ...y, commission: Number(e.target.value) } : y)) }))} />
              <button className="btn" onClick={() => update(d => ({ ...d, barbers: d.barbers.map(y => (y.id === x.id ? { ...y, active: !y.active } : y)) }))}>{x.active ? 'Desativar' : 'Ativar'}</button></div>
          </div>))}</div>
        <PeriodBar p={p} setP={setP} from={from} to={to} setFrom={setFrom} setTo={setTo} />
        {cur && st && <div className="space-y-3"><h3 className="text-sm font-medium text-zinc-300">Painel de {cur.name}</h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Atendimentos concluídos" value={String(st.count)} hint={`${st.quick} rápidos`} />
            <Stat label="Faturamento bruto" value={brl(st.revenue)} />
            <Stat label="Comissão do barbeiro" value={brl(st.commission)} />
            <Stat label="Parte da barbearia" value={brl(st.shopShare)} hint="Bruto − comissão" />
            <Stat label="Ticket médio" value={brl(st.ticket)} /></div>
          <div className="card">{st.sales.length ? st.sales.slice(0, 20).map(s => <div key={s.id} className="flex justify-between border-b border-ink-700 py-2 text-sm last:border-0"><span>{fmtDate(s.date)} · {s.serviceName}</span><span>{brl(s.amount)}</span></div>) : <Empty text="Sem atendimentos neste período." />}</div></div>}
      </>}
    </div>
  )
}
