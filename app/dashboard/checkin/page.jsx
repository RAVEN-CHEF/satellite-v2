'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin, isRaven } from '@/lib/permissions'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import AccessDenied from '@/components/ui/AccessDenied'
import toast from 'react-hot-toast'

export default function CheckinPage() {
  const { user }     = useAuth()
  const perm         = usePermission('checkin')
  const [checkins, setCheckins]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gps,      setGps]        = useState(null)
  const [foto,     setFoto]       = useState(null)  // base64 preview
  const [fotoFile, setFotoFile]   = useState(null)
  const [preview,  setPreview]    = useState(null)  // modal de foto grande
  const fileRef = useRef(null)

  const canManage = isAdmin(user) || isRaven(user)
  const todayISO  = new Date().toISOString().slice(0,10)

  const fetchCheckins = useCallback(async () => {
    if (!user) return
    const q = canManage
      ? supabase.from('checkins').select('*, profiles(nombre)').order('created_at',{ascending:false}).limit(80)
      : supabase.from('checkins').select('*, profiles(nombre)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(40)
    const { data } = await q
    setCheckins(data??[])
    setLoading(false)
  }, [user, canManage])

  useEffect(() => { fetchCheckins() }, [fetchCheckins])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
        () => setGps(null)
      )
    }
  }, [])

  function handleFotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setFoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleCheckin() {
    if (!user) return
    setSubmitting(true)
    let fotoUrl = null

    // Subir foto a Supabase Storage si existe
    if (fotoFile) {
      const ext  = fotoFile.name.split('.').pop()
      const path = `checkins/${user.id}/${Date.now()}.${ext}`
      const { data: upData, error: upErr } = await supabase.storage
        .from('satellite-media')
        .upload(path, fotoFile, { contentType: fotoFile.type })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('satellite-media').getPublicUrl(path)
        fotoUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('checkins').insert({
      user_id: user.id,
      gps:     gps ?? null,
      photo:   fotoUrl,
      status:  'ok',
    })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('✅ Check-in registrado')
    setFoto(null); setFotoFile(null)
    fetchCheckins()
  }

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  const todayCount = checkins.filter(c=>c.created_at?.slice(0,10)===todayISO).length

  return (
    <div style={{ padding:'32px 24px', maxWidth:800 }}>
      <PageHeader title="Check-in" subtitle="Registro de asistencia" />

      {/* Botón principal */}
      <div className="sat-card" style={{ padding:28, marginBottom:24, borderColor:'#00e5a030' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
          <div style={{ textAlign:'center' }}>
            <p style={{ margin:'0 0 4px', fontSize:11, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace' }}>GPS</p>
            <p style={{ margin:0, fontSize:12, color: gps?'var(--sat-accent)':'var(--sat-dim)', fontFamily:'DM Mono,monospace' }}>
              {gps ? '📍 Activo' : '📍 No disponible'}
            </p>
          </div>
          <div style={{ textAlign:'center' }}>
            <p style={{ margin:'0 0 4px', fontSize:11, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace' }}>HOY</p>
            <p style={{ margin:0, fontSize:22, color:'var(--sat-accent)', fontFamily:'DM Mono,monospace', fontWeight:400 }}>{todayCount}</p>
          </div>
        </div>

        {/* Foto */}
        <div style={{ marginBottom:16 }}>
          <label className="sat-label">Foto (opcional)</label>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <label htmlFor="foto-checkin" className="sat-btn sat-btn-ghost" style={{ cursor:'pointer', fontSize:12 }}>
              📷 {foto ? 'Cambiar foto' : 'Agregar foto'}
            </label>
            <input ref={fileRef} id="foto-checkin" type="file" accept="image/*" capture="environment"
              style={{ display:'none' }} onChange={handleFotoChange} />
            {foto && (
              <img src={foto} alt="preview" onClick={()=>setPreview(foto)}
                style={{ width:60, height:60, objectFit:'cover', borderRadius:8, border:'1px solid var(--sat-border)', cursor:'pointer' }} />
            )}
            {foto && (
              <button onClick={()=>{setFoto(null);setFotoFile(null)}} style={{ background:'none', border:'none', color:'var(--sat-danger)', cursor:'pointer', fontSize:18 }}>×</button>
            )}
          </div>
        </div>

        <button className="sat-btn sat-btn-primary" style={{ width:'100%', fontSize:15, padding:'13px 0' }}
          onClick={handleCheckin} disabled={submitting}>
          {submitting ? 'Registrando…' : '◈ Registrar check-in'}
        </button>
      </div>

      {/* Historial */}
      <h3 style={{ fontFamily:'DM Mono,monospace', fontWeight:400, fontSize:12, color:'var(--sat-dim)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>
        Historial reciente
      </h3>

      {loading && <p style={{ color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', fontSize:12 }}>CARGANDO…</p>}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {checkins.map(c => (
          <div key={c.id} className="sat-card" style={{ padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:13, color:'var(--sat-text)', fontWeight:500 }}>
                {c.profiles?.nombre ?? 'Desconocido'}
              </p>
              {c.gps && <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace' }}>📍 {c.gps}</p>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {c.photo && (
                <img src={c.photo} alt="foto" onClick={()=>setPreview(c.photo)}
                  style={{ width:44, height:44, objectFit:'cover', borderRadius:6, border:'1px solid var(--sat-border)', cursor:'pointer' }} />
              )}
              <div style={{ textAlign:'right' }}>
                <p style={{ margin:0, fontSize:12, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace' }}>
                  {new Date(c.created_at).toLocaleDateString('es-MX')}
                </p>
                <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--sat-accent)', fontFamily:'DM Mono,monospace' }}>
                  {new Date(c.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal foto grande */}
      <Modal open={!!preview} onClose={()=>setPreview(null)} title="Foto" width={600}>
        {preview && <img src={preview} alt="foto" style={{ width:'100%', borderRadius:8, display:'block' }} />}
      </Modal>
    </div>
  )
}
