import { describe, expect, it } from 'vitest'
import { BarberLicense, hasActiveBarberLicense, HOME_BY_ROLE, roleCanAccess } from './auth'

describe('role access', () => {
  it('grants administrators the complete application and account access', () => {
    for (const page of ['Dashboard', 'Agenda', 'Atendimentos', 'Barbeiros', 'Financeiro', 'Serviços', 'Configurações', 'Gerenciar Barbeiros / Licenças', 'Minha conta']) {
      expect(roleCanAccess('admin', page)).toBe(true)
    }
  })

  describe('barber license gate', () => {
    it('only permits access after the server reports an active license', () => {
      const statuses: BarberLicense['status'][] = ['missing', 'pending', 'expired', 'blocked', 'cancelled', 'permanent', 'not_barber']
      expect(hasActiveBarberLicense({ status: 'active' })).toBe(true)
      expect(hasActiveBarberLicense(null)).toBe(false)
      for (const status of statuses) {
        expect(hasActiveBarberLicense({ status })).toBe(false)
      }
    })
  })

  it('limits barbers to their work areas and own account', () => {
    expect(roleCanAccess('barber', 'Agenda')).toBe(true)
    expect(roleCanAccess('barber', 'Atendimentos')).toBe(true)
    expect(roleCanAccess('barber', 'Meus rendimentos')).toBe(true)
    expect(roleCanAccess('barber', 'Minha conta')).toBe(true)
    for (const page of ['Dashboard', 'Barbeiros', 'Financeiro', 'Serviços', 'Configurações', 'Gerenciar Barbeiros / Licenças']) {
      expect(roleCanAccess('barber', page)).toBe(false)
    }
  })

  it('limits customers to their own account and chooses a safe home page', () => {
    expect(HOME_BY_ROLE.customer).toBe('Minha conta')
    expect(roleCanAccess('customer', 'Minha conta')).toBe(true)
    for (const page of ['Dashboard', 'Agenda', 'Atendimentos', 'Barbeiros', 'Financeiro', 'Serviços', 'Configurações']) {
      expect(roleCanAccess('customer', page)).toBe(false)
    }
  })
})
