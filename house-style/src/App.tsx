import { useState } from 'react'
import { useStore } from './lib/store'
import QuickSale from './components/QuickSale'
import Dashboard from './pages/Dashboard'
import Atendimentos from './pages/Atendimentos'
import Agenda from './pages/Agenda'
import Barbeiros from './pages/Barbeiros'
import Financeiro from './pages/Financeiro'
import Servicos from './pages/Servicos'
import Config from './pages/Config'

const NAV = ['Dashboard', 'Agenda', 'Atendimentos', 'Barbeiros', 'Financeiro', 'Serviços']

export default function App() {
  const { db, msg } = useStore()
  const [page, setPage] = useState('Dashboard')
  const [quick, setQuick] = useState(false)
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-700 bg-ink-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <div className="font-serif text-2xl font-semibold tracking-wide text-gold">{db.shopName}</div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 md:block">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
            <button className="btn btn-gold hidden sm:inline-flex" onClick={() => setQuick(true)}>Atendimento rápido</button>
            <button className={'btn ' + (page === 'Configurações' ? 'border-gold text-gold' : '')} onClick={() => setPage('Configurações')}>Configurações</button>
          </div>
        </div>
        <nav className="border-t border-ink-700">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-8">
            {NAV.map(n => <button key={n} onClick={() => setPage(n)} className={'whitespace-nowrap border-b-2 px-4 py-3 text-sm transition ' + (page === n ? 'border-gold text-gold' : 'border-transparent text-zinc-400 hover:text-zinc-100')}>{n}</button>)}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4 pb-24 sm:p-8">
        <h1 className="mb-6 text-xl font-semibold text-zinc-50">{page}</h1>
        {page === 'Dashboard' && <Dashboard onQuick={() => setQuick(true)} go={setPage} />}
        {page === 'Atendimentos' && <Atendimentos onQuick={() => setQuick(true)} />}
        {page === 'Agenda' && <Agenda />}
        {page === 'Barbeiros' && <Barbeiros />}
        {page === 'Financeiro' && <Financeiro />}
        {page === 'Serviços' && <Servicos />}
        {page === 'Configurações' && <Config />}
      </main>
      <button className="btn btn-gold fixed bottom-5 right-5 z-30 rounded-full px-5 py-3 shadow-lg sm:hidden" onClick={() => setQuick(true)}>Atendimento rápido</button>
      {quick && <QuickSale onClose={() => setQuick(false)} />}
      {msg && <div className={'pop fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg border bg-ink-900 px-4 py-2 text-sm ' + (msg.error ? 'border-red-500 text-red-300' : 'border-gold text-gold-soft')}>{msg.text}</div>}
    </div>
  )
}
