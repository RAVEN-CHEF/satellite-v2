'use client'
import { useState } from 'react'

export default function ScaleCalculator({ ingredientes, scaleMin = 0.25, scaleMax = 10 }) {
  const [factor, setFactor] = useState(1)
  const f = Math.min(Math.max(Number(factor) || 1, scaleMin), scaleMax)

  return (
    <div className="sat-card" style={{ padding:'18px 20px' }}>
      <p style={{ margin:'0 0 14px', fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--sat-dim)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
        Calculadora de escala
      </p>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <label className="sat-label" style={{ margin:0, whiteSpace:'nowrap' }}>Factor ×</label>
        <input className="sat-input" type="number" min={scaleMin} max={scaleMax} step="0.25"
          value={factor} onChange={e => setFactor(e.target.value)}
          style={{ maxWidth:100 }} />
        <input type="range" min={scaleMin} max={scaleMax} step="0.25"
          value={factor} onChange={e => setFactor(e.target.value)}
          style={{ flex:1, accentColor:'var(--sat-accent)' }} />
        <span style={{ fontFamily:'DM Mono,monospace', fontSize:14, color:'var(--sat-accent)', minWidth:40, textAlign:'right' }}>{f}×</span>
      </div>
      <div>
        {ingredientes.map((ing, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i < ingredientes.length-1 ? '1px solid var(--sat-border)' : 'none' }}>
            <span style={{ fontSize:13, color:'var(--sat-text)' }}>{ing.nombre}</span>
            <span style={{ fontSize:13, color:'var(--sat-accent)', fontFamily:'DM Mono,monospace' }}>
              {(ing.cantidad * f).toFixed(2)} {ing.unidad}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
