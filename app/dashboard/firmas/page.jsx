'use client'
import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin, isRaven } from '@/lib/permissions'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import AccessDenied from '@/components/ui/AccessDenied'
import toast from 'react-hot-toast'

const STATUS_LABELS = { pending:'Pendiente', approved:'Aprobado', rejected:'Rechazado' }
const STATUS_COLORS = { pending:'var(--sat-warn)', approved:'var(--sat-accent)', rejected:'var(--sat-danger)' }

export default function FirmasPage() {
  const { user } = useAuth()
  const perm     = usePermission('firmas')
  const [tab,     setTab]     = useState('firmar')
  const [preview, setPreview] = useState(null)

  const { data: firmas, loading, refetch } = useSupabaseQuery(
    () => supabase.from('signatures')
      .select('*, profiles(nombre)')
      .order('created_at', { ascending:false })
      .limit(80),
    []
  )

  const canApprove = isAdmin(user) || isRaven(user)

  async function handleUpdateStatus(id, status) {
    const { error } = await supabase.from('signatures').update({ status }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success(`Firma ${STATUS_LABELS[status].toLowerCase()}`)
    refetch()
  }

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  return (
    <div style={{ padding:'32px 24px', maxWidth:900 }}>
      <PageHeader title="Firmas digitales" subtitle="Documentos y autorizaciones" />

      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[['firmar','✍️ Nueva firma'],['historial','📋 Historial']].map(([t,l]) => (
          <button key={t} onClick={()=>setTab(t)}
            className={tab===t ? 'sat-btn sat-btn-primary' : 'sat-btn sat-btn-ghost'}>
            {l}
          </button>
        ))}
      </div>

      {tab==='firmar' && <FirmarTab user={user} onSaved={refetch} />}
      {tab==='historial' && (
        <HistorialTab
          firmas={firmas??[]}
          loading={loading}
          canApprove={canApprove}
          onUpdateStatus={handleUpdateStatus}
          onPreview={img=>setPreview(img)}
        />
      )}

      {/* Modal foto grande */}
      <Modal open={!!preview} onClose={()=>setPreview(null)} title="Vista de firma" width={620}>
        {preview && (
          <img src={preview} alt="firma"
            style={{ width:'100%', borderRadius:8, display:'block', background:'#07080d' }} />
        )}
      </Modal>
    </div>
  )
}

// ── Tab firmar ──────────────────────────────────────────────────
function FirmarTab({ user, onSaved }) {
  const canvasRef   = useRef(null)
  const fileRef     = useRef(null)
  const [drawing,   setDrawing]   = useState(false)
  const [hasDrawn,  setHasDrawn]  = useState(false)
  const [submitting,setSubmitting]= useState(false)
  const [fotoFile,  setFotoFile]  = useState(null)
  const [fotoPreview,setFotoPreview] = useState(null)

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const touch  = e.touches?.[0] ?? e
    return { x:(touch.clientX-rect.left)*scaleX, y:(touch.clientY-rect.top)*scaleY }
  }
  function startDraw(e) {
    e.preventDefault()
    const canvas=canvasRef.current, ctx=canvas.getContext('2d')
    const pos=getPos(e,canvas)
    ctx.beginPath(); ctx.moveTo(pos.x,pos.y)
    setDrawing(true)
  }
  function draw(e) {
    e.preventDefault()
    if (!drawing) return
    const canvas=canvasRef.current, ctx=canvas.getContext('2d')
    const pos=getPos(e,canvas)
    ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.strokeStyle='#00e5a0'
    ctx.lineTo(pos.x,pos.y); ctx.stroke()
    setHasDrawn(true)
  }
  function endDraw(e) { e.preventDefault(); setDrawing(false) }
  function clearCanvas() {
    canvasRef.current.getContext('2d').clearRect(0,0,600,200)
    setHasDrawn(false)
  }

  function handleFoto(e) {
    const file=e.target.files[0]
    if (!file) return
    setFotoFile(file)
    const reader=new FileReader()
    reader.onload=ev=>setFotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!hasDrawn) { toast.error('Dibuja tu firma primero'); return }
    setSubmitting(true)
    let fotoUrl = null

    // Subir foto adjunta si existe
    if (fotoFile) {
      const ext  = fotoFile.name.split('.').pop()
      const path = `firmas/${user.id}/${Date.now()}.${ext}`
      const { data: upData, error: upErr } = await supabase.storage
        .from('satellite-media')
        .upload(path, fotoFile, { contentType: fotoFile.type })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('satellite-media').getPublicUrl(path)
        fotoUrl = urlData.publicUrl
      }
    }

    const imageData = canvasRef.current.toDataURL('image/png')
    const { error } = await supabase.from('signatures').insert({
      user_id: user.id,
      image:   imageData,
      photo:   fotoUrl,
      status:  'pending',
    })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Firma enviada')
    clearCanvas()
    setFotoFile(null); setFotoPreview(null)
    onSaved?.()
  }

  return (
    <div>
      <p style={{ margin:'0 0 12px', fontSize:13, color:'var(--sat-dim)' }}>
        Dibuja tu firma abajo:
      </p>

      <div style={{ border:'1px solid var(--sat-border)', borderRadius:8, overflow:'hidden',
        marginBottom:14, background:'#07080d', cursor:'crosshair' }}>
        <canvas ref={canvasRef} width={600} height={200}
          style={{ display:'block', width:'100%', touchAction:'none' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
      </div>

      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:20, flexWrap:'wrap' }}>
        <button className="sat-btn sat-btn-ghost" onClick={clearCanvas}>Limpiar</button>

        {/* Foto adjunta */}
        <label htmlFor="foto-firma" className="sat-btn sat-btn-ghost" style={{ cursor:'pointer' }}>
          📎 {fotoFile ? 'Cambiar foto' : 'Adjuntar foto'}
        </label>
        <input ref={fileRef} id="foto-firma" type="file" accept="image/*"
          style={{ display:'none' }} onChange={handleFoto} />
        {fotoPreview && (
          <>
            <img src={fotoPreview} alt="adjunto"
              style={{ width:48, height:48, objectFit:'cover', borderRadius:6, border:'1px solid var(--sat-border)' }} />
            <button onClick={()=>{setFotoFile(null);setFotoPreview(null)}}
              style={{ background:'none', border:'none', color:'var(--sat-danger)', cursor:'pointer', fontSize:18 }}>×</button>
          </>
        )}

        <button className="sat-btn sat-btn-primary" onClick={handleSubmit}
          disabled={submitting||!hasDrawn} style={{ marginLeft:'auto' }}>
          {submitting ? 'Enviando…' : 'Enviar firma'}
        </button>
      </div>
    </div>
  )
}

// ── Tab historial ───────────────────────────────────────────────
function HistorialTab({ firmas, loading, canApprove, onUpdateStatus, onPreview }) {
  if (loading) return <p style={{ color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', fontSize:12 }}>CARGANDO…</p>
  if (!firmas.length) return <p style={{ color:'var(--sat-dim)', fontSize:13 }}>Sin firmas registradas</p>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {firmas.map(f => (
        <div key={f.id} className="sat-card" style={{ padding:'14px 18px', display:'flex',
          justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:500, color:'var(--sat-text)' }}>
              {f.profiles?.nombre ?? 'Desconocido'}
            </p>
            <p style={{ margin:'3px 0 0', fontSize:11, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace' }}>
              {new Date(f.created_at).toLocaleString('es-MX')}
            </p>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {/* Firma canvas */}
            {f.image && (
              <img src={f.image} alt="firma"
                onClick={()=>onPreview(f.image)}
                title="Ver firma"
                style={{ height:44, maxWidth:120, borderRadius:6, border:'1px solid var(--sat-border)',
                  background:'#07080d', cursor:'pointer', objectFit:'contain' }} />
            )}

            {/* Foto adjunta */}
            {f.photo && (
              <img src={f.photo} alt="foto"
                onClick={()=>onPreview(f.photo)}
                title="Ver foto adjunta"
                style={{ width:44, height:44, objectFit:'cover', borderRadius:6,
                  border:'1px solid var(--sat-border)', cursor:'pointer' }} />
            )}

            {/* Estado badge */}
            <span style={{
              fontSize:11, fontFamily:'DM Mono,monospace',
              color: STATUS_COLORS[f.status]??'var(--sat-dim)',
              background:`${STATUS_COLORS[f.status]}15`,
              border:`1px solid ${STATUS_COLORS[f.status]}30`,
              padding:'3px 9px', borderRadius:4,
            }}>
              {STATUS_LABELS[f.status]??f.status}
            </span>

            {/* Botones aprobación */}
            {canApprove && f.status==='pending' && (
              <div style={{ display:'flex', gap:6 }}>
                <button className="sat-btn sat-btn-primary" style={{ padding:'4px 10px', fontSize:11 }}
                  onClick={()=>onUpdateStatus(f.id,'approved')}>✓ Aprobar</button>
                <button className="sat-btn sat-btn-danger" style={{ padding:'4px 10px', fontSize:11 }}
                  onClick={()=>onUpdateStatus(f.id,'rejected')}>✗ Rechazar</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
