'use client'
import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin, isRaven } from '@/lib/permissions'
import PageHeader from '@/components/ui/PageHeader'
import AccessDenied from '@/components/ui/AccessDenied'
import toast from 'react-hot-toast'

const STATUS_LABELS = { pending:'Pendiente', approved:'Aprobado', rejected:'Rechazado' }
const STATUS_COLORS = { pending:'var(--sat-warn)', approved:'var(--sat-accent)', rejected:'var(--sat-danger)' }

export default function FirmasPage() {
  const { user } = useAuth()
  const perm     = usePermission('firmas')
  const [tab, setTab] = useState('firmar')

  const { data: firmas, loading, refetch } = useSupabaseQuery(
    () => supabase.from('signatures').select('*, profiles(nombre)').order('created_at', { ascending:false }).limit(60),
    []
  )

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  const canApprove = isAdmin(user) || isRaven(user)

  async function handleUpdateStatus(id, status) {
    const { error } = await supabase.from('signatures').update({ status }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success(`Firma ${STATUS_LABELS[status].toLowerCase()}`)
    refetch()
  }

  return (
    <div style={{ padding:'32px 24px', maxWidth:900 }}>
      <PageHeader title="Firmas digitales" subtitle="Documentos y autorizaciones" />

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {['firmar','historial'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={tab===t ? 'sat-btn sat-btn-primary' : 'sat-btn sat-btn-ghost'} style={{ textTransform:'capitalize' }}>
            {t === 'firmar' ? '✍️ Nueva firma' : '📋 Historial'}
          </button>
        ))}
      </div>

      {tab === 'firmar' && <FirmarTab user={user} onSaved={refetch} />}
      {tab === 'historial' && (
        <HistorialTab firmas={firmas??[]} loading={loading} canApprove={canApprove} onUpdateStatus={handleUpdateStatus} />
      )}
    </div>
  )
}

function FirmarTab({ user, onSaved }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing]     = useState(false)
  const [hasDrawn, setHasDrawn]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches?.[0] ?? e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }

  function startDraw(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }

  function draw(e) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.strokeStyle = '#00e5a0'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasDrawn(true)
  }

  function endDraw(e) { e.preventDefault(); setDrawing(false) }

  function clearCanvas() {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  async function handleSubmit() {
    if (!hasDrawn) { toast.error('Dibuja tu firma primero'); return }
    setSubmitting(true)
    const imageData = canvasRef.current.toDataURL('image/png')
    const { error } = await supabase.from('signatures').insert({
      user_id: user.id,
      image:   imageData,
      status:  'pending',
    })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Firma enviada')
    clearCanvas()
    onSaved?.()
  }

  return (
    <div>
      <p style={{ margin:'0 0 12px', fontSize:13, color:'var(--sat-dim)' }}>Dibuja tu firma en el área de abajo:</p>
      <div style={{ border:'1px solid var(--sat-border)', borderRadius:8, overflow:'hidden', marginBottom:14, background:'#07080d', cursor:'crosshair' }}>
        <canvas
          ref={canvasRef}
          width={600} height={200}
          style={{ display:'block', width:'100%', touchAction:'none' }}
          onMouseDown={startDraw}  onMouseMove={draw}  onMouseUp={endDraw}  onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw}  onTouchEnd={endDraw}
        />
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button className="sat-btn sat-btn-ghost" onClick={clearCanvas}>Limpiar</button>
        <button className="sat-btn sat-btn-primary" onClick={handleSubmit} disabled={submitting || !hasDrawn}>
          {submitting ? 'Enviando…' : 'Enviar firma'}
        </button>
      </div>
    </div>
  )
}

function HistorialTab({ firmas, loading, canApprove, onUpdateStatus }) {
  if (loading) return <p style={{ color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', fontSize:12 }}>CARGANDO…</p>
  if (!firmas.length) return <p style={{ color:'var(--sat-dim)', fontSize:13 }}>Sin firmas registradas</p>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {firmas.map(f => (
        <div key={f.id} className="sat-card" style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:500, color:'var(--sat-text)' }}>{f.profiles?.nombre ?? 'Desconocido'}</p>
            <p style={{ margin:'3px 0 0', fontSize:11, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace' }}>
              {new Date(f.created_at).toLocaleString('es-MX')}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {f.image && (
              <img src={f.image} alt="firma" style={{ height:40, borderRadius:4, border:'1px solid var(--sat-border)', background:'#07080d' }} />
            )}
            <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color: STATUS_COLORS[f.status] ?? 'var(--sat-dim)', background:`${STATUS_COLORS[f.status]}15`, border:`1px solid ${STATUS_COLORS[f.status]}30`, padding:'2px 8px', borderRadius:4 }}>
              {STATUS_LABELS[f.status] ?? f.status}
            </span>
            {canApprove && f.status === 'pending' && (
              <div style={{ display:'flex', gap:6 }}>
                <button className="sat-btn sat-btn-primary" style={{ padding:'4px 10px', fontSize:11 }} onClick={() => onUpdateStatus(f.id,'approved')}>✓</button>
                <button className="sat-btn sat-btn-danger"  style={{ padding:'4px 10px', fontSize:11 }} onClick={() => onUpdateStatus(f.id,'rejected')}>✗</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
