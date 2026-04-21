'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/ui/Sidebar'
import Toast from '@/components/ui/Toast'
import LoadingScreen from '@/components/ui/LoadingScreen'

const PAGE_TITLES = {
  '/dashboard':            'Inicio',
  '/dashboard/recetas':    'Recetas',
  '/dashboard/checkin':    'Check-in',
  '/dashboard/firmas':     'Firmas',
  '/dashboard/horarios':   'Horarios',
  '/dashboard/inventario': 'Inventario',
  '/dashboard/pedidos':    'Pedidos',
  '/dashboard/reportes':   'Reportes',
  '/dashboard/admin':      'Admin',
}

export default function DashboardShell({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, ready } = useAuth()
  const [sideOpen, setSideOpen] = useState(false)

  useEffect(() => {
    if (ready && !user) router.replace('/login')
  }, [ready, user, router])

  if (!ready) return <LoadingScreen message="AUTENTICANDO…" />
  if (!user)  return <LoadingScreen message="REDIRIGIENDO…" />

  const role      = user.role ?? 'empleado'
  const pageTitle = PAGE_TITLES[pathname] ?? 'Satélite ON'

  return (
    <div style={{ minHeight:'100vh', background:'var(--sat-bg)' }}>
      <header style={{
        position:'fixed', top:0, left:0, right:0, zIndex:30, height:52,
        background:'var(--sat-surface)', borderBottom:'1px solid var(--sat-border)',
        display:'flex', alignItems:'center', gap:14, padding:'0 16px',
      }}>
        <button onClick={()=>setSideOpen(true)} style={{
          background:'none', border:'none', cursor:'pointer',
          padding:6, display:'flex', flexDirection:'column', gap:5, flexShrink:0,
        }}>
          <span style={{ display:'block', width:22, height:2, background:'var(--sat-text)', borderRadius:2 }} />
          <span style={{ display:'block', width:16, height:2, background:'var(--sat-accent)', borderRadius:2 }} />
          <span style={{ display:'block', width:22, height:2, background:'var(--sat-text)', borderRadius:2 }} />
        </button>

        <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, color:'var(--sat-text)', letterSpacing:'0.06em', flex:1 }}>
          {pageTitle}
        </span>

        {role==='raven' ? (
          <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', letterSpacing:'0.1em',
            color:'#f59e0b', background:'#f59e0b10', padding:'3px 8px',
            borderRadius:3, border:'1px solid #f59e0b28' }}>◆ RAVEN</span>
        ) : (
          <span style={{
            width:7, height:7, borderRadius:'50%',
            background: role==='admin'?'var(--sat-info)':'var(--sat-accent)',
            boxShadow:`0 0 8px ${role==='admin'?'var(--sat-info)':'var(--sat-accent)'}`,
          }} />
        )}
      </header>

      <Sidebar open={sideOpen} onClose={()=>setSideOpen(false)} />

      <main style={{ paddingTop:52, minHeight:'100vh' }}>
        {children}
      </main>

      <Toast />
    </div>
  )
}
