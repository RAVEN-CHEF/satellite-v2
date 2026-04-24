'use client'
import Link from 'next/link'

export default function RecetaCard({ receta, canEdit, onEdit, onDelete }) {
  const ingredientes = Array.isArray(receta.ingredientes) ? receta.ingredientes : []
  return (
    <div className="sat-card" style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <Link href={`/dashboard/recetas/${receta.id}`} style={{ textDecoration:'none' }}>
            <p style={{ margin:0, fontSize:15, fontWeight:500, color:'var(--sat-text)', cursor:'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color='var(--sat-accent)'}
              onMouseLeave={e => e.currentTarget.style.color='var(--sat-text)'}>
              {receta.nombre}
            </p>
          </Link>
          {receta.categoria && (
            <span style={{ fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--sat-accent)', background:'#00e5a012', border:'1px solid #00e5a025', borderRadius:3, padding:'1px 6px', marginTop:4, display:'inline-block' }}>
              {receta.categoria}
            </span>
          )}
        </div>
        {canEdit && (
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button className="sat-btn sat-btn-ghost" style={{ padding:'4px 8px', fontSize:12 }} onClick={onEdit}>✏️</button>
            <button className="sat-btn sat-btn-danger" style={{ padding:'4px 8px', fontSize:12 }} onClick={onDelete}>🗑</button>
          </div>
        )}
      </div>
      <p style={{ margin:0, fontSize:12, color:'var(--sat-dim)' }}>
        {ingredientes.length} ingrediente{ingredientes.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
