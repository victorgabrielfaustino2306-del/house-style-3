import { useRef } from 'react'
import { useStore } from '../lib/store'
import { Field } from '../components/ui'
import { download } from '../lib/finance'

export default function Config() {
  const { db, update, replace, toast } = useStore()
  const file = useRef<HTMLInputElement>(null)
  const restore = async (f?: File) => {
    if (!f) return
    try {
      const d = JSON.parse(await f.text())
      if (!d || !Array.isArray(d.sales) || !Array.isArray(d.barbers) || !Array.isArray(d.services) || !Array.isArray(d.appts) || !Array.isArray(d.expenses)) throw new Error()
      if (confirm('Restaurar este backup substitui todos os dados atuais. Continuar?')) { replace(d); toast('Backup restaurado.') }
    } catch { toast('Arquivo de backup inválido.', true) }
  }
  return (
    <div className="max-w-xl space-y-6">
      <div className="card"><Field label="Nome da barbearia"><input className="input" value={db.shopName} onChange={e => update(d => ({ ...d, shopName: e.target.value }))} /></Field></div>
      <div className="card space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Backup dos dados</h3>
        <p className="text-xs text-zinc-500">Os dados ficam salvos só neste navegador e neste aparelho. Se você limpar os dados do navegador, eles se perdem. Exporte um backup com frequência.</p>
        <div className="flex gap-2"><button className="btn btn-gold" onClick={() => download('backup-house-style.json', JSON.stringify(db), 'application/json')}>Exportar backup</button>
          <button className="btn" onClick={() => file.current?.click()}>Importar backup</button><input ref={file} type="file" accept=".json" hidden onChange={e => restore(e.target.files?.[0])} /></div>
      </div>
    </div>
  )
}
