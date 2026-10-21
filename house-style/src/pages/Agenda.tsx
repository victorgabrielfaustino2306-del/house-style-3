import { useState } from 'react'
import { useStore, uid } from '../lib/store'
import { Empty, Field } from '../components/ui'
import { brl, completeAppt, fmtDate, hasConflict, today } from '../lib/finance'
import { Appt, ApptStatus, PAYMENTS, Payment } from '../types'

const STATUS: ApptStatus[] = ['Confirmado', 'Em andamento', 'Concluído', 'Cancelado', 'Não compareceu']
const tone: Record<ApptStatus, string> = { Confirmado: 'text-gold', 'Em andamento': 'text-sky-300', Concluído: 'text-emerald-400', Cancelado: 'text-zinc-500', 'Não compareceu': 'text-red-400' }

export default function Agenda({ restricted = false, barberId, authorize }: { restricted?: boolean; barberId?: string; authorize?: () => Promise<boolean> }) {
  const { db, update, toast } = useStore()
  const services = db.services.filter(s => s.active), barbers = db.barbers.filter(b => b.active && (!restricted || b.id === barberId))
  const blank = { client: '', phone: '', serviceId: services[0]?.id ?? '', barberId: restricted ? barberId ?? '' : barbers[0]?.id ?? '', date: today(), time: '09:00', price: services[0]?.price ?? 0, notes: '' }
  const [f, setF] = useState(blank)
  const [err, setErr] = useState('')
  const [fb, setFb] = useState(''), [fs, setFs] = useState(''), [fd, setFd] = useState('')
  const [pay, setPay] = useState<Payment>('Pix')
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))

  const create = async () => {
    if (authorize && !await authorize()) return
    if (restricted && !barberId) return setErr('Seu acesso ainda não está vinculado a um barbeiro.')
    if (!f.client.trim() || !f.serviceId || !f.barberId || !f.date || !f.time) return setErr('Informe cliente, serviço, barbeiro, data e horário.')
    if (hasConflict(db.appts, db.services, f)) return setErr('Esse barbeiro já tem um horário que se sobrepõe a este.')
    update(d => ({ ...d, appts: [...d.appts, { id: uid(), ...f, price: Number(f.price), status: 'Confirmado', notes: f.notes } as Appt] }))
    setErr(''); setF({ ...blank, date: f.date }); toast('Agendamento criado.')
  }
  const setStatus = async (id: string, status: ApptStatus) => {
    if (authorize && !await authorize()) return
    update(d => ({ ...d, appts: d.appts.map(a => (a.id === id ? { ...a, status } : a)) }))
  }
  const finish = async (id: string) => {
    if (authorize && !await authorize()) return
    update(d => completeAppt(d, id, pay))
    toast('Atendimento concluído.')
  }
  const rows = db.appts.filter(a => (!restricted || a.barberId === barberId) && (!fb || a.barberId === fb) && (!fs || a.status === fs) && (!fd || a.date === fd)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-3 text-sm font-medium text-zinc-300">Novo agendamento</h3>
        {restricted && !barberId && <p role="alert" className="mb-3 text-sm text-amber-300">Seu perfil ainda não está vinculado a um barbeiro. A agenda permanece bloqueada até que o administrador configure esse vínculo.</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Cliente"><input className="input" value={f.client} onChange={e => set('client', e.target.value)} /></Field>
          <Field label="Telefone"><input className="input" value={f.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Serviço"><select className="input" value={f.serviceId} onChange={e => { set('serviceId', e.target.value); set('price', db.services.find(s => s.id === e.target.value)?.price ?? 0) }}>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          {!restricted && <Field label="Barbeiro"><select className="input" value={f.barberId} onChange={e => set('barberId', e.target.value)}>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>}
          <Field label="Data"><input type="date" className="input" value={f.date} onChange={e => set('date', e.target.value)} /></Field>
          <Field label="Horário"><input type="time" className="input" value={f.time} onChange={e => set('time', e.target.value)} /></Field>
          <Field label="Valor previsto (R$)"><input type="number" min="0" step="0.01" className="input" value={f.price} onChange={e => set('price', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Observações"><input className="input" value={f.notes} onChange={e => set('notes', e.target.value)} /></Field></div>
        </div>
        {!restricted && !barbers.length && <p className="mt-3 text-sm text-zinc-500">Cadastre um barbeiro na aba Barbeiros para agendar.</p>}
        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
        <button className="btn btn-gold mt-4" onClick={create} disabled={restricted && !barberId}>Salvar agendamento</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" className="input w-auto" value={fd} onChange={e => setFd(e.target.value)} />
        {!restricted && <select className="input w-auto" value={fb} onChange={e => setFb(e.target.value)}><option value="">Todos os barbeiros</option>{db.barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
        <select className="input w-auto" value={fs} onChange={e => setFs(e.target.value)}><option value="">Todos os status</option>{STATUS.map(s => <option key={s}>{s}</option>)}</select>
        <select className="input w-auto" value={pay} onChange={e => setPay(e.target.value as Payment)} title="Forma de pagamento ao concluir">{PAYMENTS.map(p => <option key={p}>{p}</option>)}</select>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="card"><Empty text="Nenhum agendamento encontrado." /></div>}
        {rows.map(a => (
          <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 py-3">
            <div><div className="text-sm text-zinc-100">{a.client} · {db.services.find(s => s.id === a.serviceId)?.name}</div><div className="text-xs text-zinc-500">{fmtDate(a.date)} {a.time} · {db.barbers.find(b => b.id === a.barberId)?.name} · {brl(a.price)}</div></div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={'text-xs ' + tone[a.status]}>{a.status}</span>
              {(a.status === 'Confirmado' || a.status === 'Em andamento') && <>
                {a.status === 'Confirmado' && <button className="btn" onClick={() => void setStatus(a.id, 'Em andamento')}>Iniciar</button>}
                <button className="btn btn-gold" onClick={() => void finish(a.id)}>Concluir</button>
                <button className="btn" onClick={() => void setStatus(a.id, 'Cancelado')}>Cancelar</button>
                <button className="btn" onClick={() => void setStatus(a.id, 'Não compareceu')}>Faltou</button></>}
              <button className="btn" onClick={async () => { if (confirm('Excluir este agendamento?') && (!authorize || await authorize())) update(d => ({ ...d, appts: d.appts.filter(x => x.id !== a.id) })) }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
