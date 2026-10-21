export type Payment = 'Dinheiro' | 'Pix' | 'Débito' | 'Crédito'
export const PAYMENTS: Payment[] = ['Dinheiro', 'Pix', 'Débito', 'Crédito']
export interface Service { id: string; name: string; price: number; duration: number; active: boolean }
export interface Barber { id: string; name: string; phone: string; commission: number; active: boolean }
export interface Sale {
  id: string; date: string; client: string; serviceId: string; serviceName: string
  barberId: string; amount: number; commissionPct: number; payment: Payment
  origin: 'rapido' | 'agenda'; status: 'ativo' | 'estornado'; notes: string
}
export type ApptStatus = 'Confirmado' | 'Em andamento' | 'Concluído' | 'Cancelado' | 'Não compareceu'
export interface Appt {
  id: string; client: string; phone: string; serviceId: string; barberId: string
  date: string; time: string; price: number; status: ApptStatus; notes: string
}
export interface Expense { id: string; desc: string; category: string; amount: number; date: string; payment: Payment }
export interface DB { shopName: string; services: Service[]; barbers: Barber[]; sales: Sale[]; appts: Appt[]; expenses: Expense[] }
export const CATEGORIES = ['Aluguel', 'Energia', 'Água', 'Produtos', 'Manutenção', 'Internet', 'Marketing', 'Impostos', 'Outras despesas']
