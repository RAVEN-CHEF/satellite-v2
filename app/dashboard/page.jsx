'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { isRaven, detectRole, canView } from '@/lib/permissions'
import StatCard from '@/components/ui/StatCard'
import PageHeader from '@/components/ui/PageHeader'

const ALL_MODULES = [
  { href:'/dashboard/recetas',    label:'Recetas',    icon:'📖', desc:'Consultar y escalar recetas',    seccion:'recetas' },
  { href:'/dashboard/checkin',    label:'Check-in',   icon:'📍', desc:'Registrar asistencia con QR',    seccion:'checkin' },
  { href:'/dashboard/firmas',     label:'Firmas',     icon:'✍️', desc:'Firma digital de documentos',   seccion:'firmas' },
  { href:'/dashboard/horarios',   label:'Horarios',   icon:'📅', desc:'Gestión de turnos del staff',   seccion:'horarios' },
  { href:'/dashboard/inventario', label:'Inventario', icon:'📦', desc:'Stock de ingredientes',         seccion:'inventario' },
  { href:'/dashboard/reportes',   label:'Reportes',   icon:'📊', desc:'Exportar datos operativos',     seccion:'reportes' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function loadStats() {
      const [recetasRes, checkinsRes, firmasRes, empleadosRes] = await Promise.all([
        supabase.from('recetas').select('*', { count:'exact', head:true }),
        supabase.from('checkins').select('*', { count:'exact', head:true }).gte('created_at', new Date(Date.now()-86400000).toISOString()),
        supabase.from('signatures').select('*', { count:'exact', head:true }).eq('status','pending'),
        supabase.from('profiles').select('*', { count:'exact', head:true }),
      ])
      setStats({
        recetas:       recetasRes.count    ?? 0,
        checkins:      checkinsRes.count   ?? 0,
        firmasPending: firmasRes.count     ?? 0,
        empleados:     empleadosRes.count  ?? 0,
      })
      setLoading(false)
    }
    loadStats()
  }, [user])

  if (!user) return null

  const role        = detectRole(user)
  const visibleMods = ALL_MODULES.filter(m => canView(user, m.seccion))

  return (
    <div style={{ padding:'32px 24px', maxWidth:1100 }}>
      <PageHeader
        title={<>Bienvenido, <span style={{ color:'var(--sat-accent)' }}>{user.nombre ?? user.email?.split('@')[0]}</span></>}
        subtitle={role==='raven' ? 'Acceso total al sistema' : role==='admin' ? 'Panel de administración' : 'Panel de empleado'}
      />

      {!loading && stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16, marginBottom:36 }}>
          <StatCard label="Recetas"          value={stats.recetas}       accent />
          <StatCard label="Check-ins hoy"    value={stats.checkins} />
          <StatCard label="Firmas pendientes" value={stats.firmasPending} />
          <StatCard label="Empleados"        value={stats.empleados} />
        </div>
      )}

      {visibleMods.length > 0 && (
        <div>
          <p style={{ margin:'0 0 12px', fontSize:12, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', letterSpacing:'0.08em', textTransform:'uppercase' }}>Módulos</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
            {visibleMods.map(({ href, label, icon, desc }) => (
              <Link key={href} href={href} style={{ textDecoration:'none' }}>
                <div className="sat-card" style={{ padding:20, transition:'border-color 0.15s, transform 0.12s', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--sat-accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--sat-border)'}>
                  <div style={{ fontSize:24, marginBottom:10 }}>{icon}</div>
                  <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:500, color:'var(--sat-text)' }}>{label}</p>
                  <p style={{ margin:0, fontSize:12, color:'var(--sat-dim)' }}>{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
