import { FormEvent, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { ROLE_LABEL } from '../lib/auth'

export default function MinhaConta() {
  const { session, profile, updateName } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')
    if (name.trim().length < 2) return setError('Informe seu nome completo.')
    setBusy(true)
    const result = await updateName(name)
    setBusy(false)
    if (result) setError(result)
    else setMessage('Seu nome foi atualizado.')
  }

  return (
    <div className="max-w-2xl space-y-5">
      <section className="card">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Dados da conta</p>
        <form onSubmit={save} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="profile-name">Nome completo</label>
            <input id="profile-name" className="input" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required minLength={2} />
          </div>
          <div>
            <label className="label" htmlFor="profile-email">E-mail</label>
            <input id="profile-email" className="input opacity-70" value={session?.user.email ?? ''} readOnly />
          </div>
          <div>
            <span className="label">Perfil de acesso</span>
            <span className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm text-gold">{profile ? ROLE_LABEL[profile.role] : ''}</span>
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
          <button className="btn btn-gold" type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar alterações'}</button>
        </form>
      </section>
      {profile?.role === 'customer' && (
        <section className="card">
          <h2 className="text-sm font-medium text-zinc-100">Agendamentos</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">A agenda deste projeto ainda salva horários apenas no navegador da barbearia e não possui vínculo seguro com a sua conta. Para proteger seus dados, seus agendamentos não são exibidos aqui. É necessário conectar a agenda a tabelas do Supabase com políticas de acesso antes de liberar essa função.</p>
        </section>
      )}
    </div>
  )
}
