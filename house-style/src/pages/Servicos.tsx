import { useState } from 'react'
import { useStore, uid } from '../lib/store'
import { Field } from '../components/ui'
import { brl } from '../lib/finance'

export default function Servicos() {
  const { db, update, toast } = useStore()
  const [f, setF] = useState({ name: '', price: 0, duration: 30 })
  const add = () => {
    if (!f.name.trim() || !(f.price > 0) || !(f.duration > 0)) return toast('Informe nome, preço e duração.', true)
    update(d => ({ ...d, services: [...d.services, { id: uid(), name: f.name.trim(), price: Number(f.price), duration: Number(f.duration), active: true }] }))
    setF({ name: '', price: 0, duration: 30 }); toast('Serviço cadastrado.')
  }
  return (
    <div className="space-y-6">
      <div className="card"><div className="grid gap-3 sm:grid-cols-4">
        <Field label="Nome"><input className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Preço (R$)"><input type="number" min="0" step="0.01" className="input" value={f.price} onChange={e => setF({ ...f, price: Number(e.target.value) })} /></Field>
        <Field label="Duração (min)"><input type="number" min="5" className="input" value={f.duration} onChange={e => setF({ ...f, duration: Number(e.target.value) })} /></Field>
        <div className="flex items-end"><button className="btn btn-gold w-full" onClick={add}>Cadastrar</button></div></div></div>
      <p className="text-xs text-zinc-500">Alterar o preço aqui não muda atendimentos já registrados: cada um guarda o valor da época.</p>
      <div className="space-y-2">{db.services.map(s => (
        <div key={s.id} className="card flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{s.name} <span className="text-xs text-zinc-500">· {s.duration} min · {brl(s.price)}</span></span>
          <span className="flex items-center gap-2"><input type="number" className="input w-24" value={s.price} onChange={e => update(d => ({ ...d, services: d.services.map(x => (x.id === s.id ? { ...x, price: Number(e.target.value) } : x)) }))} />
            <button className="btn" onClick={() => update(d => ({ ...d, services: d.services.map(x => (x.id === s.id ? { ...x, active: !x.active } : x)) }))}>{s.active ? 'Desativar' : 'Ativar'}</button></span></div>))}</div>
    </div>
  )
}
