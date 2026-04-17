'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { supabase } from '@/lib/supabaseClient'
import PageHeader from '@/components/ui/PageHeader'
import AccessDenied from '@/components/ui/AccessDenied'
import toast from 'react-hot-toast'

export default function CheckinPage() {
  const { user } = useAuth()
  const perm     = usePermission('checkin')
  const [checkins,   setCheckins]  = useState([])
  const [loading,    setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gps,        setGps]        = useState(null)

  const fetchCheckins = useCallback(async () => {
    if (!user) return
    const query = supabase.from('checkins').select('*, profiles(nombre)').order('created_at', { ascending:false }).limit(50)
    const { data } = await query
    setCheckins(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCheckins() }, [fetchCheckins])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
        () => setGps(null)
      )
    }
  }, [])

  async function handleCheckin() {
    if (!user) return
    setSubmitting(true)
    const { error } = await supabase.from('checkins').insert({
      user_id:    user.id,
      gps:        gps ?? null,
      status:     'ok',
    })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('✅ Check-in registrado')
    fetchCheckins()
  }

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  const todayISO = new Date().toISOString().slice(0, 10)
  const todayCount = checkins.filter(c => c.created_at?.slice(0,10) === todayISO).length

  return (
    <div style={{ padding:'32px 24px', maxWidth:800 }}>
      <PageHeader title="Check-in" subtitle="Registro de asistencia" />

      {/* Botón principal */}
      <div className="sat-card" style={{ padding:32, textAlign:'center', marginBottom:28, borderColor:'#00e5a030' }}>
        <p style={{ margin:'0 0 8px', fontSize:12, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', letterSpacing:'0.08em' }}>
          {gps ? `📍 GPS: ${gps}` : '📍 Sin GPS'}
        </p>
        <p style={{ margin:'0 0 20px', fontSize:13, color:'var(--sat-dim)' }}>
          Check-ins hoy: <strong style={{ color:'var(--sat-accent)', fontFamily:'DM Mono,monospace' }}>{todayCount}</strong>
        </p>
        <button
          className="sat-btn sat-btn-primary"
          style={{ fontSize:16, padding:'14px 36px' }}
          onClick={handleCheckin}
          disabled={submitting}
        >
          {submitting ? 'Registrando…' : '◈ Registrar check-in'}
        </button>
      </div>

      {/* Historial */}
      <h3 style={{ fontFamily:'DM Mono,monospace', fontWeight:400, fontSize:13, color:'var(--sat-dim)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>
        Historial reciente
      </h3>

      {loading && <p style={{ color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', fontSize:12 }}>CARGANDO…</p>}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {checkins.map(c => (
          <div key={c.id} className="sat-card" style={{ padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ margin:0, fontSize:13, color:'var(--sat-text)', fontWeight:500 }}>
                {c.profiles?.nombre ?? 'Desconocido'}
              </p>
              {c.gps && <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace' }}>📍 {c.gps}</p>}
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ margin:0, fontSize:12, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace' }}>
                {new Date(c.created_at).toLocaleDateString('es-MX')}
              </p>
              <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--sat-accent)', fontFamily:'DM Mono,monospace' }}>
                {new Date(c.created_at).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
