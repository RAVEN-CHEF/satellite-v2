'use client'
import { useState, useRef } from 'react'

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const CATEGORIAS_ORDER = [
  'ROLLOS & MAKI','TEMAKIS','NIGIRIS','NIGIRIS FLAMEADOS',
  'SASHIMIS','TIRADITOS','NEO NIGIRIS','DOMBURI','ENTRADAS','ISHIYAKIS',
]

const INITIAL_PLATILLOS = [
  {id:'p1',nombre:'TUNA CRUNCHY ROLL',categoria:'ROLLOS & MAKI',descripcion:'HOSOMAKI EN HOJA DE SOYA, AGUACATE, ATÚN, SALSA DULCE Y TANUKI',tiempo:'5 MIN',foto:null,procedimiento:'Coloca una hoja de soya sobre la esterilla. Distribuye 70g de arroz. Agrega aguacate. Enrolla firmemente. Corta en 8 piezas. Coloca topping de tuna crunchy. Finaliza con tanuki.',ingredientes:[{n:'MAMENORI',c:'1/2',u:'PZA'},{n:'ARROZ (SHARI)',c:'70',u:'GR'},{n:'AGUACATE',c:'30',u:'GR'},{n:'TUNA CRUNCHY',c:'50',u:'GR'},{n:'SALSA TUNA CRUNCHY',c:'10',u:'ML'},{n:'TANUKI',c:'4',u:'GR'}]},
  {id:'p2',nombre:'NAKAMURA MAKI',categoria:'ROLLOS & MAKI',descripcion:'URAMAKI DE AGUACATE, PEPINO, HAMACHI, YUZU KOSHO',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p3',nombre:'RAINBOW ROLL',categoria:'ROLLOS & MAKI',descripcion:'URAMAKI DE PEPINO KANIKAMA FORRADO DE AGUACATE, SALMÓN, ATÚN, HAMACHI',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p4',nombre:'ROCA ROLL',categoria:'ROLLOS & MAKI',descripcion:'HOSOMAKI DE AGUACATE, KANIKAMA, QUESO CREMA CON CAMARÓN TEMPURA',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p5',nombre:'DRAGON ROLL',categoria:'ROLLOS & MAKI',descripcion:'URAMAKI CAMARÓN EMPANIZADO, KANIKAMA TEMPURA, FORRADO DE AGUACATE Y MANGO',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p6',nombre:'SAKE CRUNCHY',categoria:'ROLLOS & MAKI',descripcion:'HOSOMAKI DE AGUACATE, SALMON SPICY, ACEITE DE TRUFA',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p7',nombre:'KIN KONG ROLL',categoria:'ROLLOS & MAKI',descripcion:'HOSOMAKI DE AGUACATE, FORRADO DE SALMÓN Y TOPPING DE ATÚN AJÍ',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p8',nombre:'KANI BUTTER ROLL',categoria:'ROLLOS & MAKI',descripcion:'FUTOMAKI DE KANIKAMA FLAMEADO CON SPICY, MASAGO, MANTEQUILLA',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p9',nombre:'SPICY TUNA MAKI',categoria:'ROLLOS & MAKI',descripcion:'HOSOMAKI DE ATÚN SPICY EN ALGA NORI',tiempo:'4 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p10',nombre:'PHILLY ROLL',categoria:'ROLLOS & MAKI',descripcion:'URAMAKI DE SALMÓN, QUESO CREMA, PEPINO',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p11',nombre:'TEMAKI SALMÓN',categoria:'TEMAKIS',descripcion:'CONO DE ALGA NORI CON ARROZ, SALMÓN FRESCO, AGUACATE Y PEPINO',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p12',nombre:'TEMAKI TUNA SPICY',categoria:'TEMAKIS',descripcion:'CONO DE ALGA NORI CON ARROZ, ATÚN SPICY, MASAGO',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p13',nombre:'TEMAKI CAMARÓN TEMPURA',categoria:'TEMAKIS',descripcion:'CONO CON CAMARÓN TEMPURA, AGUACATE, PEPINO, SPICY MAYO',tiempo:'4 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p14',nombre:'TEMAKI HAMACHI',categoria:'TEMAKIS',descripcion:'CONO CON HAMACHI, AGUACATE, YUZU KOSHO',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p15',nombre:'TEMAKI KANI',categoria:'TEMAKIS',descripcion:'CONO CON KANIKAMA, AGUACATE, SPICY MAYO, MASAGO',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p16',nombre:'NIGIRI SALMÓN',categoria:'NIGIRIS',descripcion:'SALMÓN FRESCO SOBRE ARROZ PRENSADO CON NIKIRI',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p17',nombre:'NIGIRI ATÚN',categoria:'NIGIRIS',descripcion:'ATÚN AKAMI SOBRE ARROZ CON NIKIRI Y WASABI',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p18',nombre:'NIGIRI HAMACHI',categoria:'NIGIRIS',descripcion:'HAMACHI CON YUZU KOSHO Y NIKIRI',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p19',nombre:'NIGIRI CAMARÓN',categoria:'NIGIRIS',descripcion:'CAMARÓN COCIDO CON NIKIRI Y MASAGO',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p20',nombre:'NIGIRI PULPO',categoria:'NIGIRIS',descripcion:'PULPO COCIDO CON NIKIRI Y ACEITE DE OLIVA',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p21',nombre:'NIGIRI SALMÓN FLAMEADO',categoria:'NIGIRIS FLAMEADOS',descripcion:'SALMÓN FLAMEADO CON SPICY MAYO Y MASAGO',tiempo:'4 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p22',nombre:'NIGIRI TORO TRUFA',categoria:'NIGIRIS FLAMEADOS',descripcion:'TORO FLAMEADO CON TRUFA Y SAL TRUFADA',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p23',nombre:'NIGIRI WAGYU',categoria:'NIGIRIS FLAMEADOS',descripcion:'WAGYU FLAMEADO CON PONZU Y CEBOLLÍN',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p24',nombre:'SASHIMI SALMÓN',categoria:'SASHIMIS',descripcion:'LÁMINAS DE SALMÓN FRESCO CON JENGIBRE, WASABI Y PONZU',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p25',nombre:'SASHIMI ATÚN',categoria:'SASHIMIS',descripcion:'LÁMINAS DE ATÚN AKAMI CON JENGIBRE Y WASABI',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p26',nombre:'SASHIMI HAMACHI',categoria:'SASHIMIS',descripcion:'LÁMINAS DE HAMACHI CON YUZU Y ACEITE DE AJONJOLÍ',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p27',nombre:'SASHIMI MIXTO',categoria:'SASHIMIS',descripcion:'SELECCIÓN DE SALMÓN, ATÚN Y HAMACHI CON GUARNICIONES',tiempo:'4 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p28',nombre:'TIRADITO SALMÓN',categoria:'TIRADITOS',descripcion:'LÁMINAS DE SALMÓN CON LECHE DE TIGRE, AJÍ AMARILLO Y MASAGO',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p29',nombre:'TIRADITO ATÚN',categoria:'TIRADITOS',descripcion:'ATÚN CON LECHE DE TIGRE ROJA, CHILE DE ÁRBOL Y AJONJOLÍ',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p30',nombre:'TIRADITO HAMACHI',categoria:'TIRADITOS',descripcion:'HAMACHI CON YUZU KOSHO, ACEITE DE TRUFA Y CEBOLLÍN',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p31',nombre:'NEO NIGIRI SALMÓN CÍTRICO',categoria:'NEO NIGIRIS',descripcion:'NIGIRI CON SALMÓN, REDUCCIÓN CÍTRICA Y FLORES COMESTIBLES',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p32',nombre:'NEO NIGIRI TORO NEGRO',categoria:'NEO NIGIRIS',descripcion:'NIGIRI DE TORO CON TINTA DE CALAMAR Y TRUFA',tiempo:'5 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p33',nombre:'SAKE DON',categoria:'DOMBURI',descripcion:'BOWL DE ARROZ CON SALMÓN MARINADO, AGUACATE E IKURA',tiempo:'6 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p34',nombre:'TUNA DON',categoria:'DOMBURI',descripcion:'BOWL DE ARROZ CON ATÚN SPICY, EDAMAME Y MASAGO',tiempo:'6 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p35',nombre:'EDAMAME',categoria:'ENTRADAS',descripcion:'EDAMAME AL VAPOR CON SAL MARINA Y ACEITE DE AJONJOLÍ',tiempo:'3 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p36',nombre:'GYOZA',categoria:'ENTRADAS',descripcion:'DUMPLINGS DE CERDO Y VEGETALES CON SALSA PONZU',tiempo:'8 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p37',nombre:'ISHIYAKI SALMÓN',categoria:'ISHIYAKIS',descripcion:'SALMÓN SOBRE PIEDRA VOLCÁNICA CON MANTEQUILLA Y HIERBAS',tiempo:'8 MIN',foto:null,procedimiento:'',ingredientes:[]},
  {id:'p38',nombre:'ISHIYAKI WAGYU',categoria:'ISHIYAKIS',descripcion:'WAGYU SOBRE PIEDRA VOLCÁNICA CON SAL KOSHER Y TRUFA',tiempo:'8 MIN',foto:null,procedimiento:'',ingredientes:[]},
]

const INITIAL_SUBRECETAS = [
  {id:'s1',nombre:'Toro Trufa',tiempo:'10 min',procedimiento:'Colocar el teshin de toro en un bowl, agregar los demás ingredientes y revolver hasta obtener mezcla homogénea.',ingredientes:[{n:'Atún Toro (teshin)',c:'300',u:'g'},{n:'Mayonesa (sub)',c:'30',u:'g'},{n:'Aceite de Trufa',c:'10',u:'ml'},{n:'Sal trufada',c:'2',u:'g'},{n:'Polvo trufa',c:'2',u:'g'},{n:'Tanuki (sub)',c:'50',u:'g'}]},
  {id:'s2',nombre:'Spicy Tuna',tiempo:'10 min',procedimiento:'Colocar el teshin de atún en un bowl con todos los ingredientes hasta obtener mezcla homogénea.',ingredientes:[{n:'Atún Akami (teshin)',c:'300',u:'g'},{n:'Shirasha',c:'25',u:'g'},{n:'Aceite Ajonjolí',c:'10',u:'ml'},{n:'Aceite Rayu',c:'20',u:'ml'},{n:'Sal',c:'2',u:'g'}]},
  {id:'s3',nombre:'Tuna Crunch',tiempo:'10 min',procedimiento:'Mezclar todos los ingredientes hasta obtener consistencia uniforme.',ingredientes:[{n:'Atún Akami',c:'300',u:'g'},{n:'Shirasha',c:'20',u:'g'},{n:'Mayo Spicy (sub)',c:'30',u:'g'},{n:'Aceite Ajonjolí',c:'10',u:'ml'},{n:'Tanuki',c:'50',u:'g'}]},
  {id:'s4',nombre:'Soya Nikiri',tiempo:'10 min',procedimiento:'Mezclar todos los ingredientes en frío. Reservar en refrigeración.',ingredientes:[{n:'Soya Natural',c:'250',u:'ml'},{n:'Sake',c:'50',u:'ml'},{n:'Mirin',c:'50',u:'ml'},{n:'Katzu bushi (bonito)',c:'10',u:'g'}]},
  {id:'s5',nombre:'Mayo Spicy',tiempo:'15 min',procedimiento:'Mezclar mayonesa con chipotle molido, aceites y sriracha hasta obtener consistencia cremosa.',ingredientes:[{n:'Mayonesa',c:'500',u:'g'},{n:'Chipotle molido',c:'30',u:'g'},{n:'Aceite ajonjolí',c:'15',u:'ml'},{n:'Aceite de Chile',c:'10',u:'ml'},{n:'Sriracha',c:'20',u:'g'}]},
  {id:'s6',nombre:'Mayo Aji',tiempo:'15 min',procedimiento:'Procesar mayonesa con ají amarillo hasta obtener mezcla homogénea.',ingredientes:[{n:'Mayonesa',c:'500',u:'g'},{n:'Ají amarillo',c:'80',u:'g'}]},
  {id:'s7',nombre:'Arroz Shari',tiempo:'45 min',procedimiento:'Lavar arroz 3 veces. Cocinar en proporción 1:1.1. Mezclar caliente con vinagre, azúcar y sal.',ingredientes:[{n:'Arroz japonés',c:'1000',u:'g'},{n:'Vinagre de arroz',c:'150',u:'ml'},{n:'Azúcar',c:'60',u:'g'},{n:'Sal',c:'20',u:'g'}]},
  {id:'s8',nombre:'Salsa Ponzu',tiempo:'10 min',procedimiento:'Mezclar todos los ingredientes en frío. Reposar 24h antes de usar.',ingredientes:[{n:'Soya natural',c:'200',u:'ml'},{n:'Jugo limón',c:'100',u:'ml'},{n:'Mirin',c:'50',u:'ml'},{n:'Katzu bushi',c:'10',u:'g'}]},
  {id:'s9',nombre:'Leche de Tigre',tiempo:'15 min',procedimiento:'Licuar todos los ingredientes. Colar y refrigerar.',ingredientes:[{n:'Jugo limón',c:'200',u:'ml'},{n:'Caldo de pescado',c:'100',u:'ml'},{n:'Ají amarillo',c:'30',u:'g'},{n:'Jengibre',c:'5',u:'g'},{n:'Sal',c:'5',u:'g'}]},
  {id:'s10',nombre:'Salsa Tuna Crunchy',tiempo:'10 min',procedimiento:'Mezclar todos los ingredientes hasta obtener consistencia homogénea.',ingredientes:[{n:'Mayo Spicy (sub)',c:'100',u:'g'},{n:'Soya natural',c:'20',u:'ml'},{n:'Aceite de ajonjolí',c:'10',u:'ml'},{n:'Sriracha',c:'15',u:'g'}]},
]

const STORAGE_KEY = 'onomura_recetas_v2'

function loadData() {
  try {
    const d = localStorage.getItem(STORAGE_KEY)
    if (d) return JSON.parse(d)
  } catch {}
  return { platillos: INITIAL_PLATILLOS, subrecetas: INITIAL_SUBRECETAS }
}

function saveData(d) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {}
}

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

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function RecetasSection({ userRole = 'empleado' }) {
  const isAdmin = userRole === 'raven' || userRole === 'admin'
  const [data, setData] = useState(() => loadData())
  const [view, setView] = useState('menu')       // menu | platillo | subreceta | form | subform
  const [activeCat, setActiveCat] = useState('TODOS')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [scale, setScale] = useState(1)
  const [editForm, setEditForm] = useState(null)
  const [formType, setFormType] = useState('platillo') // platillo | subreceta
  const importRef = useRef(null)

  function persist(newData) { saveData(newData); setData({ ...newData }) }

  const cats = ['TODOS', ...CATEGORIAS_ORDER, 'SUB-RECETAS']

  const platillosFiltrados = data.platillos.filter(p => {
    const catOk = activeCat === 'TODOS' || p.categoria === activeCat
    const searchOk = !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.descripcion.toLowerCase().includes(search.toLowerCase())
    return catOk && searchOk
  })

  const subsFiltrados = data.subrecetas.filter(s =>
    !search || s.nombre.toLowerCase().includes(search.toLowerCase())
  )

  // ── Foto ──────────────────────────────────────────────────
  function handleFoto(id, tipo, e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      if (tipo === 'platillo') {
        persist({ ...data, platillos: data.platillos.map(p => p.id === id ? { ...p, foto: ev.target.result } : p) })
      } else {
        persist({ ...data, subrecetas: data.subrecetas.map(s => s.id === id ? { ...s, foto: ev.target.result } : s) })
      }
    }
    reader.readAsDataURL(file)
  }

  // ── Guardar platillo / subreceta ──────────────────────────
  function handleSaveForm() {
    if (!editForm?.nombre?.trim()) return
    if (formType === 'platillo') {
      const exists = data.platillos.find(p => p.id === editForm.id)
      if (exists) {
        persist({ ...data, platillos: data.platillos.map(p => p.id === editForm.id ? editForm : p) })
      } else {
        persist({ ...data, platillos: [...data.platillos, { ...editForm, id: uid(), foto: null }] })
      }
    } else {
      const exists = data.subrecetas.find(s => s.id === editForm.id)
      if (exists) {
        persist({ ...data, subrecetas: data.subrecetas.map(s => s.id === editForm.id ? editForm : s) })
      } else {
        persist({ ...data, subrecetas: [...data.subrecetas, { ...editForm, id: uid(), foto: null }] })
      }
    }
    setView('menu')
  }

  function handleDelete(id, tipo) {
    if (!confirm('¿Eliminar?')) return
    if (tipo === 'platillo') {
      persist({ ...data, platillos: data.platillos.filter(p => p.id !== id) })
    } else {
      persist({ ...data, subrecetas: data.subrecetas.filter(s => s.id !== id) })
    }
    setView('menu')
  }

  // ── Mover platillo de categoría ───────────────────────────
  function moveCat(id, newCat) {
    persist({ ...data, platillos: data.platillos.map(p => p.id === id ? { ...p, categoria: newCat } : p) })
  }

  // ── Importar archivo con IA ──────────────────────────────
  const [importando, setImportando] = useState(false)
  const [importTipo, setImportTipo] = useState('receta')

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
        const nueva = { id: uid(), nombre: d.nombre||'', categoria: d.categoria||'ROLLOS & MAKI',
          descripcion: d.descripcion||'', tiempo: d.tiempo||'', procedimiento: d.procedimiento||'',
          ingredientes: d.ingredientes||[], foto: null }
        persist({ ...data, platillos: [...data.platillos, nueva] })
        alert('✅ Receta importada: ' + nueva.nombre)
      } else if (importTipo === 'subreceta' && d.nombre) {
        const nueva = { id: uid(), nombre: d.nombre||'', tiempo: d.tiempo||'',
          procedimiento: d.procedimiento||'', ingredientes: d.ingredientes||[], foto: null }
        persist({ ...data, subrecetas: [...data.subrecetas, nueva] })
        alert('✅ Sub-receta importada: ' + nueva.nombre)
      } else if (importTipo === 'merma' && d.items?.length) {
        alert(`✅ Merma detectada: ${d.items.length} items. Guardado en historial de mermas.`)
        // Guardar en localStorage mermas
        const mermas = JSON.parse(localStorage.getItem('onomura_mermas')||'[]')
        mermas.unshift({ id: uid(), fecha: d.fecha||new Date().toISOString().slice(0,10), items: d.items, ts: Date.now() })
        localStorage.setItem('onomura_mermas', JSON.stringify(mermas.slice(0,100)))
      } else if (importTipo === 'cortesia' && d.items?.length) {
        alert(`✅ Cortesía detectada: ${d.items.length} items. Guardado en historial.`)
        const cortes = JSON.parse(localStorage.getItem('onomura_cortesias')||'[]')
        cortes.unshift({ id: uid(), fecha: d.fecha||new Date().toISOString().slice(0,10), items: d.items, ts: Date.now() })
        localStorage.setItem('onomura_cortesias', JSON.stringify(cortes.slice(0,100)))
      } else {
        alert('⚠️ El archivo fue analizado pero no se encontraron datos reconocibles para el tipo: ' + importTipo)
      }
    } catch(err) {
      alert('❌ Error: ' + err.message)
    } finally {
      setImportando(false)
      importRef.current.value = ''
    }
  }

  // ── FORM PLATILLO vacío ───────────────────────────────────
  function openNewPlatillo() {
    setFormType('platillo')
    setEditForm({ nombre:'', categoria: activeCat !== 'TODOS' && activeCat !== 'SUB-RECETAS' ? activeCat : 'ROLLOS & MAKI', descripcion:'', tiempo:'', procedimiento:'', ingredientes:[] })
    setView('form')
  }

  function openNewSub() {
    setFormType('subreceta')
    setEditForm({ nombre:'', tiempo:'', procedimiento:'', ingredientes:[] })
    setView('form')
  }

  function openEditPlatillo(p) {
    setFormType('platillo')
    setEditForm({ ...p, ingredientes: [...(p.ingredientes||[]).map(i=>({...i}))] })
    setView('form')
  }

  function openEditSub(s) {
    setFormType('subreceta')
    setEditForm({ ...s, ingredientes: [...(s.ingredientes||[]).map(i=>({...i}))] })
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

  // ════════════════════════════════════════════════════════════
  // RENDER: DETALLE PLATILLO
  // ════════════════════════════════════════════════════════════
  if (view === 'platillo' && selected) {
    const p = data.platillos.find(x => x.id === selected) || data.subrecetas.find(x => x.id === selected)
    if (!p) { setView('menu'); return null }
    const isSub = !!data.subrecetas.find(x => x.id === selected)
    const fotoInputId = `foto-${p.id}`

    return (
      <div style={S.page}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24, flexWrap:'wrap' }}>
          <button onClick={() => { setView('menu'); setScale(1) }} style={S.btnGhost}>← Volver</button>
          <h2 style={{ margin:0, fontFamily:'monospace', fontSize:18, color:'#d4af37', flex:1 }}>{p.nombre}</h2>
          {isAdmin && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => isSub ? openEditSub(p) : openEditPlatillo(p)} style={S.btnGhost}>✏️ Editar</button>
              <button onClick={() => handleDelete(p.id, isSub?'sub':'platillo')} style={S.btnDanger}>🗑 Eliminar</button>
            </div>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(200px,1fr) 2fr', gap:20, alignItems:'start' }}>
          {/* Foto */}
          <div>
            <div style={{ background:'#0f1117', border:'1px solid #1c2030', borderRadius:10, overflow:'hidden', aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
              {p.foto
                ? <img src={p.foto} alt={p.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:40 }}>🍱</span>
              }
            </div>
            {isAdmin && (
              <>
                <input id={fotoInputId} type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => handleFoto(p.id, isSub?'sub':'platillo', e)} />
                <label htmlFor={fotoInputId} style={{ ...S.btnGhost, display:'block', textAlign:'center', cursor:'pointer', fontSize:11 }}>
                  📷 {p.foto ? 'Cambiar foto' : 'Agregar foto'}
                </label>
              </>
            )}
            <div style={{ marginTop:12 }}>
              {!isSub && p.categoria && <Tag color="#d4af37">{p.categoria}</Tag>}
              {p.tiempo && <Tag color="#00e5a0">⏱ {p.tiempo}</Tag>}
            </div>
          </div>

          {/* Info */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {p.descripcion && (
              <div style={S.infoCard}>
                <Label>Descripción</Label>
                <p style={{ margin:0, fontSize:13, color:'#c8cfe8', lineHeight:1.6 }}>{p.descripcion}</p>
              </div>
            )}

            {/* Ingredientes con escalador */}
            {p.ingredientes?.length > 0 && (
              <div style={S.infoCard}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                  <Label>Ingredientes</Label>
                  {isSub && (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:'#5a6280' }}>Escala:</span>
                      <input type="range" min={0.25} max={5} step={0.25} value={scale}
                        onChange={e => setScale(parseFloat(e.target.value))}
                        style={{ width:100, accentColor:'#d4af37' }} />
                      <span style={{ fontFamily:'monospace', fontSize:12, color:'#d4af37', minWidth:32 }}>×{scale}</span>
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {p.ingredientes.map((ing, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', borderRadius:6, background: i%2===0?'#ffffff06':'transparent' }}>
                      <span style={{ fontSize:13, color:'#c8cfe8' }}>{ing.n}</span>
                      <span style={{ fontFamily:'monospace', fontSize:12, color:'#d4af37', flexShrink:0, marginLeft:12 }}>
                        {scaleQty(ing.c, scale)} {ing.u}
                      </span>
                    </div>
                  ))}
                </div>
                {isSub && scale !== 1 && (
                  <p style={{ margin:'8px 0 0', fontSize:10, color:'#5a6280', fontStyle:'italic' }}>
                    * Cantidades ajustadas ×{scale} (1 receta = escala 1)
                  </p>
                )}
              </div>
            )}

            {/* Procedimiento */}
            {p.procedimiento && (
              <div style={S.infoCard}>
                <Label>Procedimiento</Label>
                <p style={{ margin:0, fontSize:13, color:'#c8cfe8', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{p.procedimiento}</p>
              </div>
            )}

            {/* Mover categoría */}
            {isAdmin && !isSub && (
              <div style={S.infoCard}>
                <Label>Mover a categoría</Label>
                <select value={p.categoria} onChange={e => moveCat(p.id, e.target.value)} style={S.select}>
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
            {editForm.id ? 'Editar' : 'Nuevo'} {formType === 'platillo' ? 'platillo' : 'sub-receta'}
          </h2>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:600 }}>
          <Field label="Nombre">
            <input style={S.input} value={editForm.nombre} onChange={e => setEditForm(f=>({...f,nombre:e.target.value.toUpperCase()}))} placeholder="NOMBRE DEL PLATILLO" />
          </Field>

          {formType === 'platillo' && (
            <Field label="Categoría">
              <select style={S.select} value={editForm.categoria} onChange={e => setEditForm(f=>({...f,categoria:e.target.value}))}>
                {CATEGORIAS_ORDER.map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
          )}

          <Field label="Descripción">
            <textarea style={{ ...S.input, resize:'vertical', height:70 }} value={editForm.descripcion||''} onChange={e=>setEditForm(f=>({...f,descripcion:e.target.value}))} placeholder="Descripción breve del platillo" />
          </Field>

          <Field label="Tiempo de preparación">
            <input style={S.input} value={editForm.tiempo||''} onChange={e=>setEditForm(f=>({...f,tiempo:e.target.value}))} placeholder="Ej. 5 MIN" />
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
            <button onClick={()=>setView('menu')} style={S.btnGhost}>Cancelar</button>
            <button onClick={handleSaveForm} style={S.btnGold}>💾 Guardar</button>
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
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontFamily:'monospace', fontSize:20, color:'#d4af37', letterSpacing:'0.06em' }}>RECETARIO ONOMURA</h2>
          <p style={{ margin:'3px 0 0', fontSize:11, color:'#5a6280' }}>
            {data.platillos.length} platillos · {data.subrecetas.length} sub-recetas
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {isAdmin && (
            <>
              <button onClick={openNewPlatillo} style={S.btnGold}>+ Platillo</button>
              <button onClick={openNewSub} style={S.btnGhost}>+ Sub-receta</button>
            </>
          )}
          {/* Importar archivo */}
          <input ref={importRef} type="file" accept=".xlsx,.xls,.pdf,.doc,.docx" style={{ display:'none' }}
            onChange={handleImport} id="import-recetas" />
          <select value={importTipo} onChange={e=>setImportTipo(e.target.value)} style={{ ...S.select, width:110, padding:'6px 8px', fontSize:11 }}>
            <option value="receta">Receta</option>
            <option value="subreceta">Sub-receta</option>
            <option value="merma">Merma</option>
            <option value="cortesia">Cortesía</option>
          </select>
          <label htmlFor="import-recetas" style={{ ...S.btnGhost, cursor:'pointer', opacity: importando ? 0.6 : 1 }}>
            {importando ? '⏳ Analizando…' : '📂 Importar IA'}
          </label>
        </div>
      </div>

      {/* Búsqueda */}
      <input style={{ ...S.input, maxWidth:300, marginBottom:16 }} value={search}
        onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar receta…" />

      {/* Tabs categorías */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:20 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setActiveCat(c)} style={{
            padding:'5px 12px', borderRadius:20, fontSize:11, cursor:'pointer', border:'1px solid',
            borderColor: activeCat===c ? '#d4af37' : '#1c2030',
            background: activeCat===c ? '#d4af3715' : 'transparent',
            color: activeCat===c ? '#d4af37' : '#5a6280',
            fontFamily:'inherit',
          }}>{c}</button>
        ))}
      </div>

      {/* SUB-RECETAS tab */}
      {activeCat === 'SUB-RECETAS' ? (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
            {subsFiltrados.map(s => (
              <div key={s.id} style={S.card} onClick={() => { setSelected(s.id); setView('platillo'); setScale(1) }}>
                <div style={{ fontSize:28, marginBottom:8 }}>⚗️</div>
                <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:600, color:'#d4af37' }}>{s.nombre}</p>
                <p style={{ margin:0, fontSize:11, color:'#5a6280' }}>⏱ {s.tiempo} · {s.ingredientes.length} ing.</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* PLATILLOS por categoría */
        (() => {
          const showCats = activeCat === 'TODOS'
            ? CATEGORIAS_ORDER.filter(c => data.platillos.some(p => p.categoria === c))
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
                      {p.foto
                        ? <img src={p.foto} alt={p.nombre} style={{ width:'100%', height:120, objectFit:'cover', borderRadius:6, marginBottom:8 }} />
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
        })()
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// HELPERS UI
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
  page:     { padding:'20px 16px', fontFamily:"'IBM Plex Sans',-apple-system,sans-serif", color:'#c8cfe8', minHeight:'100vh', background:'#07080d' },
  card:     { background:'#0f1117', border:'1px solid #1c2030', borderRadius:10, padding:'14px 16px', cursor:'pointer', transition:'border-color 0.15s', onMouseEnter: e=>e.currentTarget.style.borderColor='#d4af3740', onMouseLeave: e=>e.currentTarget.style.borderColor='#1c2030' },
  infoCard: { background:'#0f1117', border:'1px solid #1c2030', borderRadius:8, padding:'14px 16px' },
  input:    { width:'100%', background:'#07080d', border:'1px solid #1c2030', borderRadius:6, color:'#c8cfe8', padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' },
  select:   { width:'100%', background:'#07080d', border:'1px solid #1c2030', borderRadius:6, color:'#c8cfe8', padding:'8px 10px', fontSize:13, outline:'none', fontFamily:'inherit' },
  btnGold:  { padding:'8px 16px', borderRadius:6, border:'none', background:'#d4af37', color:'#000', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' },
  btnGhost: { padding:'7px 14px', borderRadius:6, border:'1px solid #1c2030', background:'transparent', color:'#c8cfe8', fontSize:12, cursor:'pointer', fontFamily:'inherit' },
  btnDanger:{ padding:'7px 14px', borderRadius:6, border:'1px solid #ef444430', background:'#ef444415', color:'#ef4444', fontSize:12, cursor:'pointer', fontFamily:'inherit' },
}
