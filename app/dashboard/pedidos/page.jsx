'use client'
import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import AccessDenied from '@/components/ui/AccessDenied'
import PageHeader from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'

// Columnas que representan cantidades editables (se limpian tras pedido)
const COLS_PEDIDO = ['PEDIDO','CANTIDAD','CANT.','QTY','SOLICITADO','PIEZAS','KG','LT']

export default function PedidosPage() {
  const { user }    = useAuth()
  const perm        = usePermission('inventario')
  const fileRef     = useRef(null)

  const [tabla,     setTabla]     = useState(null)   // { headers, rows }
  const [original,  setOriginal]  = useState(null)   // copia sin modificar
  const [pedido,    setPedido]    = useState({})      // { rowIdx_colIdx: valor }
  const [fileName,  setFileName]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [notas,     setNotas]     = useState('')

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  // ── Cargar Excel ──────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setFileName(file.name)
    try {
      const XLSX   = (await import('xlsx')).default
      const buf    = await file.arrayBuffer()
      const wb     = XLSX.read(buf, { type:'array' })
      const ws     = wb.Sheets[wb.SheetNames[0]]
      const raw    = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' })
      const headers = raw[0] || []
      const rows    = raw.slice(1).filter(r => r.some(c => String(c).trim()))
      setTabla({ headers, rows })
      setOriginal({ headers, rows: rows.map(r=>[...r]) })
      setPedido({})
    } catch(err) {
      toast.error('Error al leer el archivo: ' + err.message)
    } finally {
      setLoading(false)
      fileRef.current.value = ''
    }
  }

  // ── Detectar cols editables ───────────────────────────────
  function isEditable(header) {
    const h = String(header).toUpperCase().trim()
    return COLS_PEDIDO.some(k => h.includes(k)) || h === ''
  }

  // ── Actualizar celda de pedido ────────────────────────────
  function setCelda(rowIdx, colIdx, valor) {
    setPedido(prev => ({ ...prev, [`${rowIdx}_${colIdx}`]: valor }))
  }

  function getCelda(rowIdx, colIdx) {
    return pedido[`${rowIdx}_${colIdx}`] ?? ''
  }

  // ── Limpiar pedido (restaurar columnas vacías) ────────────
  function limpiarPedido() {
    setPedido({})
    toast.success('Cantidades de pedido limpiadas')
  }

  // ── Generar PDF ───────────────────────────────────────────
  async function generarPDF() {
    if (!tabla) return
    setLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' })
      const PW=297, mg=10, rowH=8
      const colW = (PW - mg*2) / Math.max(tabla.headers.length, 1)

      // Header
      doc.setFillColor(7,8,13)
      doc.rect(0,0,PW,18,'F')
      doc.setTextColor(201,168,76)
      doc.setFontSize(13)
      doc.setFont('helvetica','bold')
      doc.text('ONOMURA · PEDIDO DE PRODUCTOS', mg, 12)
      doc.setFontSize(8)
      doc.setTextColor(120,100,60)
      doc.text(new Date().toLocaleString('es-MX'), PW-mg, 12, { align:'right' })

      // Columnas
      let y = 22
      doc.setFillColor(20,20,30)
      doc.rect(mg, y, PW-mg*2, rowH, 'F')
      doc.setTextColor(201,168,76)
      doc.setFontSize(7)
      doc.setFont('helvetica','bold')
      tabla.headers.forEach((h,i) => {
        doc.text(String(h).slice(0,18), mg + i*colW + 2, y + 5.5)
      })
      y += rowH

      // Filas
      tabla.rows.forEach((row, ri) => {
        if (y > 185) { doc.addPage(); y = 15 }
        doc.setFillColor(ri%2===0 ? 248 : 240, ri%2===0 ? 248 : 240, ri%2===0 ? 248 : 240)
        doc.rect(mg, y, PW-mg*2, rowH, 'F')
        doc.setTextColor(30,30,30)
        doc.setFontSize(7)
        doc.setFont('helvetica','normal')
        tabla.headers.forEach((h,ci) => {
          const val = isEditable(h)
            ? (getCelda(ri,ci) || '')
            : String(row[ci] ?? '')
          doc.text(String(val).slice(0,18), mg + ci*colW + 2, y + 5.5)
        })
        y += rowH
      })

      // Notas
      if (notas.trim()) {
        y += 4
        doc.setTextColor(80,80,100)
        doc.setFontSize(8)
        doc.text('Notas: ' + notas, mg, y)
      }

      // Footer
      doc.setFillColor(7,8,13)
      doc.rect(0,197,PW,13,'F')
      doc.setTextColor(100,85,50)
      doc.setFontSize(6)
      doc.text('ONOMURA SATÉLITE · PEDIDO CONFIDENCIAL · ' + new Date().toLocaleDateString('es-MX'), mg, 205)

      doc.save(`pedido-onomura-${new Date().toISOString().slice(0,10)}.pdf`)
      toast.success('PDF generado')
    } catch(err) {
      toast.error('Error al generar PDF: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Guardar pedido en BD ──────────────────────────────────
  async function guardarPedido() {
    if (!tabla) return
    const items = tabla.rows.map((row, ri) => {
      const obj = {}
      tabla.headers.forEach((h,ci) => {
        obj[String(h)] = isEditable(h) ? getCelda(ri,ci) : row[ci]
      })
      return obj
    }).filter(obj => Object.values(obj).some(v => String(v).trim()))

    try {
      const res  = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ items, notas }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Pedido guardado')
      limpiarPedido()
    } catch(err) {
      toast.error(err.message)
    }
  }

  return (
    <div style={{ padding:'24px 16px', maxWidth:1200 }}>
      <PageHeader
        title="Pedido de Productos"
        subtitle="Carga tu Excel, llena las cantidades y descarga en PDF"
        actions={
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <label htmlFor="excel-pedido" className="sat-btn sat-btn-ghost" style={{ cursor:'pointer' }}>
              📂 Cargar Excel
            </label>
            <input ref={fileRef} id="excel-pedido" type="file" accept=".xlsx,.xls,.csv"
              style={{ display:'none' }} onChange={handleFile} />
            {tabla && (
              <>
                <button className="sat-btn sat-btn-ghost" onClick={limpiarPedido}>🗑 Limpiar cantidades</button>
                <button className="sat-btn sat-btn-ghost" onClick={guardarPedido}>💾 Guardar</button>
                <button className="sat-btn sat-btn-primary" onClick={generarPDF} disabled={loading}>
                  {loading ? 'Generando…' : '⬇ PDF'}
                </button>
              </>
            )}
          </div>
        }
      />

      {fileName && (
        <p style={{ fontSize:12, color:'var(--sat-dim)', marginBottom:16, fontFamily:'DM Mono,monospace' }}>
          📄 {fileName}
        </p>
      )}

      {!tabla && (
        <div className="sat-card" style={{ padding:40, textAlign:'center' }}>
          <p style={{ fontSize:36, marginBottom:12 }}>📊</p>
          <p style={{ color:'var(--sat-dim)', fontSize:14 }}>
            Carga un archivo Excel (.xlsx) para comenzar
          </p>
          <p style={{ color:'var(--sat-dim)', fontSize:12, marginTop:6 }}>
            El archivo no se modifica — solo se leen sus datos
          </p>
        </div>
      )}

      {tabla && (
        <>
          <div style={{ overflowX:'auto', marginBottom:16 }}>
            <table style={{ borderCollapse:'collapse', width:'100%', minWidth:600 }}>
              <thead>
                <tr>
                  {tabla.headers.map((h,i) => (
                    <th key={i} style={{
                      padding:'8px 10px', textAlign:'left', fontSize:11,
                      fontFamily:'DM Mono,monospace', color: isEditable(h) ? 'var(--sat-accent)' : 'var(--sat-dim)',
                      background:'var(--sat-surface)', borderBottom:'1px solid var(--sat-border)',
                      letterSpacing:'0.06em', textTransform:'uppercase', whiteSpace:'nowrap',
                    }}>
                      {String(h)} {isEditable(h) && <span style={{ fontSize:9, color:'var(--sat-accent)' }}>✎</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabla.rows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom:'1px solid var(--sat-border)', background: ri%2===0?'var(--sat-surface)':'var(--sat-bg)' }}>
                    {tabla.headers.map((h,ci) => (
                      <td key={ci} style={{ padding:'4px 6px' }}>
                        {isEditable(h) ? (
                          <input
                            value={getCelda(ri,ci)}
                            onChange={e => setCelda(ri,ci,e.target.value)}
                            placeholder="—"
                            style={{
                              background:'var(--sat-bg)', border:'1px solid var(--sat-border)',
                              borderRadius:4, color:'var(--sat-accent)', padding:'4px 8px',
                              fontSize:13, fontFamily:'DM Mono,monospace', width:'100%',
                              outline:'none', minWidth:80,
                            }}
                            onFocus={e=>e.target.style.borderColor='var(--sat-accent)'}
                            onBlur={e=>e.target.style.borderColor='var(--sat-border)'}
                          />
                        ) : (
                          <span style={{ fontSize:13, color:'var(--sat-text)', padding:'0 4px' }}>
                            {String(row[ci] ?? '')}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notas */}
          <div style={{ marginTop:8 }}>
            <label className="sat-label">Notas del pedido</label>
            <textarea className="sat-input" rows={2} value={notas}
              onChange={e=>setNotas(e.target.value)} placeholder="Observaciones, urgencias…"
              style={{ resize:'vertical' }} />
          </div>
        </>
      )}
    </div>
  )
}
