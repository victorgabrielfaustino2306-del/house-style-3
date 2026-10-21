import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase, supabaseReady, setRememberMe } from './supabase'
import { BarberLicense, UserProfile } from './auth'

interface AuthContextValue {
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  profileError: string
  license: BarberLicense | null
  licenseLoading: boolean
  licenseError: string
  validateLicense: () => Promise<BarberLicense | null>
  activateLicense: (code: string) => Promise<string | null>
  signIn: (email: string, password: string, remember: boolean) => Promise<string | null>
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  signOut: () => Promise<string | null>
  updateName: (fullName: string) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function authMessage(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (normalized.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (normalized.includes('user already registered')) return 'Este e-mail já possui cadastro. Tente entrar.'
  if (normalized.includes('password should be at least')) return 'A senha não atende ao tamanho mínimo configurado no Supabase.'
  if (normalized.includes('fetch') || normalized.includes('network')) return 'Não foi possível conectar ao Supabase. Verifique sua internet e tente novamente.'
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState('')
  const [loading, setLoading] = useState(true)
  const [license, setLicense] = useState<BarberLicense | null>(null)
  const [licenseLoading, setLicenseLoading] = useState(false)
  const [licenseError, setLicenseError] = useState('')
  const activeUser = useRef<string | null>(null)
  const licenseCheckId = useRef(0)

  useEffect(() => {
    try {
      localStorage.removeItem('house-style-account')
      localStorage.removeItem('house-style-session')
    } catch {
      setProfileError('O navegador não permite limpar o acesso de demonstração antigo. Ative o armazenamento do navegador e atualize a página.')
    }
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true
    const loadProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase.from('profiles')
          .select('user_id, full_name, role, barber_id')
          .eq('user_id', userId)
          .maybeSingle()
        if (!mounted || activeUser.current !== userId) return
        if (error) {
          setProfile(null)
          setProfileError(`Não foi possível carregar seu perfil: ${authMessage(error.message)}`)
        } else if (!data) {
          setProfile(null)
          setProfileError('Seu perfil ainda não foi configurado. Aplique a migration do Supabase e entre novamente.')
        } else if (!['admin', 'barber', 'customer'].includes(data.role)) {
          setProfile(null)
          setProfileError('O perfil da sua conta está inválido. Peça ao administrador para verificar o Supabase.')
        } else {
          setProfile(data as UserProfile)
          setProfileError('')
        }
      } catch (error) {
        if (!mounted || activeUser.current !== userId) return
        setProfile(null)
        setProfileError(error instanceof Error
          ? `Não foi possível carregar seu perfil: ${authMessage(error.message)}`
          : 'Não foi possível carregar seu perfil devido a um erro de conexão.')
      }
      setLoading(false)
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null
      if (activeUser.current !== nextUserId) {
        licenseCheckId.current += 1
        setLicense(null)
        setLicenseError('')
        setLicenseLoading(false)
      }
      activeUser.current = nextUserId
      setSession(nextSession)
      if (nextSession) {
        setLoading(true)
        window.setTimeout(() => { void loadProfile(nextSession.user.id) }, 0)
      } else {
        licenseCheckId.current += 1
        setProfile(null)
        setProfileError('')
        setLicense(null)
        setLicenseError('')
        setLoading(false)
      }
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setProfileError(`Não foi possível restaurar a sessão: ${authMessage(error.message)}`)
      activeUser.current = data.session?.user.id ?? null
      setSession(data.session)
      if (data.session) void loadProfile(data.session.user.id)
      else setLoading(false)
    }).catch((error: unknown) => {
      if (mounted) {
        setProfileError(error instanceof Error ? authMessage(error.message) : 'Não foi possível restaurar a sessão.')
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const validateLicense = async () => {
    if (!supabase || !session) {
      setLicense(null)
      return null
    }
    const checkId = ++licenseCheckId.current
    setLicenseLoading(true)
    setLicenseError('')
    try {
      const { data, error } = await supabase.rpc('my_barber_license_status')
      if (error) throw error
      if (!data || typeof data !== 'object' || !('status' in data)) throw new Error('Resposta inválida da validação de licença.')
      const checked = data as BarberLicense
      if (!['missing', 'pending', 'active', 'expired', 'blocked', 'cancelled', 'permanent', 'not_barber'].includes(checked.status)) {
        throw new Error('O Supabase retornou um estado de licença desconhecido.')
      }
      if (checkId !== licenseCheckId.current) return null
      setLicense(checked)
      return checked
    } catch (error) {
      if (checkId !== licenseCheckId.current) return null
      setLicense(null)
      setLicenseError(error instanceof Error
        ? `Não foi possível validar sua licença: ${authMessage(error.message)}`
        : 'Não foi possível validar sua licença. Verifique a conexão e as migrations do Supabase.')
      return null
    } finally {
      if (checkId === licenseCheckId.current) setLicenseLoading(false)
    }
  }

  const activateLicense = async (code: string) => {
    if (!supabase || !session) return 'Entre na sua conta antes de ativar uma licença.'
    try {
      const { data, error } = await supabase.rpc('activate_my_barber_license', { p_code: code.trim() })
      if (error) return authMessage(error.message)
      if (!data || typeof data !== 'object' || !('status' in data)) return 'A resposta de ativação do Supabase não é válida.'
      const result = data as { ok: boolean; status: BarberLicense['status'] | 'invalid' | 'wrong_account' }
      if (result.ok) {
        const current = await validateLicense()
        return current?.status === 'active' ? null : 'O código foi aceito, mas a licença não pôde ser revalidada. Verifique sua conexão e tente novamente.'
      }
      if (result.status === 'invalid') return 'Código inválido. Confira o código enviado pela administração.'
      if (result.status === 'wrong_account') return 'Este código foi gerado para outra conta de barbeiro.'
      if (result.status === 'expired') return 'Sua licença expirou! Entre em contato com a administração para renovar o seu acesso.'
      if (result.status === 'blocked') return 'Esta licença está bloqueada. Entre em contato com a administração.'
      if (result.status === 'cancelled') return 'Esta licença foi cancelada. Entre em contato com a administração.'
      return 'Não foi possível ativar este código.'
    } catch (error) {
      return error instanceof Error ? authMessage(error.message) : 'Não foi possível ativar o código. Verifique a conexão.'
    }
  }

  useEffect(() => {
    if (!session || profile?.role !== 'barber') {
      setLicense(null)
      setLicenseLoading(false)
      setLicenseError('')
      return
    }

    void validateLicense()
    const interval = window.setInterval(() => { void validateLicense() }, 30_000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void validateLicense()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [session?.user.id, profile?.role])

  const value: AuthContextValue = {
    session, profile, loading, profileError, license, licenseLoading, licenseError,
    validateLicense, activateLicense,
    signIn: async (email, password, remember) => {
      if (!supabase) return 'O Supabase não está configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
      try {
        setRememberMe(remember)
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        return error ? authMessage(error.message) : null
      } catch (error) {
        return error instanceof Error ? authMessage(error.message) : 'Não foi possível entrar. Tente novamente.'
      }
    },
    signUp: async (email, password, fullName) => {
      if (!supabase) return 'O Supabase não está configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } }
        })
        if (error) return authMessage(error.message)
        if (!data.session) return 'Cadastro iniciado. Verifique seu e-mail para confirmar a conta antes de entrar.'
        return null
      } catch (error) {
        return error instanceof Error ? authMessage(error.message) : 'Não foi possível criar a conta. Tente novamente.'
      }
    },
    resetPassword: async email => {
      if (!supabase) return 'O Supabase não está configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
        return error ? authMessage(error.message) : null
      } catch (error) {
        return error instanceof Error ? authMessage(error.message) : 'Não foi possível enviar o e-mail de recuperação.'
      }
    },
    signOut: async () => {
      if (!supabase) return null
      try {
        const { error } = await supabase.auth.signOut()
        return error ? authMessage(error.message) : null
      } catch (error) {
        return error instanceof Error ? authMessage(error.message) : 'Não foi possível encerrar a sessão.'
      }
    },
    updateName: async fullName => {
      if (!supabase || !session) return 'Sua sessão expirou. Entre novamente.'
      try {
        const { data, error } = await supabase.from('profiles')
          .update({ full_name: fullName.trim() })
          .eq('user_id', session.user.id)
          .select('user_id, full_name, role, barber_id')
          .single()
        if (error) return authMessage(error.message)
        setProfile(data as UserProfile)
        return null
      } catch (error) {
        return error instanceof Error ? authMessage(error.message) : 'Não foi possível salvar seu nome.'
      }
    }
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser utilizado dentro de AuthProvider.')
  return value
}

export { supabaseReady }
