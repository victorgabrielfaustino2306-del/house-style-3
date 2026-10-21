import { useEffect, useState } from 'react'
import { useStore } from './lib/store'
import { useAuth, supabaseReady } from './lib/auth-context'
import { hasActiveBarberLicense, HOME_BY_ROLE, ROLE_LABEL, roleCanAccess } from './lib/auth'
import QuickSale from './components/QuickSale'
import Dashboard from './pages/Dashboard'
import Atendimentos from './pages/Atendimentos'
import Agenda from './pages/Agenda'
import Barbeiros from './pages/Barbeiros'
import Financeiro from './pages/Financeiro'
import Servicos from './pages/Servicos'
import Config from './pages/Config'
import Login from './pages/Login'
import MinhaConta from './pages/MinhaConta'
import LicencaAcesso from './pages/LicencaAcesso'
import GerenciarLicencas from './pages/GerenciarLicencas'
import MeusRendimentos from './pages/MeusRendimentos'

const ADMIN_NAV = ['Dashboard', 'Agenda', 'Atendimentos', 'Barbeiros', 'Financeiro', 'Serviços', 'Gerenciar Barbeiros / Licenças']

export default function App() {
  const { db, msg, toast } = useStore()
  const { session, profile, loading, profileError, signOut, license, validateLicense } = useAuth()
  const [requestedPage, setRequestedPage] = useState('Dashboard')
  const [quick, setQuick] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const role = profile?.role
  const home = role ? HOME_BY_ROLE[role] : 'Dashboard'
  const page = role && roleCanAccess(role, requestedPage) ? requestedPage : home
  const nav = role === 'admin' ? [...ADMIN_NAV, 'Minha conta'] : role === 'barber' ? ['Agenda', 'Atendimentos', 'Meus rendimentos', 'Minha conta'] : ['Minha conta']
  const barberMode = role === 'barber'
  const assignedBarber = profile?.barber_id ?? undefined

  useEffect(() => {
    if (role && requestedPage !== page) setRequestedPage(home)
  }, [role, requestedPage, page, home])

  const navigate = async (nextPage: string) => {
    if (!role || !roleCanAccess(role, nextPage)) {
      toast('Você não tem permissão para acessar essa área.', true)
      return
    }
    if (!await authorizeBarberAction()) return
    setRequestedPage(nextPage)
  }

  const authorizeBarberAction = async () => {
    if (!barberMode) return true
    const result = await validateLicense()
    if (result?.status === 'active') return true
    if (result?.status === 'expired') toast('Sua licença expirou! Entre em contato com a administração para renovar o seu acesso.', true)
    else if (result?.status === 'blocked') toast('Licença bloqueada. Entre em contato com a administração.', true)
    else if (result?.status === 'cancelled') toast('Licença cancelada. Entre em contato com a administração.', true)
    else if (result?.status === 'missing' || result?.status === 'pending') toast('Ative uma licença válida antes de continuar.', true)
    else toast('Não foi possível validar a licença. Tente novamente antes de continuar.', true)
    return false
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-zinc-400"><span className="auth-spinner mr-3" />Verificando sua sessão...</div>
  if (!session) return <Login />
  if (!supabaseReady) return <Login />
  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <section className="card w-full max-w-lg space-y-4">
          <div className="font-serif text-2xl text-gold">House Style</div>
          <h1 className="text-lg text-zinc-100">Não foi possível validar seu perfil</h1>
          <p role="alert" className="text-sm leading-6 text-red-300">{profileError || 'Sua conta não possui um perfil de acesso autorizado.'}</p>
          <p className="text-sm leading-6 text-zinc-400">Por segurança, nenhuma área da barbearia foi aberta. Verifique a migration e as permissões da tabela <code>profiles</code>.</p>
          <button className="btn" disabled={signingOut} onClick={async () => {
            setSigningOut(true)
            const error = await signOut()
            setSigningOut(false)
            if (error) toast(error, true)
          }}>{signingOut ? 'Saindo...' : 'Sair da conta'}</button>
        </section>
      </main>
    )
  }

  if (barberMode && !hasActiveBarberLicense(license)) {
    return <LicencaAcesso />
  }

  const openQuickSale = async () => {
    if (barberMode && !assignedBarber) {
      toast('Seu acesso ainda não está vinculado a um barbeiro. Peça ao administrador para configurá-lo.', true)
      return
    }
    if (!await authorizeBarberAction()) return
    setQuick(true)
  }

  const logout = async () => {
    setSigningOut(true)
    const error = await signOut()
    setSigningOut(false)
    if (error) toast(error, true)
  }

  const initials = (profile.full_name || session.user.email || 'HS').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('')

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-700 bg-ink-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <div className="font-serif text-2xl font-semibold tracking-wide text-gold">{db.shopName}</div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 lg:block">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
            {(role === 'admin' || barberMode) && <button className="btn btn-gold hidden sm:inline-flex" onClick={() => void openQuickSale()}>Atendimento rápido</button>}
            {role === 'admin' && <button className={'btn ' + (page === 'Configurações' ? 'border-gold text-gold' : '')} onClick={() => void navigate('Configurações')}>Configurações</button>}
            <div className="flex items-center gap-2 border-l border-ink-700 pl-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-xs font-semibold text-gold" aria-hidden="true">{initials}</div>
              <div className="hidden min-w-0 sm:block">
                <div className="max-w-36 truncate text-sm text-zinc-100">{profile.full_name || session.user.email}</div>
                <div className="text-xs text-zinc-500">{ROLE_LABEL[role]}</div>
              </div>
              <button className="btn px-3" onClick={() => void navigate('Minha conta')}>Minha conta</button>
              <button className="btn px-3" onClick={logout} disabled={signingOut}>{signingOut ? 'Saindo...' : 'Sair'}</button>
            </div>
          </div>
        </div>
        <nav aria-label="Navegação principal" className="border-t border-ink-700">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-8">
            {nav.map(item => <button key={item} aria-current={page === item ? 'page' : undefined} onClick={() => void navigate(item)} className={'whitespace-nowrap border-b-2 px-4 py-3 text-sm transition ' + (page === item ? 'border-gold text-gold' : 'border-transparent text-zinc-400 hover:text-zinc-100')}>{item}</button>)}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4 pb-24 sm:p-8">
        <h1 className="mb-6 text-xl font-semibold text-zinc-50">{page}</h1>
        {page === 'Dashboard' && <Dashboard onQuick={() => void openQuickSale()} go={pageName => { void navigate(pageName) }} />}
        {page === 'Atendimentos' && <Atendimentos onQuick={() => void openQuickSale()} restricted={barberMode} barberId={assignedBarber} authorize={authorizeBarberAction} />}
        {page === 'Agenda' && <Agenda restricted={barberMode} barberId={assignedBarber} authorize={authorizeBarberAction} />}
        {page === 'Meus rendimentos' && barberMode && <MeusRendimentos barberId={assignedBarber} />}
        {page === 'Barbeiros' && role === 'admin' && <Barbeiros />}
        {page === 'Financeiro' && role === 'admin' && <Financeiro />}
        {page === 'Serviços' && role === 'admin' && <Servicos />}
        {page === 'Configurações' && role === 'admin' && <Config />}
        {page === 'Gerenciar Barbeiros / Licenças' && role === 'admin' && <GerenciarLicencas />}
        {page === 'Minha conta' && <MinhaConta />}
      </main>
      {(role === 'admin' || barberMode) && <button className="btn btn-gold fixed bottom-5 right-5 z-30 rounded-full px-5 py-3 shadow-lg sm:hidden" onClick={() => void openQuickSale()}>Atendimento rápido</button>}
      {quick && <QuickSale onClose={() => setQuick(false)} restricted={barberMode} barberId={assignedBarber} authorize={authorizeBarberAction} />}
      {msg && <div role="status" className={'pop fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg border bg-ink-900 px-4 py-2 text-sm ' + (msg.error ? 'border-red-500 text-red-300' : 'border-gold text-gold-soft')}>{msg.text}</div>}
    </div>
  )
}
