import { Appt, DB, Payment, Sale, Service } from '../types'

export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const localISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()
export const today = () => localISO(new Date()).slice(0, 10)
export const nowLocal = () => localISO(new Date()).slice(0, 16)
export const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return localISO(d).slice(0, 10) }
export const fmtDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
export const inRange = (iso: string, from: string, to: string) => { const d = iso.slice(0, 10); return d >= from && d <= to }

export type Period = 'hoje' | 'semana' | 'mes' | 'custom'
export function rangeOf(p: Period, from = '', to = ''): [string, string] {
  const t = today()
  if (p === 'hoje') return [t, t]
  if (p === 'semana') { const dow = (new Date(t + 'T12:00:00').getDay() + 6) % 7; return [addDays(t, -dow), t] }
  if (p === 'mes') return [t.slice(0, 8) + '01', t]
  return [from || '0000-01-01', to || '9999-12-31']
}

export const commissionOf = (s: Sale) => (s.amount * s.commissionPct) / 100
export const okSales = (sales: Sale[]) => sales.filter(s => s.status === 'ativo')

export function summary(db: DB, from: string, to: string) {
  const sales = okSales(db.sales).filter(s => inRange(s.date, from, to))
  const expenses = db.expenses.filter(e => inRange(e.date, from, to))
  const revenue = sales.reduce((a, s) => a + s.amount, 0)
  const spent = expenses.reduce((a, e) => a + e.amount, 0)
  const commissions = sales.reduce((a, s) => a + commissionOf(s), 0)
  // Resultado da barbearia = receita bruta − comissões − despesas
  return { sales, expenses, revenue, spent, commissions, net: revenue - commissions - spent, count: sales.length, ticket: sales.length ? revenue / sales.length : 0 }
}

export function barberStats(db: DB, barberId: string, from: string, to: string) {
  const sales = okSales(db.sales).filter(s => s.barberId === barberId && inRange(s.date, from, to))
  const revenue = sales.reduce((a, s) => a + s.amount, 0)
  const commission = sales.reduce((a, s) => a + commissionOf(s), 0)
  return { sales, revenue, commission, shopShare: revenue - commission, count: sales.length, quick: sales.filter(s => s.origin === 'rapido').length, ticket: sales.length ? revenue / sales.length : 0 }
}

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export function hasConflict(appts: Appt[], services: Service[], cand: Pick<Appt, 'barberId' | 'date' | 'time' | 'serviceId'>, ignoreId?: string) {
  const dur = (id: string) => services.find(s => s.id === id)?.duration ?? 30
  const s1 = toMin(cand.time), e1 = s1 + dur(cand.serviceId)
  return appts.some(a => {
    if (a.id === ignoreId || a.barberId !== cand.barberId || a.date !== cand.date) return false
    if (a.status === 'Cancelado' || a.status === 'Não compareceu') return false
    const s2 = toMin(a.time), e2 = s2 + dur(a.serviceId)
    return s1 < e2 && s2 < e1
  })
}

// Cria a venda uma única vez por agendamento (id determinístico)
export function completeAppt(db: DB, id: string, payment: Payment): DB {
  const a = db.appts.find(x => x.id === id)
  if (!a || a.status === 'Concluído') return db
  const saleId = 'ag-' + id
  if (db.sales.some(s => s.id === saleId)) return db
  const svc = db.services.find(s => s.id === a.serviceId)
  const b = db.barbers.find(x => x.id === a.barberId)
  const sale: Sale = { id: saleId, date: a.date + 'T' + a.time, client: a.client, serviceId: a.serviceId, serviceName: svc?.name ?? 'Serviço', barberId: a.barberId, amount: a.price, commissionPct: b?.commission ?? 0, payment, origin: 'agenda', status: 'ativo', notes: a.notes }
  return { ...db, appts: db.appts.map(x => (x.id === id ? { ...x, status: 'Concluído' as const } : x)), sales: [sale, ...db.sales] }
}

export const addSale = (db: DB, sale: Sale): DB => (db.sales.some(s => s.id === sale.id) ? db : { ...db, sales: [sale, ...db.sales] })
export const refundSale = (db: DB, id: string): DB => ({ ...db, sales: db.sales.map(s => (s.id === id ? { ...s, status: 'estornado' as const } : s)) })

export function toCSV(rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  return '\ufeff' + rows.map(r => r.map(esc).join(';')).join('\n')
}
export function download(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click()
}
export const byPayment = (sales: Sale[]) => { const m: Record<Payment, number> = { Dinheiro: 0, Pix: 0, Débito: 0, Crédito: 0 }; sales.forEach(s => (m[s.payment] += s.amount)); return m }

export function monthRange(offset = 0): [string, string] {
  const d = new Date(today().slice(0, 7) + '-01T12:00:00'); d.setMonth(d.getMonth() + offset)
  const from = localISO(d).slice(0, 10)
  const e = new Date(d); e.setMonth(e.getMonth() + 1); e.setDate(0)
  return [from, localISO(e).slice(0, 10)]
}
// Mês anterior limitado ao mesmo número de dias já decorridos no mês atual
export function prevMonthSamePeriod(): [string, string] {
  const [from, end] = monthRange(-1)
  const elapsed = Number(today().slice(8, 10))
  const to = addDays(from, elapsed - 1)
  return [from, to > end ? end : to]
}
export const pctChange = (cur: number, prev: number): number | null => (prev > 0 ? ((cur - prev) / prev) * 100 : null)
export function topServices(sales: Sale[], n = 5) {
  const m = new Map<string, number>()
  sales.forEach(s => m.set(s.serviceName, (m.get(s.serviceName) || 0) + 1))
  return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, n)
}

export interface QuickInput { client: string; serviceId: string; barberId: string; amount: number; payment: Payment; date: string; notes: string }
// Valida e registra um atendimento rápido. O id vem de fora: repetir o mesmo id nunca duplica a receita.
export function createQuickSale(db: DB, i: QuickInput, id: string): { db?: DB; error?: string } {
  const svc = db.services.find(s => s.id === i.serviceId && s.active)
  const b = db.barbers.find(x => x.id === i.barberId && x.active)
  if (!svc) return { error: 'Escolha um serviço ativo.' }
  if (!b) return { error: 'Escolha um barbeiro ativo.' }
  const amount = Number(i.amount)
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Informe um valor maior que zero.' }
  if (!i.date) return { error: 'Informe a data e a hora.' }
  const sale: Sale = { id, date: i.date, client: i.client.trim(), serviceId: svc.id, serviceName: svc.name, barberId: b.id, amount, commissionPct: b.commission, payment: i.payment, origin: 'rapido', status: 'ativo', notes: i.notes.trim() }
  return { db: addSale(db, sale) }
}
