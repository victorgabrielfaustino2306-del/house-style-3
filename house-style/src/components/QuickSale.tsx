import { useRef, useState } from 'react'
import { Field, Modal } from './ui'
import { useStore, uid } from '../lib/store'
import { brl, createQuickSale, nowLocal } from '../lib/finance'
import { PAYMENTS, Payment } from '../types'

export default function QuickSale({ onClose, restricted = false, barberId, authorize }: { onClose: () => void; restricted?: boolean; barberId?: string; authorize?: () => Promise<boolean> }) {
  const { db, update, toast } = useStore()
  const services = db.services.filter(s => s.active)
  const barbers = db.barbers.filter(b => b.active && (!restricted || b.id === barberId))
  const [f, setF] = useState({ client: '', serviceId: services[0]?.id ?? '', barberId: restricted ? barberId ?? '' : barbers[0]?.id ?? '', amount: services[0]?.price ?? 0, payment: 'Pix' as Payment, date: nowLocal(), notes: '' })
  const [err, setErr] = useState('')
  const saleId = useRef(uid())   // um id por atendimento: cliques repetidos não duplicam a receita
  const busy = useRef(false)
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))
  const pct = barbers.find(b => b.id === f.barberId)?.commission ?? 0

  if (!services.length || !barbers.length)
    return <Modal title="Novo atendimento rápido" onClose={onClose}><p className="text-sm text-zinc-400">{restricted && !barberId ? 'Seu perfil ainda não está vinculado a um barbeiro. Peça ao administrador para configurá-lo.' : 'Cadastre ao menos um serviço ativo e um barbeiro ativo para registrar atendimentos.'}</p></Modal>

  const save = async (again: boolean) => {
    if (busy.current) return
    busy.current = true
    if (authorize && !await authorize()) {
      busy.current = false
      return
    }
    const r = createQuickSale(db, f, saleId.current)
    if (r.error) {
      busy.current = false
      return setErr(r.error)
    }
    update(d => createQuickSale(d, f, saleId.current).db ?? d)
    toast(`Atendimento de ${brl(Number(f.amount))} registrado.`)
    if (!again) return onClose()
    saleId.current = uid(); busy.current = false; setErr('')
    setF(p => ({ ...p, client: '', notes: '', date: nowLocal() }))
  }
  return (
    <Modal title="Novo atendimento rápido" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Serviço"><select className="input" value={f.serviceId} onChange={e => { set('serviceId', e.target.value); set('amount', db.services.find(s => s.id === e.target.value)?.price ?? 0) }}>{services.map(s => <option key={s.id} value={s.id}>{s.name} · {brl(s.price)}</option>)}</select></Field>
        {!restricted && <Field label="Barbeiro"><select className="input" value={f.barberId} onChange={e => set('barberId', e.target.value)}>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>}
        <Field label="Valor cobrado (R$)"><input type="number" min="0" step="0.01" inputMode="decimal" className="input" value={f.amount} onChange={e => set('amount', e.target.value)} /></Field>
        <Field label="Pagamento"><div className="grid grid-cols-2 gap-1">{PAYMENTS.map(p => <button key={p} type="button" onClick={() => set('payment', p)} className={'btn px-2 py-2 ' + (f.payment === p ? 'border-gold text-gold' : '')}>{p}</button>)}</div></Field>
        <Field label="Cliente (opcional)"><input className="input" value={f.client} onChange={e => set('client', e.target.value)} /></Field>
        <Field label="Data e hora"><input type="datetime-local" className="input" value={f.date} onChange={e => set('date', e.target.value)} /></Field>
      </div>
      <div className="mt-3"><Field label="Observações (opcional)"><input className="input" value={f.notes} onChange={e => set('notes', e.target.value)} /></Field></div>
      <p className="mt-4 text-xs text-zinc-500">Comissão do barbeiro: {brl((Number(f.amount) || 0) * pct / 100)} ({pct}%) · Parte da barbearia: {brl((Number(f.amount) || 0) * (100 - pct) / 100)}</p>
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button className="btn btn-gold" onClick={() => save(false)}>Registrar</button>
        <button className="btn" onClick={() => save(true)}>Registrar e novo</button>
      </div>
    </Modal>
  )
}
