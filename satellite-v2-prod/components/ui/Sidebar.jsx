'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { canView, isRaven, isAdmin } from '@/lib/permissions'
import { useEffect } from 'react'

const NAV = [
  { href:'/dashboard',            label:'Inicio',     icon:'◈',  seccion:null },
  { href:'/dashboard/recetas',    label:'Recetas',    icon:'📖', seccion:'recetas' },
  { href:'/dashboard/checkin',    label:'Check-in',   icon:'📍', seccion:'checkin' },
  { href:'/dashboard/firmas',     label:'Firmas',     icon:'✍️', seccion:'firmas' },
  { href:'/dashboard/horarios',   label:'Horarios',   icon:'📅', seccion:'horarios' },
  { href:'/dashboard/inventario', label:'Inventario', icon:'📦', seccion:'inventario' },
  { href:'/dashboard/pedidos',    label:'Pedidos',    icon:'🛒', seccion:'inventario' },
  { href:'/dashboard/reportes',   label:'Reportes',   icon:'📊', seccion:'reportes' },
  { href:'/dashboard/admin',      label:'Admin',      icon:'⚙️', seccion:'admin' },
]

export default function Sidebar({ open, onClose }) {
  const pathname       = usePathname()
  const { user, signOut } = useAuth()

  useEffect(() => { onClose?.() }, [pathname])

  const raven = isRaven(user)
  const admin = isAdmin(user)
  const role  = user?.role ?? 'empleado'

  const visibleNav = NAV.filter(n => {
    if (!n.seccion) return true
    if (n.seccion==='admin') return raven || admin
    return canView(user, n.seccion)
  })

  return (
    <>
      {open && (
        <div onClick={onClose} style={{
          position:'fixed', inset:0, zIndex:40,
          background:'#00000060', backdropFilter:'blur(2px)',
        }} />
      )}

      <aside style={{
        position:'fixed', top:0, left:0, bottom:0, zIndex:41,
        width:260,
        background:'var(--sat-surface)',
        borderRight:'1px solid var(--sat-border)',
        display:'flex', flexDirection:'column',
        boxShadow:'4px 0 40px #00000060',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform 0.25s ease',
      }}>
        {/* Header */}
        <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--sat-border)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--sat-accent)', boxShadow:'0 0 10px var(--sat-accent)' }} />
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--sat-accent)', letterSpacing:'0.12em' }}>
                SATÉLITE ON
              </span>
            </div>
            <div style={{ marginTop:6, display:'flex', gap:6 }}>
              {raven && (
                <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--sat-warn)',
                  background:'#f59e0b10', padding:'2px 7px', borderRadius:3, border:'1px solid #f59e0b28' }}>
                  ◆ RAVEN
                </span>
              )}
              {admin && !raven && (
                <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--sat-info)',
                  background:'#3b82f610', padding:'2px 7px', borderRadius:3, border:'1px solid #3b82f628' }}>
                  ADMIN
                </span>
              )}
              {role==='empleado' && (
                <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--sat-dim)',
                  background:'#ffffff08', padding:'2px 7px', borderRadius:3, border:'1px solid var(--sat-border)' }}>
                  EMPLEADO
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--sat-dim)', cursor:'pointer', fontSize:24, lineHeight:1 }}>×</button>
        </div>

        {/* Nombre + email */}
        {user?.nombre && (
          <div style={{ padding:'10px 18px', borderBottom:'1px solid var(--sat-border)' }}>
            <p style={{ margin:0, fontSize:13, color:'var(--sat-text)', fontWeight:500 }}>{user.nombre}</p>
            <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--sat-dim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</p>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
          {visibleNav.map(({ href, label, icon }) => {
            const active = pathname===href || (href!=='/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'11px 14px', borderRadius:8, fontSize:14,
                fontWeight: active?500:400,
                color: active?'var(--sat-accent)':'var(--sat-text)',
                background: active?'#00e5a012':'transparent',
                borderLeft: active?'2px solid var(--sat-accent)':'2px solid transparent',
                textDecoration:'none', transition:'all 0.12s',
              }}>
                <span style={{ fontSize:17, minWidth:22, textAlign:'center' }}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:'14px 16px', borderTop:'1px solid var(--sat-border)', flexShrink:0 }}>
          <button onClick={signOut} style={{
            width:'100%', padding:'9px 0', borderRadius:7, fontSize:12,
            background:'transparent', border:'1px solid var(--sat-border)',
            color:'var(--sat-dim)', cursor:'pointer',
          }}>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
