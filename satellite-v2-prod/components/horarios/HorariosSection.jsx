'use client'
import { useState, useEffect, useCallback, useRef } from 'react'


// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY   = 'satellite_v2_horarios_grid'

const PUESTOS       = ['CHEF','SOUS CHEF','SUSHERO A','SUSHERO B','AYUDANTE']
const HORAS_ENTRADA = ['8:00 AM','9:00 AM','11:00 AM','12:00 PM','12:30 PM','12:45 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM']
const HORAS_SALIDA  = ['5:00 PM','6:00 PM','7:00 PM','9:00 PM','10:00 PM','CIERRE']
const TODOS_ESTADOS = ['ACTIVO','DESCANSO','INVENTARIO','PSG','VACACIONES','APOYO','CURSO','PRESENTACIÓN','REUNIÓN','INCAPACIDAD','FESTIVO']
const ESTADOS_BLOQUEO = ['DESCANSO','INVENTARIO','PSG','VACACIONES','APOYO','CURSO','PRESENTACIÓN','REUNIÓN','INCAPACIDAD']
const OBS_RAPIDAS   = ['LIMPIEZA PROFUNDA','RONQUEO','OMAKASE']
const DIAS_SEMANA   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const MESES         = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// Paleta de estados — más sofisticada
const ESTADO_COLOR = {
  ACTIVO:       { border:'#34d399', bg:'#34d39908', text:'#34d399' },
  DESCANSO:     { border:'#64748b', bg:'#64748b0d', text:'#94a3b8' },
  INVENTARIO:   { border:'#60a5fa', bg:'#60a5fa0d', text:'#60a5fa' },
  PSG:          { border:'#a78bfa', bg:'#a78bfa0d', text:'#a78bfa' },
  VACACIONES:   { border:'#c9a84c', bg:'#c9a84c0d', text:'#c9a84c' },
  APOYO:        { border:'#fb923c', bg:'#fb923c0d', text:'#fb923c' },
  CURSO:        { border:'#22d3ee', bg:'#22d3ee0d', text:'#22d3ee' },
  PRESENTACIÓN: { border:'#f472b6', bg:'#f472b60d', text:'#f472b6' },
  REUNIÓN:      { border:'#818cf8', bg:'#818cf80d', text:'#818cf8' },
  INCAPACIDAD:  { border:'#f87171', bg:'#f871710d', text:'#f87171' },
  FESTIVO:      { border:'#fbbf24', bg:'#fbbf240d', text:'#fbbf24' },
}
const OBS_COLOR = {
  'LIMPIEZA PROFUNDA': '#60a5fa',
  'RONQUEO':           '#fb923c',
  'OMAKASE':           '#a78bfa',
}
  const ESTADO_RGB = {
  DESCANSO:[130,130,130], INVENTARIO:[59,130,246], PSG:[139,92,246],
  VACACIONES:[202,165,30], APOYO:[234,115,20], CURSO:[6,182,212],
  PRESENTACIÓN:[236,72,153], REUNIÓN:[99,102,241], INCAPACIDAD:[220,38,38], FESTIVO:[251,191,36],
}
const OBS_RGB = {
  'LIMPIEZA PROFUNDA':[59,130,246], 'RONQUEO':[234,115,20], 'OMAKASE':[139,92,246],
}

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════
function getLunes(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  date.setHours(0,0,0,0)
  return date
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d }
function toKey(date)      { return date.toISOString().slice(0,10) }
function fmtFecha(date)   { return `${date.getDate().toString().padStart(2,'0')} ${MESES[date.getMonth()]} ${date.getFullYear()}` }
function fmtFechaPDF(date){ return `${date.getDate().toString().padStart(2,'0')}/${MESES[date.getMonth()]}/${date.getFullYear()}` }
function getWeekDays(lunes){ return Array.from({length:7},(_,i)=>addDays(lunes,i)) }

function hexToRgb(hex) {
  if (!hex || hex.length < 7) return [128,128,128]
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
}
function parseHora(t) {
  if (!t || t === 'CIERRE') return null
  const [time, mer] = t.split(' ')
  let [h,m] = time.split(':').map(Number)
  if (mer === 'PM' && h !== 12) h += 12
  if (mer === 'AM' && h === 12) h = 0
  return h * 60 + (m||0)
}

// ═══════════════════════════════════════════════════════════════
// PERSISTENCIA
// ═══════════════════════════════════════════════════════════════
const loadAll  = ()     => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} } }
const saveAll  = d      => localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
const loadWeek = wk     => loadAll()[wk] ?? { empleados:[] }
const saveWeek = (wk,d) => { const all=loadAll(); all[wk]=d; saveAll(all) }

function emptyDia(fecha) {
  const d = new Date(fecha+'T12:00:00')
  const obs = (d.getDay()===3 || d.getDay()===0) ? 'LIMPIEZA PROFUNDA' : ''
  return { entrada:'', salida:'', estado:'', observacion:obs }
}
function emptyEmpleado(id, dias) {
  const diasObj = {}
  dias.forEach(d => { diasObj[toKey(d)] = emptyDia(toKey(d)) })
  return { id, nombre:'', puesto:'CHEF', dias:diasObj }
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function HorariosSection({ userEmail='', userRole='empleado', userId='' }) {
  const isRaven = userRole === 'raven'
  const isAdmin = isRaven || userRole === 'admin'

  const [lunes,     setLunes]     = useState(() => getLunes())
  const [semana,    setSemana]    = useState({ empleados:[] })
  const [modoVer,   setModoVer]   = useState(false)
  const [activeTab, setActiveTab] = useState('grid')
  const [dragging,  setDragging]  = useState(null)
  const [obsModal,  setObsModal]  = useState(null)

  const wk  = toKey(lunes)
  const dias = getWeekDays(lunes)

  // ── Cargar semana ──────────────────────────────────────────
  useEffect(() => {
    const data = loadWeek(wk)
    if (data.empleados.length > 0) {
      const filled = {
        ...data,
        empleados: data.empleados.map(e => ({
          ...e,
          dias: Object.fromEntries(dias.map(d => {
            const k = toKey(d)
            return [k, e.dias?.[k] ?? emptyDia(k)]
          }))
        }))
      }
      setSemana(filled)
    } else {
      const prevLunes = addDays(lunes, -7)
      const prev = loadWeek(toKey(prevLunes))
      if (prev.empleados.length > 0) {
        const copia = {
          empleados: prev.empleados.map(e => ({
            ...e,
            dias: Object.fromEntries(dias.map((d,i) => {
              const prevKey = toKey(addDays(prevLunes, i))
              const src = e.dias?.[prevKey] ?? emptyDia(toKey(d))
              return [toKey(d), { ...src }]
            }))
          }))
        }
        setSemana(copia)
      } else {
        setSemana({ empleados:[] })
      }
    }
  }, [wk])

  const wkRef = useRef(wk)
  useEffect(() => { wkRef.current = wk }, [wk])

  const persist = useCallback((data) => {
    saveWeek(wkRef.current, data)
    setSemana({ ...data })
  }, [])


  // ── Navegación ─────────────────────────────────────────────
  const prevSem = () => setLunes(l => addDays(l,-7))
  const nextSem = () => setLunes(l => addDays(l, 7))
  const hoySem  = () => setLunes(getLunes())

  // ── Empleados ──────────────────────────────────────────────
  function addEmpleado() {
    const nextId = semana.empleados.length > 0 ? Math.max(...semana.empleados.map(e=>e.id))+1 : 1
    persist({ ...semana, empleados:[...semana.empleados, emptyEmpleado(nextId, dias)] })
  }
  function removeEmpleado(id) {
    if (!confirm('¿Eliminar empleado del horario?')) return
    persist({ ...semana, empleados: semana.empleados.filter(e=>e.id!==id) })
  }
  function updEmp(id, field, value) {
    persist({ ...semana, empleados: semana.empleados.map(e =>
      e.id===id ? { ...e, [field]: typeof value==='string' ? value.toUpperCase() : value } : e
    )})
  }
  function updDia(empId, diaKey, field, value) {
    persist({ ...semana, empleados: semana.empleados.map(e => {
      if (e.id !== empId) return e
      const cur = e.dias[diaKey] ?? emptyDia(diaKey)
      const upd = { ...cur, [field]: value }
      if (field==='estado' && ESTADOS_BLOQUEO.includes(value)) upd.salida = ''
      return { ...e, dias:{ ...e.dias, [diaKey]:upd } }
    })})
  }
  function aplicarSemana(empId, campo, valor) {
    persist({ ...semana, empleados: semana.empleados.map(e => {
      if (e.id!==empId) return e
      const newDias = {}
      dias.forEach(d => {
        const k = toKey(d)
        newDias[k] = { ...(e.dias[k]??emptyDia(k)), [campo]:valor }
      })
      return { ...e, dias:newDias }
    })})
  }
  function aplicarObsTodos(diaKey, obs) {
    persist({ ...semana, empleados: semana.empleados.map(e => ({
      ...e,
      dias:{ ...e.dias, [diaKey]:{ ...(e.dias[diaKey]??emptyDia(diaKey)), observacion:obs } }
    }))})
    setObsModal(null)
  }

  // ── Drag & drop ────────────────────────────────────────────
  function onDrop(targetId) {
    if (!dragging || dragging===targetId) { setDragging(null); return }
    const emps = [...semana.empleados]
    const fi = emps.findIndex(e=>e.id===dragging)
    const ti = emps.findIndex(e=>e.id===targetId)
    const [m] = emps.splice(fi,1)
    emps.splice(ti,0,m)
    persist({ ...semana, empleados:emps })
    setDragging(null)
  }

  // ── Horas totales (solo para panel) ───────────────────────
  function horasTotales(emp) {
    let total = 0
    dias.forEach(d => {
      const dia = emp.dias[toKey(d)]
      if (!dia?.entrada || !dia?.salida) return
      const e = parseHora(dia.entrada), s = parseHora(dia.salida)
      if (e && s && s>e) total += s-e
    })
    if (!total) return '—'
    return `${Math.floor(total/60)}h${total%60>0?`${total%60}m`:''}`
  }

  // ── Cobertura (solo para panel) ────────────────────────────
  function cobertura(diaKey) {
    return semana.empleados.filter(e => {
      const dia = e.dias[diaKey]
      return dia && !['DESCANSO','VACACIONES','INCAPACIDAD'].includes(dia.estado)
    }).length
  }

  // ── PDF ────────────────────────────────────────────────────
  // Sin columna de horas, sin semáforo de cobertura
   
             async function descargarPDF() {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' })
    const PW=297, PH=210, mg=8
    const nEmps = semana.empleados.length
    const rowH  = Math.min(26, Math.max(14, (PH-52) / Math.max(nEmps,1)))

    const cNom=38, cPto=22, cHrs=14
    const cDia=(PW-mg*2-cNom-cPto-cHrs)/7

    // ── HEADER ──
    doc.setFillColor(18,16,22)
    doc.rect(0,0,PW,20,'F')
    doc.setDrawColor(180,140,40)
    doc.setLineWidth(0.6)
    doc.line(0,20,PW,20)

    doc.setTextColor(210,168,50)
    doc.setFontSize(14)
    doc.setFont('helvetica','bold')
    doc.text('ONOMURA SATÉLITE', mg+2, 13)

    doc.setFontSize(8)
    doc.setFont('helvetica','normal')
    doc.setTextColor(180,160,110)
    doc.text(`${fmtFechaPDF(dias[0])}  —  ${fmtFechaPDF(dias[6])}`, PW-mg, 13, {align:'right'})

    // ── SUB-HEADER DÍAS ──
    const hY=22
    doc.setFillColor(28,24,34)
    doc.rect(mg,hY,PW-mg*2,10,'F')

    // Cabecera empleado
    doc.setTextColor(210,168,50)
    doc.setFontSize(7)
    doc.setFont('helvetica','bold')
    doc.text('EMPLEADO', mg+(cNom+cPto)/2, hY+6.5, {align:'center'})

    // Cabecera días
    let x=mg+cNom+cPto
    dias.forEach((d,i)=>{
      doc.setTextColor(210,168,50)
      doc.setFontSize(7.5)
      doc.setFont('helvetica','bold')
      doc.text(DIAS_SEMANA[i], x+cDia/2, hY+4.5, {align:'center'})
      doc.setTextColor(150,130,90)
      doc.setFontSize(5.5)
      doc.setFont('helvetica','normal')
      doc.text(`${d.getDate()}/${MESES[d.getMonth()]}`, x+cDia/2, hY+8.5, {align:'center'})
      doc.setDrawColor(60,55,70)
      doc.setLineWidth(0.2)
      if(i>0) doc.line(x,hY,x,hY+10)
      x+=cDia
    })
    doc.setTextColor(210,168,50)
    doc.setFontSize(7)
    doc.setFont('helvetica','bold')
    doc.text('HRS', x+cHrs/2, hY+6.5, {align:'center'})

    let y=hY+10

    // ── FILAS ──
    semana.empleados.forEach((emp,ei)=>{
      const bg = ei%2===0 ? [255,253,248] : [244,240,232]
      doc.setFillColor(...bg)
      doc.rect(mg,y,PW-mg*2,rowH,'F')

      // Borde dorado izquierdo
      doc.setFillColor(180,140,40)
      doc.rect(mg,y,1.5,rowH,'F')

      // Número
      doc.setTextColor(160,130,60)
      doc.setFontSize(7)
      doc.setFont('helvetica','bold')
      doc.text(`${ei+1}`, mg+5.5, y+rowH*0.48, {align:'center'})

      // Nombre — centrado
      doc.setTextColor(18,16,22)
      doc.setFontSize(7.5)
      doc.setFont('helvetica','bold')
      doc.text(emp.nombre||'—', mg+1.5+cNom/2, y+rowH*0.37, {align:'center'})

      // Puesto
      doc.setFont('helvetica','normal')
      doc.setFontSize(5.8)
      doc.setTextColor(100,85,55)
      doc.text(emp.puesto, mg+1.5+cNom/2, y+rowH*0.67, {align:'center'})

      // ── Celdas días ──
      x=mg+cNom+cPto
      dias.forEach(d=>{
        const key=toKey(d)
        const dia=emp.dias[key]??emptyDia(key)
        const bloq=ESTADOS_BLOQUEO.includes(dia.estado)
        const stRgb=ESTADO_RGB[dia.estado]
        const obsRgb=OBS_RGB[dia.observacion]

        // Fondo coloreado si hay estado
        if(stRgb){
          doc.setFillColor(
            Math.round(bg[0]*0.78+stRgb[0]*0.22),
            Math.round(bg[1]*0.78+stRgb[1]*0.22),
            Math.round(bg[2]*0.78+stRgb[2]*0.22)
          )
          doc.rect(x+0.3,y+0.3,cDia-0.6,rowH-0.6,'F')
          doc.setDrawColor(...stRgb)
          doc.setLineWidth(0.8)
          doc.rect(x+0.3,y+0.3,cDia-0.6,rowH-0.6)
          doc.setLineWidth(0.2)
        }

        if(bloq&&stRgb){
          doc.setTextColor(...stRgb)
          doc.setFontSize(6.5)
          doc.setFont('helvetica','bold')
          doc.text(dia.estado, x+cDia/2, y+rowH/2+1.5, {align:'center'})
        } else {
          if(dia.entrada){
            doc.setTextColor(20,115,70)
            doc.setFontSize(6.5)
            doc.setFont('helvetica','bold')
            doc.text(dia.entrada, x+cDia/2, y+rowH*0.3, {align:'center'})
          }
          if(dia.salida){
            doc.setTextColor(95,55,175)
            doc.setFontSize(6.5)
            doc.setFont('helvetica','bold')
            doc.text(dia.salida, x+cDia/2, y+rowH*0.58, {align:'center'})
          }
          if(dia.observacion){
            const rgb=obsRgb??[80,80,200]
            doc.setTextColor(...rgb)
            doc.setFontSize(5)
            doc.setFont('helvetica','normal')
            doc.text(dia.observacion.slice(0,14), x+cDia/2, y+rowH*0.86, {align:'center'})
          }
        }

        // Línea vertical entre celdas
        doc.setDrawColor(200,190,170)
        doc.setLineWidth(0.15)
        doc.line(x,y,x,y+rowH)
        x+=cDia
      })

      // Horas totales
      doc.setTextColor(20,115,70)
      doc.setFontSize(6.5)
      doc.setFont('helvetica','bold')
      doc.text(horasTotales(emp), x+cHrs/2, y+rowH/2+1.5, {align:'center'})

      // Línea horizontal entre filas
      doc.setDrawColor(200,190,170)
      doc.setLineWidth(0.2)
      doc.line(mg,y+rowH,PW-mg,y+rowH)
      y+=rowH
    })

    // Borde exterior tabla
    doc.setDrawColor(180,140,40)
    doc.setLineWidth(0.5)
    doc.rect(mg,hY,PW-mg*2,y-hY)

    // ── FOOTER ──
    doc.setFillColor(18,16,22)
    doc.rect(0,PH-9,PW,9,'F')
    doc.setDrawColor(180,140,40)
    doc.setLineWidth(0.4)
    doc.line(0,PH-9,PW,PH-9)
    doc.setTextColor(120,100,60)
    doc.setFontSize(5.5)
    doc.setFont('helvetica','normal')
    doc.text('ONOMURA SATÉLITE · Sistema de Horarios · CONFIDENCIAL', mg, PH-3.5)
    doc.text(new Date().toLocaleString('es-MX'), PW-mg, PH-3.5, {align:'right'})

    doc.save(`horario-onomura-${wk}.pdf`)
  }


  // ── Historial ─────────────────────────────────────────────
  const historial = Object.keys(loadAll()).filter(k=>k!==wk).sort().reverse().slice(0,10)

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{
      background:'#06070c',
      minHeight:'100vh',
      fontFamily:"'IBM Plex Sans',-apple-system,sans-serif",
      color:'#cbd5e1',
    }}>

      {/* ── TOPBAR ── */}
      <div style={{
        background:'linear-gradient(180deg,#0a0a0f 0%,#07080d 100%)',
        borderBottom:'1px solid #c9a84c22',
        padding:'14px 18px 0',
        boxShadow:'0 1px 20px #00000060',
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:12 }}>

          {/* Título */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
              <div style={{
                width:3, height:22,
                background:'linear-gradient(180deg,#c9a84c,#8a6f2a)',
                borderRadius:2,
              }}/>
              <span style={{
                fontFamily:"'IBM Plex Mono',monospace",
                fontSize:15, fontWeight:700,
                color:'#c9a84c',
                letterSpacing:'0.12em',
              }}>ONOMURA SATÉLITE</span>
              {isRaven && (
                <span style={{
                  fontSize:9, color:'#f59e0b',
                  fontFamily:'monospace',
                  background:'#f59e0b0c',
                  padding:'2px 8px', borderRadius:3,
                  border:'1px solid #f59e0b20',
                  letterSpacing:'0.08em',
                }}>◆ RAVEN</span>
              )}
            </div>
            <div style={{
              fontSize:11, color:'#c9a84c55',
              fontFamily:"'IBM Plex Mono',monospace",
              letterSpacing:'0.06em', paddingLeft:13,
            }}>
              {DIAS_SEMANA[0]} {fmtFecha(dias[0])} &nbsp;·&nbsp; {DIAS_SEMANA[6]} {fmtFecha(dias[6])}
            </div>
          </div>

          {/* Navegación semana */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <NavBtn onClick={prevSem}>‹</NavBtn>
            <span style={{
              fontFamily:"'IBM Plex Mono',monospace",
              fontSize:11, color:'#c9a84c',
              minWidth:68, textAlign:'center',
              background:'#c9a84c08',
              border:'1px solid #c9a84c18',
              borderRadius:5, padding:'5px 8px',
            }}>
              {dias[0].getDate()} {MESES[dias[0].getMonth()]}
            </span>
            <NavBtn onClick={nextSem}>›</NavBtn>
            <NavBtn onClick={hoySem} small>Hoy</NavBtn>
          </div>

          {/* Acciones */}
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
            {isAdmin && (
              <ActionBtn variant="ghost" onClick={()=>setModoVer(!modoVer)}>
                {modoVer ? '✏ Editar' : '◎ Vista'}
              </ActionBtn>
            )}
            <ActionBtn variant="gold" onClick={descargarPDF}>↓ PDF</ActionBtn>
            {isAdmin && !modoVer && (
              <ActionBtn variant="primary" onClick={addEmpleado}>＋ Empleado</ActionBtn>
            )}
          </div>
        </div>

        {/* Tabs */}
        {isAdmin && (
          <div style={{ display:'flex', gap:0, borderTop:'1px solid #1a1d28', marginTop:2 }}>
            {[['grid','Horario'],['historial','Historial']].map(([k,l])=>(
              <button key={k} onClick={()=>setActiveTab(k)} style={{
                background:'none', border:'none',
                padding:'8px 18px',
                fontSize:12, cursor:'pointer',
                fontFamily:'inherit',
                letterSpacing:'0.04em',
                color: activeTab===k ? '#c9a84c' : '#475569',
                borderBottom: activeTab===k ? '2px solid #c9a84c' : '2px solid transparent',
                marginBottom:-1,
                transition:'color 0.15s',
              }}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {/* ════════ TAB GRID ════════ */}
      {activeTab==='grid' && (
        <div style={{ overflowX:'auto', padding:'14px 12px' }}>
          {semana.empleados.length===0 ? (
            <div style={{
              textAlign:'center', padding:'70px 20px',
              color:'#334155',
            }}>
              <div style={{
                fontSize:32, marginBottom:12,
                color:'#c9a84c18',
                fontFamily:'monospace',
              }}>◈</div>
              <p style={{ fontSize:13, marginBottom:18, color:'#475569' }}>Sin empleados esta semana</p>
              {isAdmin && <ActionBtn variant="primary" onClick={addEmpleado}>＋ Agregar empleado</ActionBtn>}
            </div>
          ) : (
            <table style={{
              borderCollapse:'separate',
              borderSpacing:0,
              width:'100%',
              minWidth:900,
              borderRadius:8,
              overflow:'hidden',
              border:'1px solid #c9a84c18',
            }}>
              <thead>
                <tr>
                  <th style={TH.num}>#</th>
                  <th style={TH.nom}>NOMBRE</th>
                  <th style={TH.pto}>PUESTO</th>
                  {dias.map((d,i)=>{
                    const key = toKey(d)
                    const cob = cobertura(key)
                    const sc  = cob<=1 ? '#f87171' : cob<=2 ? '#fbbf24' : '#34d399'
                    const isWeekend = i>=5
                    return (
                      <th key={key} style={{
                        ...TH.dia,
                        background: isWeekend ? '#0c0d14' : '#08090e',
                      }}>
                        <div style={{
                          fontFamily:"'IBM Plex Mono',monospace",
                          fontSize:11, color: isWeekend ? '#c9a84c' : '#94a3b8',
                          fontWeight:700, letterSpacing:'0.08em',
                        }}>{DIAS_SEMANA[i]}</div>
                        <div style={{ fontSize:10, color:'#334155', marginTop:1 }}>
                          {d.getDate()} {MESES[d.getMonth()]}
                        </div>
                        {/* Semáforo — solo panel */}
                        <div style={{
                          width:5, height:5, borderRadius:'50%',
                          background:sc,
                          margin:'4px auto 2px',
                          boxShadow:`0 0 6px ${sc}80`,
                        }} title={`${cob} activos`}/>
                        {isAdmin && !modoVer && (
                          <button
                            onClick={()=>setObsModal({key,diaIdx:i})}
                            title="Obs. a todos"
                            style={{
                              background:'none', border:'none',
                              color:'#334155', cursor:'pointer',
                              fontSize:9, padding:0,
                              lineHeight:1,
                            }}>✎</button>
                        )}
                      </th>
                    )
                  })}
                  {/* Horas — solo panel */}
                  <th style={TH.hrs}>HRS</th>
                  {isAdmin && !modoVer && <th style={TH.acc}/>}
                </tr>
              </thead>
              <tbody>
                {semana.empleados.map((emp,ei)=>(
                  <tr key={emp.id}
                    draggable={isAdmin&&!modoVer}
                    onDragStart={()=>setDragging(emp.id)}
                    onDragOver={e=>e.preventDefault()}
                    onDrop={()=>onDrop(emp.id)}
                    style={{
                      background: ei%2===0 ? '#0c0d15' : '#08090e',
                      cursor: isAdmin&&!modoVer ? 'grab' : 'default',
                      transition:'background 0.1s',
                    }}
                  >
                    {/* # */}
                    <td style={TD.num}>
                      <span style={{
                        fontFamily:'monospace',
                        color:'#c9a84c30', fontSize:10,
                      }}>{ei+1}</span>
                    </td>

                    {/* Nombre */}
                    <td style={TD.nom}>
                      {modoVer
                        ? <span style={{fontSize:12,fontWeight:600,color:'#c9a84c',letterSpacing:'0.03em'}}>{emp.nombre||'—'}</span>
                        : <input
                            value={emp.nombre}
                            onChange={e=>updEmp(emp.id,'nombre',e.target.value.toUpperCase())}
                            placeholder="NOMBRE"
                            style={{...INP.nombre}}
                          />
                      }
                    </td>

                    {/* Puesto */}
                    <td style={TD.pto}>
                      {modoVer
                        ? <span style={{fontSize:10,color:'#64748b',letterSpacing:'0.04em'}}>{emp.puesto}</span>
                        : <select value={emp.puesto} onChange={e=>updEmp(emp.id,'puesto',e.target.value)} style={INP.sel}>
                            {PUESTOS.map(p=><option key={p}>{p}</option>)}
                          </select>
                      }
                    </td>

                    {/* Días */}
                    {dias.map(d=>{
                      const key  = toKey(d)
                      const dia  = emp.dias[key] ?? emptyDia(key)
                      const bloq = ESTADOS_BLOQUEO.includes(dia.estado)
                      const ec   = dia.estado ? (ESTADO_COLOR[dia.estado]??ESTADO_COLOR.ACTIVO) : null
                      const obsBc = OBS_COLOR[dia.observacion] ?? null

                      return (
                        <td key={key} style={{
                          ...TD.dia,
                          borderLeft: ec ? `2px solid ${ec.border}50` : '1px solid #12151f',
                          background: ec ? ec.bg : 'transparent',
                        }}>
                          {bloq ? (
                            modoVer
                              ? <div style={{textAlign:'center',padding:'8px 0'}}>
                                  <span style={{
                                    fontSize:9, fontWeight:700,
                                    color: ec?.text,
                                    fontFamily:"'IBM Plex Mono',monospace",
                                    letterSpacing:'0.06em',
                                  }}>{dia.estado}</span>
                                </div>
                              : <select
                                  value={dia.estado}
                                  onChange={e=>updDia(emp.id,key,'estado',e.target.value)}
                                  style={{
                                    ...INP.selSm,
                                    color: ec?.text,
                                    borderColor: ec ? ec.border+'40' : '#1c2030',
                                    background:'transparent',
                                    textAlign:'center',
                                    fontWeight:700,
                                    fontSize:9,
                                  }}>
                                  <option value="">—</option>
                                  {TODOS_ESTADOS.map(s=><option key={s}>{s}</option>)}
                                </select>
                          ) : (
                            <div style={{display:'flex',flexDirection:'column',gap:3}}>

                              {/* ENTRADA */}
                              {modoVer
                                ? <span style={{
                                    fontSize:10, fontFamily:"'IBM Plex Mono',monospace",
                                    color:'#34d399', textAlign:'center', display:'block', fontWeight:600,
                                  }}>{dia.entrada||'—'}</span>
                                : <div style={{display:'flex',gap:2,alignItems:'center'}}>
                                    <select value={dia.entrada} onChange={e=>updDia(emp.id,key,'entrada',e.target.value)} style={{...INP.selSm,color:'#34d399'}}>
                                      <option value="">ENT</option>
                                      {HORAS_ENTRADA.map(h=><option key={h}>{h}</option>)}
                                    </select>
                                    <button onClick={()=>aplicarSemana(emp.id,'entrada',dia.entrada)} title="→ toda semana"
                                      style={{background:'none',border:'none',color:'#334155',cursor:'pointer',fontSize:10,padding:0,flexShrink:0,lineHeight:1}}>⟳</button>
                                  </div>
                              }

                              {/* ESTADO (no bloqueante) */}
                              {!modoVer && (
                                <select value={dia.estado} onChange={e=>updDia(emp.id,key,'estado',e.target.value)}
                                  style={{
                                    ...INP.selSm,
                                    color: ec?.text ?? '#475569',
                                    borderColor: ec ? ec.border+'35' : '#1a1d28',
                                  }}>
                                  <option value="">ACTIVO</option>
                                  {TODOS_ESTADOS.map(s=><option key={s}>{s}</option>)}
                                </select>
                              )}

                              {/* SALIDA */}
                              {modoVer
                                ? <span style={{
                                    fontSize:10, fontFamily:"'IBM Plex Mono',monospace",
                                    color:'#a78bfa', textAlign:'center', display:'block',
                                  }}>{dia.salida||'—'}</span>
                                : <div style={{display:'flex',gap:2,alignItems:'center'}}>
                                    <select value={dia.salida} onChange={e=>updDia(emp.id,key,'salida',e.target.value)} style={{...INP.selSm,color:'#a78bfa'}}>
                                      <option value="">SAL</option>
                                      {HORAS_SALIDA.map(h=><option key={h}>{h}</option>)}
                                    </select>
                                    <button onClick={()=>aplicarSemana(emp.id,'salida',dia.salida)} title="→ toda semana"
                                      style={{background:'none',border:'none',color:'#334155',cursor:'pointer',fontSize:10,padding:0,flexShrink:0,lineHeight:1}}>⟳</button>
                                  </div>
                              }

                              {/* OBSERVACIÓN */}
                              <div style={{
                                borderTop:`1px solid ${obsBc ? obsBc+'20' : '#12151f'}`,
                                marginTop:1, paddingTop:2,
                              }}>
                                {modoVer
                                  ? <span style={{
                                      fontSize:9, color: obsBc ?? '#334155',
                                      fontStyle:'italic', display:'block', textAlign:'center',
                                    }}>{dia.observacion||''}</span>
                                  : <div style={{display:'flex',gap:2}}>
                                      <select
                                        value={OBS_RAPIDAS.includes(dia.observacion)?dia.observacion:''}
                                        onChange={e=>{if(e.target.value)updDia(emp.id,key,'observacion',e.target.value)}}
                                        style={{
                                          ...INP.selSm,
                                          fontSize:9,
                                          color: obsBc ?? '#475569',
                                          borderColor: obsBc ? obsBc+'30' : '#1a1d28',
                                          flex:1,
                                        }}>
                                        <option value="">OBS</option>
                                        {OBS_RAPIDAS.map(o=><option key={o} value={o}>{o.slice(0,10)}</option>)}
                                      </select>
                                      <input
                                        value={dia.observacion}
                                        onChange={e=>updDia(emp.id,key,'observacion',e.target.value.toUpperCase())}
                                        placeholder="…"
                                        style={{
                                          ...INP.cell,
                                          fontSize:9, width:40,
                                          color: obsBc ?? '#475569',
                                        }}/>
                                    </div>
                                }
                              </div>
                            </div>
                          )}
                        </td>
                      )
                    })}

                    {/* Horas totales — solo panel */}
                    <td style={{...TD.hrs}}>
                      <span style={{
                        fontFamily:"'IBM Plex Mono',monospace",
                        fontSize:10,
                        color:'#34d39980',
                        fontWeight:600,
                      }}>{horasTotales(emp)}</span>
                    </td>

                    {isAdmin && !modoVer && (
                      <td style={TD.acc}>
                        <button
                          onClick={()=>removeEmpleado(emp.id)}
                          style={{
                            background:'#f8717108',
                            border:'1px solid #f8717122',
                            borderRadius:4,
                            color:'#f87171',
                            cursor:'pointer',
                            fontSize:11, padding:'2px 7px',
                          }}>✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ════════ TAB HISTORIAL ════════ */}
      {activeTab==='historial' && (
        <div style={{ padding:'20px 16px' }}>
          <p style={{
            fontSize:10, color:'#334155',
            marginBottom:14,
            fontFamily:"'IBM Plex Mono',monospace",
            letterSpacing:'0.12em',
          }}>SEMANAS ANTERIORES</p>
          {historial.length===0
            ? <p style={{color:'#334155',fontSize:13}}>Sin historial guardado</p>
            : <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {historial.map(k=>{
                  const d   = new Date(k+'T12:00:00')
                  const fin = addDays(d,6)
                  const dt  = loadWeek(k)
                  return (
                    <div key={k} style={{
                      background:'#0c0d15',
                      border:'1px solid #1a1d28',
                      borderLeft:'3px solid #c9a84c22',
                      borderRadius:7,
                      padding:'11px 16px',
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                    }}>
                      <div>
                        <span style={{
                          fontFamily:"'IBM Plex Mono',monospace",
                          fontSize:12, color:'#c9a84c',
                        }}>{fmtFecha(d)} – {fmtFecha(fin)}</span>
                        <span style={{fontSize:11,color:'#334155',marginLeft:14}}>
                          {dt.empleados.length} empleados
                        </span>
                      </div>
                      <ActionBtn variant="ghost" onClick={()=>{setLunes(d);setActiveTab('grid')}} style={{fontSize:11}}>
                        Ver →
                      </ActionBtn>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}

      {/* ════════ MODAL OBS GRUPAL ════════ */}
      {obsModal && (
        <div
          style={{
            position:'fixed', inset:0, zIndex:50,
            background:'#00000090',
            backdropFilter:'blur(6px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:16,
          }}
          onClick={e=>{if(e.target===e.currentTarget)setObsModal(null)}}>
          <div style={{
            background:'#0c0d15',
            border:'1px solid #c9a84c20',
            borderRadius:12, padding:24,
            width:'100%', maxWidth:320,
            boxShadow:'0 20px 60px #000000a0',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <div style={{width:2,height:16,background:'#c9a84c',borderRadius:1}}/>
              <h3 style={{
                margin:0,
                fontFamily:"'IBM Plex Mono',monospace",
                fontSize:12, color:'#c9a84c', fontWeight:400,
                letterSpacing:'0.08em',
              }}>
                OBS — {DIAS_SEMANA[obsModal.diaIdx]} {new Date(obsModal.key+'T12:00:00').getDate()}
              </h3>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {OBS_RAPIDAS.map(obs=>(
                <button key={obs} onClick={()=>aplicarObsTodos(obsModal.key,obs)} style={{
                  padding:'10px 14px', borderRadius:7,
                  border:`1px solid ${OBS_COLOR[obs]??'#60a5fa'}25`,
                  background:`${OBS_COLOR[obs]??'#60a5fa'}0a`,
                  color: OBS_COLOR[obs] ?? '#94a3b8',
                  cursor:'pointer',
                  fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:11, textAlign:'left', fontWeight:600,
                  letterSpacing:'0.06em',
                }}>
                  {obs}
                  <span style={{fontSize:10,color:'#334155',fontWeight:400,letterSpacing:0,marginLeft:8}}>
                    — aplicar a todos
                  </span>
                </button>
              ))}
              <button onClick={()=>setObsModal(null)} style={{
                padding:'8px 0', borderRadius:7,
                border:'1px solid #1a1d28',
                background:'transparent',
                color:'#475569', cursor:'pointer',
                fontSize:12, marginTop:2,
              }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MICRO-COMPONENTES
// ═══════════════════════════════════════════════════════════════

function NavBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      background:'#0c0d15',
      border:'1px solid #1a1d28',
      borderRadius:6,
      color:'#94a3b8',
      cursor:'pointer',
      fontSize:16, lineHeight:1,
      padding:'5px 11px',
      fontFamily:'inherit',
    }}>{children}</button>
  )
}

function ActionBtn({ children, onClick, variant='default', style={} }) {
  const base = {
    padding:'6px 14px', borderRadius:6,
    fontSize:12, cursor:'pointer',
    fontFamily:'inherit',
    letterSpacing:'0.04em',
    fontWeight:500,
    border:'none',
    ...style,
  }
  if (variant==='gold')    return <button onClick={onClick} style={{...base,background:'linear-gradient(135deg,#c9a84c,#a0802a)',color:'#000',fontWeight:700}}>{children}</button>
  if (variant==='primary') return <button onClick={onClick} style={{...base,background:'#1e3a5f',color:'#60a5fa',border:'1px solid #60a5fa20'}}>{children}</button>
  if (variant==='ghost')   return <button onClick={onClick} style={{...base,background:'transparent',border:'1px solid #1a1d28',color:'#94a3b8'}}>{children}</button>
  return <button onClick={onClick} style={{...base,background:'#1a1d28',color:'#cbd5e1'}}>{children}</button>
}

// ═══════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════

const TH = {
  num: {
    width:28, padding:'9px 4px', textAlign:'center',
    fontSize:8, fontFamily:"'IBM Plex Mono',monospace",
    color:'#334155', background:'#08090e',
    borderBottom:'1px solid #c9a84c15',
    letterSpacing:'0.08em',
  },
  nom: {
    width:115, padding:'9px 10px', textAlign:'left',
    fontSize:8, fontFamily:"'IBM Plex Mono',monospace",
    color:'#334155', background:'#08090e',
    borderBottom:'1px solid #c9a84c15',
    letterSpacing:'0.1em',
  },
  pto: {
    width:80, padding:'9px 8px', textAlign:'left',
    fontSize:8, fontFamily:"'IBM Plex Mono',monospace",
    color:'#334155', background:'#08090e',
    borderBottom:'1px solid #c9a84c15',
    letterSpacing:'0.1em',
  },
  dia: {
    padding:'7px 5px', textAlign:'center',
    fontSize:8, fontFamily:"'IBM Plex Mono',monospace",
    color:'#334155', background:'#08090e',
    borderBottom:'1px solid #c9a84c15',
    minWidth:108,
    letterSpacing:'0.06em',
  },
  hrs: {
    width:46, padding:'9px 4px', textAlign:'center',
    fontSize:8, fontFamily:"'IBM Plex Mono',monospace",
    color:'#334155', background:'#08090e',
    borderBottom:'1px solid #c9a84c15',
    letterSpacing:'0.1em',
  },
  acc: {
    width:32, padding:'9px 4px',
    background:'#08090e',
    borderBottom:'1px solid #c9a84c15',
  },
}

const TD = {
  num: { padding:'4px 4px', textAlign:'center', borderBottom:'1px solid #10121a', verticalAlign:'middle' },
  nom: { padding:'5px 8px', borderBottom:'1px solid #10121a', verticalAlign:'middle' },
  pto: { padding:'5px 6px', borderBottom:'1px solid #10121a', verticalAlign:'middle' },
  dia: { padding:'4px 4px', borderBottom:'1px solid #10121a', verticalAlign:'top' },
  hrs: { padding:'4px 4px', borderBottom:'1px solid #10121a', verticalAlign:'middle', textAlign:'center' },
  acc: { padding:'4px 4px', borderBottom:'1px solid #10121a', verticalAlign:'middle', textAlign:'center' },
}

const INP = {
  nombre: {
    background:'transparent', border:'none',
    borderBottom:'1px solid #c9a84c20',
    color:'#c9a84c', padding:'2px 2px',
    fontSize:12, outline:'none',
    width:'100%', fontFamily:'inherit',
    fontWeight:600, letterSpacing:'0.03em',
  },
  cell: {
    background:'transparent', border:'none',
    borderBottom:'1px solid #1a1d2850',
    color:'#94a3b8', padding:'2px 3px',
    fontSize:11, outline:'none',
    width:'100%', fontFamily:'inherit',
  },
  sel: {
    background:'#0a0b10', border:'1px solid #1a1d28',
    borderRadius:4, color:'#94a3b8',
    padding:'3px 4px', fontSize:11,
    outline:'none', width:'100%', fontFamily:'inherit',
  },
  selSm: {
    background:'transparent', border:'1px solid #1a1d28',
    borderRadius:3, color:'#94a3b8',
    padding:'2px 2px', fontSize:10,
    outline:'none', width:'100%', fontFamily:'inherit',
  },
}
