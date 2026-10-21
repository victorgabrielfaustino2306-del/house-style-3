import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { DB } from '../types'

const KEY = 'house-style-db-v1'
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2))
const initial: DB = {
  shopName: 'House Style',
  services: [
    { id: 's1', name: 'Corte de cabelo', price: 40, duration: 30, active: true },
    { id: 's2', name: 'Barba', price: 30, duration: 30, active: true },
    { id: 's3', name: 'Cabelo e barba', price: 65, duration: 60, active: true }
  ],
  barbers: [], sales: [], appts: [], expenses: []
}
function load(): DB {
  try { const raw = localStorage.getItem(KEY); return raw ? { ...initial, ...JSON.parse(raw) } : initial } catch { return initial }
}
interface Ctx { db: DB; update: (fn: (d: DB) => DB) => void; replace: (d: DB) => void; toast: (m: string, error?: boolean) => void; msg: { text: string; error: boolean } | null }
const C = createContext<Ctx>(null as any)
export const useStore = () => useContext(C)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load)
  const [msg, setMsg] = useState<Ctx['msg']>(null)
  const toast = (text: string, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg(null), 2800) }
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { toast('Não foi possível salvar os dados no navegador.', true) }
  }, [db])
  return <C.Provider value={{ db, update: fn => setDb(d => fn(d)), replace: setDb, toast, msg }}>{children}</C.Provider>
}
