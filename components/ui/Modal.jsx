'use client'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, width = 520 }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, background:'#00000080', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sat-card animate-slide-up" style={{ width:'100%', maxWidth:width, padding:28, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:16, fontFamily:'DM Mono,monospace', fontWeight:400, color:'var(--sat-text)' }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--sat-dim)', cursor:'pointer', fontSize:22, lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
