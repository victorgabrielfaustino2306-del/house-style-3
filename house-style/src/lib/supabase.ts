import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseReady = Boolean(url && key)
const rememberKey = 'house-style-remember-session'
const authStorageKey = url ? `sb-${new URL(url).hostname.split('.')[0]}-auth-token` : ''

const authStorage = {
  getItem: async (storageKey: string) => {
    const storage = localStorage.getItem(rememberKey) === 'true' ? localStorage : sessionStorage
    return storage.getItem(storageKey)
  },
  setItem: async (storageKey: string, value: string) => {
    const remember = localStorage.getItem(rememberKey) === 'true'
    const destination = remember ? localStorage : sessionStorage
    const other = remember ? sessionStorage : localStorage
    destination.setItem(storageKey, value)
    other.removeItem(storageKey)
  },
  removeItem: async (storageKey: string) => {
    localStorage.removeItem(storageKey)
    sessionStorage.removeItem(storageKey)
  }
}

export function setRememberMe(remember: boolean) {
  if (remember) localStorage.setItem(rememberKey, 'true')
  else {
    localStorage.removeItem(rememberKey)
    if (authStorageKey) localStorage.removeItem(authStorageKey)
  }
}

export const supabase = supabaseReady
  ? createClient(url!, key!, { auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null
