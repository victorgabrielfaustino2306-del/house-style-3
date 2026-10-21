export type UserRole = 'admin' | 'barber' | 'customer'

export interface UserProfile {
  user_id: string
  full_name: string
  role: UserRole
  barber_id: string | null
}

export type BarberLicenseStatus = 'missing' | 'pending' | 'active' | 'expired' | 'blocked' | 'cancelled' | 'permanent' | 'not_barber'

export interface BarberLicense {
  status: BarberLicenseStatus
  license_id?: string
  barber_name?: string
  activated_at?: string | null
  expires_at?: string | null
  days_remaining?: number | null
  last_renewed_at?: string | null
}

export function hasActiveBarberLicense(license: BarberLicense | null) {
  return license?.status === 'active'
}

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  barber: 'Barbeiro',
  customer: 'Cliente'
}

export const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: 'Dashboard',
  barber: 'Agenda',
  customer: 'Minha conta'
}

export function roleCanAccess(role: UserRole, page: string) {
  if (page === 'Minha conta') return true
  if (role === 'admin') {
    return ['Dashboard', 'Agenda', 'Atendimentos', 'Barbeiros', 'Financeiro', 'Serviços', 'Configurações', 'Gerenciar Barbeiros / Licenças'].includes(page)
  }
  if (role === 'barber') return ['Agenda', 'Atendimentos', 'Meus rendimentos'].includes(page)
  return false
}
