'use client'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { supabase } from '@/lib/supabaseClient'
import { isRaven } from '@/lib/permissions'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import AccessDenied from '@/components/ui/AccessDenied'
import toast from 'react-hot-toast'

function toCSV(rows, cols) {
  const header = cols.join(',')
  const body   = rows.map(r => cols.map(c => `"${String(r[c]??'').replace(/"/g,'""')}"`).join(',')).join('\n')
  return `${header}\n${body}`
}
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type:'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href=url; a.download=filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ReportesPage() {
  const { user }  = useAuth()
  const perm      = usePermission('reportes')
  const ravenUser = isRaven(user)
  const [activeReport, setActiveReport] = useState(null)
  const [range, setRange]               = useState(30)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkForm, setLinkForm] = useState({ titulo:'', descripcion:'', contenido:'', horas:72 })
  const [linkGenerado, setLinkGenerado] = useState(null)
  const [generando, setGenerando] = useState(false)

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  async function generarLink() {
    if (!linkForm.titulo.trim()) { toast.error('Título obligatorio'); return }
    setGenerando(true)
    try {
      const res  = await fetch('/api/generate-link', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ ...linkForm, horas_expira: linkForm.horas }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setLinkGenerado(json.url)
      toast.success('Link generado')
    } catch(err) {
      toast.error(err.message)
    } finally {
      setGenerando(false)
    }
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkGenerado)
    toast.success('Link copiado')
  }

  function compartirWhatsApp() {
    const msg = encodeURIComponent(`ONOMURA · Documento para firma:\n${linkGenerado}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  const REPORTS = [
    { id:'checkins',   label:'Check-ins',  icon:'📍', desc:'Historial de asistencias' },
    { id:'firmas',     label:'Firmas',     icon:'✍️', desc:'Registro de firmas digitales' },
    { id:'inventario', label:'Inventario', icon:'📦', desc:'Estado actual del stock' },
    { id:'recetas',    label:'Recetas',    icon:'📖', desc:'Listado de recetas' },
    { id:'pedidos',    label:'Pedidos',    icon:'🛒', desc:'Historial de pedidos' },
  ]

  return (
    <div style={{ padding:'32px 24px', maxWidth:1000 }}>
      <PageHeader
        title="Reportes"
        subtitle="Exportar datos operativos"
        actions={ravenUser && (
          <button className="sat-btn sat-btn-primary" onClick={() => { setShowLinkModal(true); setLinkGenerado(null) }}>
            🔗 Generar link de validación
          </button>
        )}
      />

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <label className="sat-label" style={{ margin:0, whiteSpace:'nowrap' }}>Últimos días:</label>
        <select className="sat-input" style={{ maxWidth:120 }} value={range} onChange={e=>setRange(Number(e.target.value))}>
          {[7,14,30,60,90].map(n=><option key={n} value={n}>{n} días</option>)}
        </select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:28 }}>
        {REPORTS.map(r => (
          <div key={r.id} className="sat-card" style={{ padding:18, cursor:'pointer',
            borderColor: activeReport===r.id?'var(--sat-accent)':undefined,
            background: activeReport===r.id?'#00e5a008':undefined }}
            onClick={()=>setActiveReport(activeReport===r.id?null:r.id)}>
            <div style={{ fontSize:22, marginBottom:8 }}>{r.icon}</div>
            <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:500, color:'var(--sat-text)' }}>{r.label}</p>
            <p style={{ margin:0, fontSize:12, color:'var(--sat-dim)' }}>{r.desc}</p>
          </div>
        ))}
      </div>

      {activeReport && <ReportPanel type={activeReport} rangeDays={range} canDownload={perm.download||ravenUser||perm.isAdmin} />}

      {/* Modal Link de Validación */}
      <Modal open={showLinkModal} onClose={()=>setShowLinkModal(false)} title="Generar link de validación" width={500}>
        {!linkGenerado ? (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="sat-label">Título del documento</label>
              <input className="sat-input" value={linkForm.titulo} onChange={e=>setLinkForm(f=>({...f,titulo:e.target.value}))} placeholder="Ej: Acuerdo de turno Mayo" />
            </div>
            <div>
              <label className="sat-label">Descripción (opcional)</label>
              <input className="sat-input" value={linkForm.descripcion} onChange={e=>setLinkForm(f=>({...f,descripcion:e.target.value}))} placeholder="Descripción breve" />
            </div>
            <div>
              <label className="sat-label">Contenido del documento</label>
              <textarea className="sat-input" rows={5} value={linkForm.contenido}
                onChange={e=>setLinkForm(f=>({...f,contenido:e.target.value}))}
                placeholder="Texto del documento que deberá revisar y firmar el empleado…"
                style={{ resize:'vertical' }} />
            </div>
            <div>
              <label className="sat-label">Expira en (horas)</label>
              <select className="sat-input" value={linkForm.horas} onChange={e=>setLinkForm(f=>({...f,horas:Number(e.target.value)}))}>
                {[24,48,72,168].map(h=><option key={h} value={h}>{h}h ({Math.round(h/24)} día{h>=48?'s':''})</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="sat-btn sat-btn-ghost" onClick={()=>setShowLinkModal(false)}>Cancelar</button>
              <button className="sat-btn sat-btn-primary" onClick={generarLink} disabled={generando}>
                {generando ? 'Generando…' : '🔗 Generar link'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:36, margin:'0 0 12px' }}>✅</p>
            <p style={{ fontWeight:600, color:'var(--sat-text)', marginBottom:8 }}>Link generado</p>
            <div style={{ background:'var(--sat-bg)', border:'1px solid var(--sat-border)', borderRadius:8, padding:12, marginBottom:16, wordBreak:'break-all', fontSize:12, color:'var(--sat-accent)', fontFamily:'DM Mono,monospace' }}>
              {linkGenerado}
            </div>
            <p style={{ fontSize:12, color:'var(--sat-dim)', marginBottom:16 }}>
              De un solo uso · Expira en {linkForm.horas}h · Solo visible para quien tenga el link
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="sat-btn sat-btn-ghost" onClick={copiarLink}>📋 Copiar</button>
              <button className="sat-btn sat-btn-primary" onClick={compartirWhatsApp}>
                📱 Compartir por WhatsApp
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ReportPanel({ type, rangeDays, canDownload }) {
  const since = new Date(Date.now() - rangeDays*86400000).toISOString()

  const queryMap = {
    checkins:   () => supabase.from('checkins').select('created_at,gps,status,profiles(nombre)').gte('created_at',since).order('created_at',{ascending:false}),
    firmas:     () => supabase.from('signatures').select('created_at,status,profiles(nombre)').gte('created_at',since).order('created_at',{ascending:false}),
    inventario: () => supabase.from('inventory').select('ingrediente,stock,unit,updated_at').order('ingrediente'),
    recetas:    () => supabase.from('recetas').select('nombre,categoria,created_at').order('nombre'),
    pedidos:    () => supabase.from('pedidos').select('created_at,notas,items').gte('created_at',since).order('created_at',{ascending:false}),
  }
  const colsMap = {
    checkins:   ['nombre','gps','status','created_at'],
    firmas:     ['nombre','status','created_at'],
    inventario: ['ingrediente','stock','unit','updated_at'],
    recetas:    ['nombre','categoria','created_at'],
    pedidos:    ['created_at','notas'],
  }
  const HEADERS = {
    checkins:   ['Empleado','GPS','Estado','Fecha'],
    firmas:     ['Empleado','Estado','Fecha'],
    inventario: ['Ingrediente','Stock','Unidad','Actualizado'],
    recetas:    ['Nombre','Categoría','Creado'],
    pedidos:    ['Fecha','Notas'],
  }

  const { data, loading } = useSupabaseQuery(queryMap[type], [type, rangeDays])

  const rows = (data??[]).map(r => {
    if (type==='checkins') return { nombre:r.profiles?.nombre??'', gps:r.gps??'', status:r.status, created_at:r.created_at }
    if (type==='firmas')   return { nombre:r.profiles?.nombre??'', status:r.status, created_at:r.created_at }
    if (type==='pedidos')  return { created_at:r.created_at, notas:r.notas??'' }
    return r
  })

  function handleDownload() {
    downloadCSV(toCSV(rows, colsMap[type]), `satellite_${type}_${new Date().toISOString().slice(0,10)}.csv`)
    toast.success('CSV descargado')
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <p style={{ margin:0, fontSize:13, color:'var(--sat-dim)' }}>
          {loading ? 'Cargando…' : `${rows.length} registros`}
        </p>
        {canDownload && !loading && rows.length>0 && (
          <button className="sat-btn sat-btn-primary" onClick={handleDownload}>⬇ CSV</button>
        )}
      </div>
      {!loading && rows.length>0 && (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {HEADERS[type].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, fontFamily:'DM Mono,monospace', color:'var(--sat-dim)', background:'var(--sat-surface)', borderBottom:'1px solid var(--sat-border)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0,100).map((r,i)=>(
                <tr key={i} style={{ borderBottom:'1px solid var(--sat-border)' }}>
                  {colsMap[type].map(col=>(
                    <td key={col} style={{ padding:'8px 12px', fontSize:12, color:'var(--sat-text)', fontFamily:col.includes('_at')?'DM Mono,monospace':'inherit', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {col.includes('_at') ? new Date(r[col]).toLocaleString('es-MX') : String(r[col]??'—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
