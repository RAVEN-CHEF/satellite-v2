'use client'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { supabase } from '@/lib/supabaseClient'
import PageHeader from '@/components/ui/PageHeader'
import AccessDenied from '@/components/ui/AccessDenied'
import toast from 'react-hot-toast'

function toCSV(rows, cols) {
  const header = cols.join(',')
  const body   = rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  return `${header}\n${body}`
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type:'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportesPage() {
  const perm    = usePermission('reportes')
  const [activeReport, setActiveReport] = useState(null)
  const [range, setRange]               = useState(30)

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  const REPORTS = [
    { id:'checkins',   label:'Check-ins',          icon:'📍', desc:'Historial de asistencias' },
    { id:'firmas',     label:'Firmas',              icon:'✍️', desc:'Registro de firmas digitales' },
    { id:'inventario', label:'Inventario',          icon:'📦', desc:'Estado actual del stock' },
    { id:'recetas',    label:'Recetas',             icon:'📖', desc:'Listado completo de recetas' },
  ]

  return (
    <div style={{ padding:'32px 24px', maxWidth:1000 }}>
      <PageHeader title="Reportes" subtitle="Exportar datos operativos" />

      {/* Selector de rango */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <label className="sat-label" style={{ margin:0, whiteSpace:'nowrap' }}>Últimos días:</label>
        <select className="sat-input" style={{ maxWidth:120 }} value={range} onChange={e => setRange(Number(e.target.value))}>
          {[7,14,30,60,90].map(n => <option key={n} value={n}>{n} días</option>)}
        </select>
      </div>

      {/* Cards de reportes */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14, marginBottom:32 }}>
        {REPORTS.map(r => (
          <div key={r.id} className="sat-card" style={{ padding:20, cursor:'pointer', borderColor: activeReport===r.id ? 'var(--sat-accent)' : undefined, background: activeReport===r.id ? '#00e5a008' : undefined }}
            onClick={() => setActiveReport(activeReport===r.id ? null : r.id)}>
            <div style={{ fontSize:24, marginBottom:10 }}>{r.icon}</div>
            <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:500, color:'var(--sat-text)' }}>{r.label}</p>
            <p style={{ margin:0, fontSize:12, color:'var(--sat-dim)' }}>{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Panel del reporte seleccionado */}
      {activeReport && (
        <ReportPanel type={activeReport} rangeDays={range} canDownload={perm.download || perm.isRaven || perm.isAdmin} />
      )}
    </div>
  )
}

function ReportPanel({ type, rangeDays, canDownload }) {
  const since = new Date(Date.now() - rangeDays * 86400000).toISOString()

  const queryMap = {
    checkins:   () => supabase.from('checkins').select('created_at,gps,status,profiles(nombre)').gte('created_at', since).order('created_at', { ascending:false }),
    firmas:     () => supabase.from('signatures').select('created_at,status,profiles(nombre)').gte('created_at', since).order('created_at', { ascending:false }),
    inventario: () => supabase.from('inventory').select('ingrediente,stock,unit,updated_at').order('ingrediente'),
    recetas:    () => supabase.from('recetas').select('nombre,categoria,created_at').order('nombre'),
  }

  const colsMap = {
    checkins:   ['nombre','gps','status','created_at'],
    firmas:     ['nombre','status','created_at'],
    inventario: ['ingrediente','stock','unit','updated_at'],
    recetas:    ['nombre','categoria','created_at'],
  }

  const { data, loading } = useSupabaseQuery(queryMap[type], [type, rangeDays])

  const rows = (data ?? []).map(r => {
    if (type === 'checkins') return { nombre: r.profiles?.nombre ?? '', gps: r.gps ?? '', status: r.status, created_at: r.created_at }
    if (type === 'firmas')   return { nombre: r.profiles?.nombre ?? '', status: r.status, created_at: r.created_at }
    return r
  })

  function handleDownload() {
    downloadCSV(toCSV(rows, colsMap[type]), `satellite_${type}_${new Date().toISOString().slice(0,10)}.csv`)
    toast.success('CSV descargado')
  }

  const HEADERS = {
    checkins:   ['Empleado','GPS','Estado','Fecha'],
    firmas:     ['Empleado','Estado','Fecha'],
    inventario: ['Ingrediente','Stock','Unidad','Actualizado'],
    recetas:    ['Nombre','Categoría','Creado'],
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <p style={{ margin:0, fontSize:13, color:'var(--sat-dim)' }}>
          {loading ? 'Cargando…' : `${rows.length} registros`}
        </p>
        {canDownload && !loading && rows.length > 0 && (
          <button className="sat-btn sat-btn-primary" onClick={handleDownload}>⬇ Descargar CSV</button>
        )}
      </div>

      {!loading && rows.length > 0 && (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {HEADERS[type].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, fontFamily:'DM Mono,monospace', color:'var(--sat-dim)', letterSpacing:'0.08em', textTransform:'uppercase', borderBottom:'1px solid var(--sat-border)', background:'var(--sat-surface)', whiteSpace:'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r, i) => (
                <tr key={i} style={{ borderBottom:'1px solid var(--sat-border)' }}>
                  {colsMap[type].map(col => (
                    <td key={col} style={{ padding:'8px 12px', fontSize:12, color:'var(--sat-text)', fontFamily: col==='created_at'||col==='updated_at' ? 'DM Mono,monospace' : 'inherit', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {col.includes('_at') ? new Date(r[col]).toLocaleString('es-MX') : (String(r[col] ?? '—'))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 100 && <p style={{ margin:'8px 0 0', fontSize:12, color:'var(--sat-dim)' }}>Mostrando 100 de {rows.length}. Descarga el CSV para ver todo.</p>}
        </div>
      )}
    </div>
  )
}
