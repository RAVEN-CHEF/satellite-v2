'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const CATEGORIAS_ORDER = [
  'Rollos & Maki','Temakis','Nigiris','Nigiris Flameados','Nigiris Fritos',
  'Neo Nigiris','Sashimi','Tiraditos','Domburi','Entradas','Ishiyakis',
]

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function parseNum(s) {
  const n = parseFloat(String(s).replace(/[^\d.]/g,''))
  return isNaN(n) ? null : n
}

function scaleQty(c, factor) {
  const n = parseNum(c)
  if (n === null) return c
  const r = n * factor
  return r % 1 === 0 ? String(r) : r.toFixed(2).replace(/\.?0+$/, '')
}

// Normaliza ingredientes de Supabase {item,cantidad} a display
function normIngredientes(ings) {
  if (!Array.isArray(ings)) return []
  return ings.map(i => ({
    n: i.item ?? i.n ?? '',
    c: i.cantidad ?? i.c ?? '',
    u: i.u ?? '',
  }))
}

// Convierte ingredientes del form {n,c,u} a Supabase format {item,cantidad}
function toSupabaseIngs(ings) {
  return ings.map(i => ({
    item: i.n,
    cantidad: i.u ? `${i.c} ${i.u}`.trim() : i.c,
  }))
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function RecetasSection({ userRole = 'empleado' }) {
  const isAdmin = userRole === 'raven' || userRole === 'admin'

  const [platillos,   setPlatillos]   = useState([])
  const [subrecetas,  setSubrecetas]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState('menu')
  const [activeCat,   setActiveCat]   = useState('TODOS')
  const [selected,    setSelected]    = useState(null)
  const [search,      setSearch]      = useState('')
  const [scale,       setScale]       = useState(1)
  const [editForm,    setEditForm]    = useState(null)
  const [formType,    setFormType]    = useState('platillo')
  const [saving,      setSaving]      = useState(false)
  const [importando,  setImportando]  = useState(false)
  const [importTipo,  setImportTipo]  = useState('receta')
  const importRef = useRef(null)

  // ── Cargar datos desde Supabase ───────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('recetario')
      .select('*')
      .order('id')
    if (error) { setLoading(false); return }

    const rows = data ?? []
    setPlatillos(rows.filter(r => r.seccion === 'recetario'))
    setSubrecetas(rows.filter(r => r.seccion === 'sub-recetas'))
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Foto upload to Supabase Storage ─────────────────────
  async function uploadFoto(id, tipo, file) {
    const ext  = file.name.split('.').pop()
    const path = `recetario/${tipo}/${id}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('recetas')
      .upload(path, file, { contentType: file.type, upsert: true })
    if (upErr) { alert('Error al subir foto: ' + upErr.message); return null }
    const { data } = supabase.storage.from('recetas').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleFoto(id, tipo, e) {
    const file = e.target.files[0]
    if (!file) return
    const url = await uploadFoto(id, tipo, file)
    if (!url) return
    const { error } = await supabase.from('recetario').update({ imagen: url }).eq('id', id)
    if (error) { alert(error.message); return }
    fetchData()
  }

  // ── Guardar platillo / subreceta ──────────────────────────
  async function handleSaveForm() {
    if (!editForm?.nombre?.trim()) return
    setSaving(true)
    const payload = {
      nombre:       editForm.nombre,
      categoria:    editForm.categoria || null,
      seccion:      formType === 'platillo' ? 'recetario' : 'sub-recetas',
      descripcion:  editForm.descripcion || null,
      tiempo:       editForm.tiempo || null,
      procedimiento:editForm.procedimiento || null,
      ingredientes: toSupabaseIngs(editForm.ingredientes || []),
      updated_at:   new Date().toISOString(),
    }
    let error
    if (editForm._isNew) {
      ({ error } = await supabase.from('recetario').insert({ ...payload, created_at: new Date().toISOString() }))
    } else {
      ({ error } = await supabase.from('recetario').update(payload).eq('id', editForm.id))
    }
    setSaving(false)
    if (error) { alert(error.message); return }
    await fetchData()
    setView('menu')
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar receta?')) return
    const { error } = await supabase.from('recetario').delete().eq('id', id)
    if (error) { alert(error.message); return }
    await fetchData()
    setView('menu')
  }

  async function moveCat(id, newCat) {
    await supabase.from('recetario').update({ categoria: newCat }).eq('id', id)
    fetchData()
  }

  // ── Import IA ─────────────────────────────────────────────
  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx','xls','pdf','doc','docx','jpg','jpeg','png','webp'].includes(ext)) {
      alert('Formato no soportado. Use imagen, PDF o Excel.')
      importRef.current.value = ''
      return
    }
    setImportando(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('tipo', importTipo)
      const res  = await fetch('/api/analyze-file', { method:'POST', body:fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al analizar')

      const d = json.data
      if (importTipo === 'receta' && d.nombre) {
        const payload = {
          nombre:       d.nombre,
          categoria:    d.categoria || 'Rollos & Maki',
          seccion:      'recetario',
          descripcion:  d.descripcion || null,
          tiempo:       d.tiempo || null,
          procedimiento:d.procedimiento || null,
          ingredientes: (d.ingredientes || []).map(i => ({ item: i.n || i.nombre || '', cantidad: i.c || i.cantidad || '' })),
          created_at:   new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        }
        const { error } = await supabase.from('recetario').insert(payload)
        if (error) throw new Error(error.message)
        await fetchData()
        alert('✅ Receta importada: ' + d.nombre)
      } else if (importTipo === 'subreceta' && d.nombre) {
        const payload = {
          nombre:       d.nombre,
          seccion:      'sub-recetas',
          tiempo:       d.tiempo || null,
          procedimiento:d.procedimiento || null,
          ingredientes: (d.ingredientes || []).map(i => ({ item: i.n || i.nombre || '', cantidad: i.c || i.cantidad || '' })),
          created_at:   new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        }
        const { error } = await supabase.from('recetario').insert(payload)
        if (error) throw new Error(error.message)
        await fetchData()
        alert('✅ Sub-receta importada: ' + d.nombre)
      } else {
        alert('⚠️ No se encontraron datos reconocibles para: ' + importTipo)
      }
    } catch(err) {
      alert('❌ Error: ' + err.message)
    } finally {
      setImportando(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  // ── Form helpers ──────────────────────────────────────────
  function openNewPlatillo() {
    setFormType('platillo')
    setEditForm({ _isNew:true, nombre:'', categoria: activeCat !== 'TODOS' && activeCat !== 'SUB-RECETAS' ? activeCat : 'Rollos & Maki', descripcion:'', tiempo:'', procedimiento:'', ingredientes:[] })
    setView('form')
  }
  function openNewSub() {
    setFormType('subreceta')
    setEditForm({ _isNew:true, nombre:'', tiempo:'', procedimiento:'', ingredientes:[] })
    setView('form')
  }
  function openEditPlatillo(p) {
    setFormType('platillo')
    setEditForm({ ...p, ingredientes: normIngredientes(p.ingredientes) })
    setView('form')
  }
  function openEditSub(s) {
    setFormType('subreceta')
    setEditForm({ ...s, ingredientes: normIngredientes(s.ingredientes) })
    setView('form')
  }
  function addIngForm() {
    setEditForm(f => ({ ...f, ingredientes: [...(f.ingredientes||[]), { n:'', c:'', u:'' }] }))
  }
  function updIng(i, field, val) {
    setEditForm(f => ({ ...f, ingredientes: f.ingredientes.map((ing,idx) => idx===i ? {...ing,[field]:val} : ing) }))
  }
  function removeIng(i) {
    setEditForm(f => ({ ...f, ingredientes: f.ingredientes.filter((_,idx)=>idx!==i) }))
  }

  const cats = ['TODOS', ...CATEGORIAS_ORDER, 'SUB-RECETAS']

  const platillosFiltrados = platillos.filter(p => {
    const catOk    = activeCat === 'TODOS' || p.categoria === activeCat
    const searchOk = !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.descripcion?.toLowerCase().includes(search.toLowerCase())
    return catOk && searchOk
  })

  const subsFiltrados = subrecetas.filter(s =>
    !search || s.nombre?.toLowerCase().includes(search.toLowerCase())
  )

  // ════════════════════════════════════════════════════════════
  // RENDER: DETALLE
  // ════════════════════════════════════════════════════════════
  if (view === 'platillo' && selected) {
    const allItems = [...platillos, ...subrecetas]
    const p = allItems.find(x => x.id === selected)
    if (!p) { setView('menu'); return null }
    const isSub      = p.seccion === 'sub-recetas'
    const fotoInputId = `foto-${p.id}`
    const ings        = normIngredientes(p.ingredientes)

    return (
      <div style={S.page}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24, flexWrap:'wrap' }}>
          <button onClick={() => { setView('menu'); setScale(1) }} style={S.btnGhost}>← Volver</button>
          <h2 style={{ margin:0, fontFamily:'monospace', fontSize:18, color:'#d4af37', flex:1 }}>{p.nombre}</h2>
          {isAdmin && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => isSub ? openEditSub(p) : openEditPlatillo(p)} style={S.btnGhost}>✏️ Editar</button>
              <button onClick={() => handleDelete(p.id)} style={S.btnDanger}>🗑 Eliminar</button>
            </div>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:20, alignItems:'start' }}>
          {/* Foto */}
          <div>
            <div style={{ background:'#0f1117', border:'1px solid #1c2030', borderRadius:10, overflow:'hidden', aspectRatio:'1/1', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8, maxWidth:300, width:'100%' }}>
              {p.imagen
                ? <img src={p.imagen} alt={p.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:40 }}>🍱</span>
              }
            </div>
            {isAdmin && (
              <>
                <input id={fotoInputId} type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => handleFoto(p.id, isSub?'sub':'platillo', e)} />
                <label htmlFor={fotoInputId} style={{ ...S.btnGhost, display:'block', textAlign:'center', cursor:'pointer', fontSize:11 }}>
                  📷 {p.imagen ? 'Cambiar foto' : 'Agregar foto'}
                </label>
              </>
            )}
            <div style={{ marginTop:12 }}>
              {!isSub && p.categoria && <Tag color="#d4af37">{p.categoria}</Tag>}
              {p.tiempo && <Tag color="#00e5a0">⏱ {p.tiempo}</Tag>}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {p.descripcion && (
              <div style={S.infoCard}>
                <Label>Descripción</Label>
                <p style={{ margin:0, fontSize:13, color:'#c8cfe8', lineHeight:1.6 }}>{p.descripcion}</p>
              </div>
            )}

            {ings.length > 0 && (
              <div style={S.infoCard}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                  <Label>Ingredientes</Label>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, color:'#5a6280' }}>Escala:</span>
                    <input type="range" min={0.25} max={5} step={0.25} value={scale}
                      onChange={e => setScale(parseFloat(e.target.value))}
                      style={{ width:90, accentColor:'#d4af37' }} />
                    <span style={{ fontFamily:'monospace', fontSize:12, color:'#d4af37', minWidth:32 }}>×{scale}</span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {ings.map((ing, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', borderRadius:6, background: i%2===0?'#ffffff06':'transparent' }}>
                      <span style={{ fontSize:13, color:'#c8cfe8' }}>{ing.n}</span>
                      <span style={{ fontFamily:'monospace', fontSize:12, color:'#d4af37', flexShrink:0, marginLeft:12 }}>
                        {scaleQty(ing.c, scale)} {ing.u}
                      </span>
                    </div>
                  ))}
                </div>
                {scale !== 1 && <p style={{ margin:'8px 0 0', fontSize:10, color:'#5a6280', fontStyle:'italic' }}>* Cantidades ajustadas ×{scale}</p>}
              </div>
            )}

            {p.procedimiento && (
              <div style={S.infoCard}>
                <Label>Procedimiento</Label>
                <p style={{ margin:0, fontSize:13, color:'#c8cfe8', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{p.procedimiento}</p>
              </div>
            )}

            {isAdmin && !isSub && (
              <div style={S.infoCard}>
                <Label>Mover a categoría</Label>
                <select value={p.categoria||''} onChange={e => moveCat(p.id, e.target.value)} style={S.select}>
                  {CATEGORIAS_ORDER.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: FORMULARIO
  // ════════════════════════════════════════════════════════════
  if (view === 'form' && editForm) {
    return (
      <div style={S.page}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => setView('menu')} style={S.btnGhost}>← Cancelar</button>
          <h2 style={{ margin:0, fontFamily:'monospace', fontSize:16, color:'#d4af37' }}>
            {editForm._isNew ? 'Nuevo' : 'Editar'} {formType === 'platillo' ? 'platillo' : 'sub-receta'}
          </h2>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:600 }}>
          <Field label="Nombre">
            <input style={S.input} value={editForm.nombre} onChange={e => setEditForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre del platillo" />
          </Field>

          {formType === 'platillo' && (
            <Field label="Categoría">
              <select style={S.select} value={editForm.categoria||''} onChange={e => setEditForm(f=>({...f,categoria:e.target.value}))}>
                {CATEGORIAS_ORDER.map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
          )}

          <Field label="Descripción">
            <textarea style={{ ...S.input, resize:'vertical', height:70 }} value={editForm.descripcion||''} onChange={e=>setEditForm(f=>({...f,descripcion:e.target.value}))} placeholder="Descripción breve" />
          </Field>

          <Field label="Tiempo de preparación">
            <input style={S.input} value={editForm.tiempo||''} onChange={e=>setEditForm(f=>({...f,tiempo:e.target.value}))} placeholder="Ej. 5 min" />
          </Field>

          <Field label="Procedimiento">
            <textarea style={{ ...S.input, resize:'vertical', height:100 }} value={editForm.procedimiento||''} onChange={e=>setEditForm(f=>({...f,procedimiento:e.target.value}))} placeholder="Pasos de preparación…" />
          </Field>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <Label>Ingredientes</Label>
              <button onClick={addIngForm} style={{ ...S.btnGhost, fontSize:11 }}>+ Agregar</button>
            </div>
            {(editForm.ingredientes||[]).map((ing,i)=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 60px 28px', gap:6, marginBottom:6 }}>
                <input style={S.input} value={ing.n} onChange={e=>updIng(i,'n',e.target.value)} placeholder="Ingrediente" />
                <input style={S.input} value={ing.c} onChange={e=>updIng(i,'c',e.target.value)} placeholder="Cant." />
                <input style={S.input} value={ing.u} onChange={e=>updIng(i,'u',e.target.value)} placeholder="Und." />
                <button onClick={()=>removeIng(i)} style={{ background:'#ef444420', border:'1px solid #ef444440', borderRadius:5, color:'#ef4444', cursor:'pointer' }}>×</button>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
            <button onClick={()=>setView('menu')} style={S.btnGhost} disabled={saving}>Cancelar</button>
            <button onClick={handleSaveForm} style={S.btnGold} disabled={saving}>
              {saving ? 'Guardando…' : '💾 Guardar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: MENÚ PRINCIPAL
  // ════════════════════════════════════════════════════════════
  return (
    <div style={S.page}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontFamily:'monospace', fontSize:20, color:'#d4af37', letterSpacing:'0.06em' }}>RECETARIO ONOMURA</h2>
          <p style={{ margin:'3px 0 0', fontSize:11, color:'#5a6280' }}>
            {loading ? 'Cargando…' : `${platillos.length} platillos · ${subrecetas.length} sub-recetas`}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {isAdmin && (
            <>
              <button onClick={openNewPlatillo} style={S.btnGold}>+ Platillo</button>
              <button onClick={openNewSub} style={S.btnGhost}>+ Sub-receta</button>
            </>
          )}
          <input ref={importRef} type="file" accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp" style={{ display:'none' }}
            onChange={handleImport} id="import-recetas" />
          <select value={importTipo} onChange={e=>setImportTipo(e.target.value)} style={{ ...S.select, width:110, padding:'6px 8px', fontSize:11 }}>
            <option value="receta">Receta</option>
            <option value="subreceta">Sub-receta</option>
            <option value="merma">Merma</option>
            <option value="cortesia">Cortesía</option>
          </select>
          <label htmlFor="import-recetas" style={{ ...S.btnGhost, cursor:'pointer', opacity: importando?0.6:1 }}>
            {importando ? '⏳ Analizando…' : '📂 Importar IA'}
          </label>
        </div>
      </div>

      <input style={{ ...S.input, maxWidth:300, marginBottom:16 }} value={search}
        onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar receta…" />

      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:20 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setActiveCat(c)} style={{
            padding:'5px 12px', borderRadius:20, fontSize:11, cursor:'pointer', border:'1px solid',
            borderColor: activeCat===c ? '#d4af37' : '#1c2030',
            background:  activeCat===c ? '#d4af3715' : 'transparent',
            color:       activeCat===c ? '#d4af37' : '#5a6280',
            fontFamily:'inherit',
          }}>{c}</button>
        ))}
      </div>

      {loading && <p style={{ color:'#5a6280', fontFamily:'monospace', fontSize:12 }}>CARGANDO…</p>}

      {!loading && activeCat === 'SUB-RECETAS' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
          {subsFiltrados.map(s => (
            <div key={s.id} style={S.card} onClick={() => { setSelected(s.id); setView('platillo'); setScale(1) }}>
              <div style={{ fontSize:28, marginBottom:8 }}>⚗️</div>
              <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:600, color:'#d4af37' }}>{s.nombre}</p>
              <p style={{ margin:0, fontSize:11, color:'#5a6280' }}>
                ⏱ {s.tiempo || '—'} · {normIngredientes(s.ingredientes).length} ing.
              </p>
            </div>
          ))}
        </div>
      )}

      {!loading && activeCat !== 'SUB-RECETAS' && (() => {
        const showCats = activeCat === 'TODOS'
          ? CATEGORIAS_ORDER.filter(c => platillos.some(p => p.categoria === c))
          : [activeCat]

        return showCats.map(cat => {
          const items = platillosFiltrados.filter(p => p.categoria === cat)
          if (!items.length) return null
          return (
            <div key={cat} style={{ marginBottom:28 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <h3 style={{ margin:0, fontFamily:'monospace', fontSize:13, color:'#d4af37', letterSpacing:'0.1em', textTransform:'uppercase' }}>{cat}</h3>
                <div style={{ flex:1, height:1, background:'#d4af3725' }} />
                <span style={{ fontSize:11, color:'#5a6280' }}>{items.length}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                {items.map(p => (
                  <div key={p.id} style={S.card} onClick={() => { setSelected(p.id); setView('platillo'); setScale(1) }}>
                    {p.imagen
                      ? <img src={p.imagen} alt={p.nombre} style={{ width:'100%', height:120, objectFit:'cover', borderRadius:6, marginBottom:8 }} />
                      : <div style={{ width:'100%', height:80, background:'#1c2030', borderRadius:6, marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🍱</div>
                    }
                    <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:600, color:'#c8cfe8', lineHeight:1.3 }}>{p.nombre}</p>
                    <p style={{ margin:0, fontSize:11, color:'#5a6280', lineHeight:1.4 }}>{p.descripcion?.slice(0,60)}{p.descripcion?.length>60?'…':''}</p>
                    {p.tiempo && <span style={{ fontSize:10, color:'#00e5a060', marginTop:4, display:'block' }}>⏱ {p.tiempo}</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })
      })()}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════
function Label({ children }) {
  return <p style={{ margin:'0 0 6px', fontSize:10, fontFamily:'monospace', letterSpacing:'0.1em', textTransform:'uppercase', color:'#5a6280' }}>{children}</p>
}
function Field({ label, children }) {
  return <div><Label>{label}</Label>{children}</div>
}
function Tag({ color, children }) {
  return <span style={{ display:'inline-block', margin:'3px 4px 3px 0', padding:'2px 8px', borderRadius:4, fontSize:10, fontFamily:'monospace', background:`${color}15`, border:`1px solid ${color}30`, color }}>{children}</span>
}

const S = {
  page:      { padding:'20px 16px', fontFamily:"'IBM Plex Sans',-apple-system,sans-serif", color:'#c8cfe8', minHeight:'100vh', background:'#07080d' },
  card:      { background:'#0f1117', border:'1px solid #1c2030', borderRadius:10, padding:'14px 16px', cursor:'pointer', transition:'border-color 0.15s' },
  infoCard:  { background:'#0f1117', border:'1px solid #1c2030', borderRadius:8, padding:'14px 16px' },
  input:     { width:'100%', background:'#07080d', border:'1px solid #1c2030', borderRadius:6, color:'#c8cfe8', padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' },
  select:    { width:'100%', background:'#07080d', border:'1px solid #1c2030', borderRadius:6, color:'#c8cfe8', padding:'8px 10px', fontSize:13, outline:'none', fontFamily:'inherit' },
  btnGold:   { padding:'8px 16px', borderRadius:6, border:'none', background:'#d4af37', color:'#000', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' },
  btnGhost:  { padding:'7px 14px', borderRadius:6, border:'1px solid #1c2030', background:'transparent', color:'#c8cfe8', fontSize:12, cursor:'pointer', fontFamily:'inherit' },
  btnDanger: { padding:'7px 14px', borderRadius:6, border:'1px solid #ef444430', background:'#ef444415', color:'#ef4444', fontSize:12, cursor:'pointer', fontFamily:'inherit' },
}
