'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export default function ValidarPage() {
  const { token } = useParams()
  const [link,      setLink]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [nombre,    setNombre]    = useState('')
  const [firmado,   setFirmado]   = useState(false)
  const [enviando,  setEnviando]  = useState(false)
  const [hasDrawn,  setHasDrawn]  = useState(false)
  const [drawing,   setDrawing]   = useState(false)
  const canvasRef   = useRef(null)

  useEffect(() => {
    fetch(`/api/validate-link?token=${token}`)
      .then(r => r.json())
      .then(json => {
        if (!json.ok) setError(json.error || 'Link inválido')
        else setLink(json.link)
      })
      .catch(() => setError('Error al cargar el documento'))
      .finally(() => setLoading(false))
  }, [token])

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const t = e.touches?.[0] ?? e
    return { x: (t.clientX - rect.left) * (canvas.width / rect.width),
             y: (t.clientY - rect.top)  * (canvas.height / rect.height) }
  }
  function startDraw(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }
  function draw(e) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.strokeStyle='#1a1a2e'
    ctx.lineTo(pos.x, pos.y); ctx.stroke()
    setHasDrawn(true)
  }
  function endDraw(e) { e.preventDefault(); setDrawing(false) }
  function clearCanvas() {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height)
    setHasDrawn(false)
  }

  async function handleFirmar() {
    if (!nombre.trim()) { alert('Ingresa tu nombre completo'); return }
    if (!hasDrawn) { alert('Dibuja tu firma'); return }
    setEnviando(true)
    const firma_base64 = canvasRef.current.toDataURL('image/png')
    try {
      const res  = await fetch('/api/validate-link', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ token, nombre: nombre.trim(), firma_base64 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setFirmado(true)
    } catch(err) {
      alert('Error: ' + err.message)
    } finally {
      setEnviando(false)
    }
  }

  const S = {
    page:  { minHeight:'100vh', background:'#f8f7f4', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:"'IBM Plex Sans',sans-serif" },
    card:  { background:'#fff', borderRadius:12, padding:32, width:'100%', maxWidth:520, boxShadow:'0 4px 24px #00000015' },
    label: { display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#666', marginBottom:6 },
    input: { width:'100%', border:'1.5px solid #ddd', borderRadius:7, padding:'11px 14px', fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
    btn:   { width:'100%', padding:'13px 0', borderRadius:7, border:'none', background:'#1a1a2e', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', marginTop:8 },
  }

  if (loading) return <div style={S.page}><p style={{ color:'#888' }}>Cargando…</p></div>

  if (error) return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:40 }}>🔒</p>
          <h2 style={{ color:'#cc3333', margin:'8px 0' }}>Link no válido</h2>
          <p style={{ color:'#666' }}>{error}</p>
        </div>
      </div>
    </div>
  )

  if (link?.used) return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:40 }}>✅</p>
          <h2 style={{ color:'#1a7a4a', margin:'8px 0' }}>Documento ya firmado</h2>
          <p style={{ color:'#666' }}>Firmado por: <strong>{link.signed_by}</strong></p>
          <p style={{ color:'#999', fontSize:12 }}>{new Date(link.signed_at).toLocaleString('es-MX')}</p>
        </div>
      </div>
    </div>
  )

  if (firmado) return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:50 }}>✅</p>
          <h2 style={{ color:'#1a7a4a', margin:'8px 0' }}>Documento firmado</h2>
          <p style={{ color:'#666' }}>Tu firma fue registrada correctamente.</p>
          <p style={{ color:'#999', fontSize:12 }}>{new Date().toLocaleString('es-MX')}</p>
        </div>
      </div>
    </div>
  )

  const expirado = link && new Date(link.expires_at) < new Date()

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:11, color:'#999', letterSpacing:'0.12em', marginBottom:6 }}>ONOMURA · DOCUMENTO OFICIAL</div>
          <h1 style={{ margin:0, fontSize:22, color:'#1a1a2e' }}>{link?.titulo}</h1>
          {link?.descripcion && <p style={{ margin:'8px 0 0', color:'#666', fontSize:14 }}>{link.descripcion}</p>}
        </div>

        {/* Contenido del documento */}
        {link?.contenido && (
          <div style={{ background:'#f8f7f4', borderRadius:8, padding:16, marginBottom:24, fontSize:13, color:'#333', lineHeight:1.7, whiteSpace:'pre-wrap', maxHeight:300, overflowY:'auto' }}>
            {link.contenido}
          </div>
        )}

        {expirado ? (
          <div style={{ textAlign:'center', padding:20, background:'#fff3f3', borderRadius:8 }}>
            <p style={{ color:'#cc3333', fontWeight:600 }}>Este link ha expirado</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>Nombre completo</label>
              <input style={S.input} value={nombre} onChange={e=>setNombre(e.target.value)}
                placeholder="Tu nombre completo" autoComplete="name" />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={S.label}>Firma</label>
              <div style={{ border:'1.5px solid #ddd', borderRadius:8, overflow:'hidden', background:'#fafafa', cursor:'crosshair', marginBottom:8 }}>
                <canvas ref={canvasRef} width={460} height={160}
                  style={{ display:'block', width:'100%', touchAction:'none' }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              </div>
              <button onClick={clearCanvas} style={{ background:'none', border:'1px solid #ddd', borderRadius:5, padding:'4px 12px', fontSize:12, cursor:'pointer', color:'#666' }}>
                Limpiar
              </button>
            </div>

            <p style={{ fontSize:11, color:'#999', margin:'0 0 12px', textAlign:'center' }}>
              Al firmar aceptas que revisaste y apruebas este documento. Válido hasta: {new Date(link?.expires_at).toLocaleString('es-MX')}
            </p>

            <button onClick={handleFirmar} disabled={enviando} style={{ ...S.btn, opacity: enviando?0.7:1 }}>
              {enviando ? 'Firmando…' : '✍️ Firmar documento'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
