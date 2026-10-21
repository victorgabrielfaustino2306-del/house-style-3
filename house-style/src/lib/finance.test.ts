import { describe, expect, it } from 'vitest'
import { addSale, completeAppt, hasConflict, refundSale, summary } from './finance'
import { DB, Sale } from '../types'

const base = (): DB => ({ shopName: 'T', services: [{ id: 's', name: 'Corte', price: 100, duration: 30, active: true }], barbers: [{ id: 'b', name: 'A', phone: '', commission: 40, active: true }], sales: [], expenses: [{ id: 'e', desc: 'x', category: 'Água', amount: 10, date: '2026-01-10', payment: 'Pix' }], appts: [{ id: 'a1', client: 'C', phone: '', serviceId: 's', barberId: 'b', date: '2026-01-10', time: '10:00', price: 100, status: 'Confirmado', notes: '' }] })
const sale: Sale = { id: 'q1', date: '2026-01-10T09:00', client: '', serviceId: 's', serviceName: 'Corte', barberId: 'b', amount: 100, commissionPct: 40, payment: 'Pix', origin: 'rapido', status: 'ativo', notes: '' }

describe('financeiro', () => {
  it('agendamento só vira receita ao concluir, e uma única vez', () => {
    let db = base()
    expect(summary(db, '2026-01-01', '2026-01-31').revenue).toBe(0)
    db = completeAppt(db, 'a1', 'Pix'); db = completeAppt(db, 'a1', 'Pix')
    expect(db.sales.length).toBe(1)
    expect(summary(db, '2026-01-01', '2026-01-31').revenue).toBe(100)
  })
  it('não duplica atendimento rápido', () => {
    expect(addSale(addSale(base(), sale), sale).sales.length).toBe(1)
  })
  it('calcula comissão e resultado líquido', () => {
    const s = summary(addSale(base(), sale), '2026-01-01', '2026-01-31')
    expect(s.commissions).toBe(40); expect(s.net).toBe(100 - 40 - 10)
  })
  it('estorno corrige indicadores', () => {
    const s = summary(refundSale(addSale(base(), sale), 'q1'), '2026-01-01', '2026-01-31')
    expect(s.revenue).toBe(0); expect(s.commissions).toBe(0)
  })
  it('detecta conflito de horário', () => {
    const db = base()
    expect(hasConflict(db.appts, db.services, { barberId: 'b', date: '2026-01-10', time: '10:15', serviceId: 's' })).toBe(true)
    expect(hasConflict(db.appts, db.services, { barberId: 'b', date: '2026-01-10', time: '10:30', serviceId: 's' })).toBe(false)
  })
})

import { createQuickSale, pctChange, topServices } from './finance'
describe('atendimento rápido', () => {
  const input = { client: ' ', serviceId: 's', barberId: 'b', amount: 100, payment: 'Pix' as const, date: '2026-01-10T09:00', notes: '' }
  it('registra uma única vez mesmo com cliques repetidos (mesmo id)', () => {
    let db = base()
    for (let k = 0; k < 3; k++) db = createQuickSale(db, input, 'x1').db ?? db
    expect(db.sales.length).toBe(1)
    expect(db.sales[0].commissionPct).toBe(40)
  })
  it('rejeita valor inválido e barbeiro inativo', () => {
    expect(createQuickSale(base(), { ...input, amount: 0 }, 'x').error).toBeTruthy()
    const db = base(); db.barbers[0].active = false
    expect(createQuickSale(db, input, 'x').error).toBeTruthy()
  })
  it('preço antigo é preservado ao mudar o serviço', () => {
    let db = createQuickSale(base(), input, 'x1').db!
    db = { ...db, services: db.services.map(s => ({ ...s, price: 999 })) }
    expect(db.sales[0].amount).toBe(100)
  })
  it('variação percentual e ranking de serviços', () => {
    expect(pctChange(120, 100)).toBe(20); expect(pctChange(5, 0)).toBeNull()
    expect(topServices([{ serviceName: 'A' }, { serviceName: 'B' }, { serviceName: 'A' }] as any)[0]).toEqual({ name: 'A', count: 2 })
  })
})
