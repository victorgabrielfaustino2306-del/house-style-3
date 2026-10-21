import { useState } from 'react'
import { brl } from '../lib/finance'

const niceMax = (max: number) => {
  if (max <= 0) return 100
  const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)))
  return Math.ceil(raw / mag) * mag * 4
}
const short = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR')}k` : String(v))

export function LineChart({ points }: { points: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 600, H = 230, pl = 44, pr = 12, pt = 12, pb = 26, n = points.length
  const max = niceMax(Math.max(0, ...points.map(p => p.value)))
  const x = (i: number) => pl + (i * (W - pl - pr)) / Math.max(1, n - 1)
  const y = (v: number) => pt + (1 - v / max) * (H - pt - pb)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ')
  const area = `${line} L${x(n - 1)},${H - pb} L${x(0)},${H - pb} Z`
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round((((e.clientX - r.left) / r.width) * W - pl) / (W - pl - pr) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }
  const h = hover == null ? null : points[hover]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Faturamento diário">
      {[0, 1, 2, 3, 4].map(k => { const v = (max / 4) * k; return <g key={k}><line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="#27272b" strokeDasharray="3 4" /><text x={pl - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#71717a">{short(v)}</text></g> })}
      {points.map((p, i) => (i % Math.ceil(n / 6) === 0 ? <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#71717a">{p.label}</text> : null))}
      <path d={area} fill="#c9a45c" opacity="0.1" />
      <path d={line} fill="none" stroke="#c9a45c" strokeWidth="2" strokeLinejoin="round" />
      {h && hover != null && <g>
        <line x1={x(hover)} x2={x(hover)} y1={pt} y2={H - pb} stroke="#3a3a40" />
        <circle cx={x(hover)} cy={y(h.value)} r="4" fill="#c9a45c" />
        <g transform={`translate(${Math.min(x(hover) + 8, W - 110)},${Math.max(pt, y(h.value) - 44)})`}><rect width="100" height="38" rx="6" fill="#131315" stroke="#3a3a40" /><text x="8" y="15" fontSize="10" fill="#a1a1aa">{h.label}</text><text x="8" y="30" fontSize="12" fill="#f4f4f5">{brl(h.value)}</text></g>
      </g>}
    </svg>
  )
}

export function BarChart({ items }: { items: { name: string; count: number }[] }) {
  const max = Math.max(1, ...items.map(i => i.count))
  return (
    <div className="flex h-52 items-end gap-3">
      {items.map(i => (
        <div key={i.name} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs text-zinc-200">{i.count}</span>
          <div className="w-full max-w-[44px] rounded-t bg-gold transition-all" style={{ height: `${(i.count / max) * 150}px` }} />
          <span className="w-full truncate text-center text-[11px] text-zinc-500" title={i.name}>{i.name}</span>
        </div>
      ))}
    </div>
  )
}
