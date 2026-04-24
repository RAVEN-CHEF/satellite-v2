'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

const UNIDADES = ['kg','g','L','ml','unidad','taza','cda','cdta']

export default function RecetaForm({ initial, onSaved, onCancel }) {
  const isEdit = !!initial
  const [nombre,     setNombre]     = useState(initial?.nombre     ?? '')
  const [categoria,  setCategoria]  = useState(initial?.categoria  ?? '')
  const [pasos,      setPasos]      = useState(initial?.pasos      ?? '')
  const [scaleMin,   setScaleMin]   = useState(initial?.scale_min  ?? 0.25)
  const [scaleMax,   setScaleMax]   = useState(initial?.scale_max  ?? 10)
  const [ingredientes, setIngredientes] = useState(initial?.ingredientes ?? [])
  const [saving, setSaving] = useState(false)

  function addIngrediente() {
    setIngredientes(prev => [...prev, { nombre:'', cantidad:0, unidad:'kg' }])
  }
  function updateIng(i, field, value) {
    setIngredientes(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing))
  }
  function removeIng(i) {
    setIngredientes(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!nombre.trim()) { toast.error('Nombre obligatorio'); return }
    setSaving(true)
    const payload = {
      nombre:       nombre.trim(),
      categoria:    categoria.trim() || null,
      pasos:        pasos.trim() || null,
      scale_min:    Number(scaleMin),
      scale_max:    Number(scaleMax),
      ingredientes: ingredientes.filter(ing => ing.nombre.trim()),
    }
    const { error } = isEdit
      ? await supabase.from('recetas').update(payload).eq('id', initial.id)
      : await supabase.from('recetas').insert(payload)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(isEdit ? 'Receta actualizada' : 'Receta creada')
    onSaved?.()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
        <div>
          <label className="sat-label">Nombre</label>
          <input className="sat-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Salsa de tomate" />
        </div>
        <div>
          <label className="sat-label">Categoría</label>
          <input className="sat-input" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ej: Salsas" />
        </div>
      </div>

      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <label className="sat-label" style={{ margin:0 }}>Ingredientes</label>
          <button className="sat-btn sat-btn-ghost" style={{ padding:'4px 10px', fontSize:12 }} onClick={addIngrediente}>+ Agregar</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {ingredientes.map((ing, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 32px', gap:8, alignItems:'center' }}>
              <input className="sat-input" value={ing.nombre} onChange={e => updateIng(i,'nombre',e.target.value)} placeholder="Ingrediente" />
              <input className="sat-input" type="number" min="0" step="0.01" value={ing.cantidad} onChange={e => updateIng(i,'cantidad',e.target.value)} placeholder="Cant." />
              <select className="sat-input" value={ing.unidad} onChange={e => updateIng(i,'unidad',e.target.value)}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button onClick={() => removeIng(i)} style={{ background:'none', border:'none', color:'var(--sat-danger)', cursor:'pointer', fontSize:16 }}>×</button>
            </div>
          ))}
          {ingredientes.length === 0 && <p style={{ fontSize:12, color:'var(--sat-dim)', margin:0 }}>Sin ingredientes</p>}
        </div>
      </div>

      <div>
        <label className="sat-label">Preparación / Pasos</label>
        <textarea className="sat-input" rows={5} value={pasos} onChange={e => setPasos(e.target.value)} placeholder="Describe los pasos…" style={{ resize:'vertical' }} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label className="sat-label">Escala mínima</label>
          <input className="sat-input" type="number" min="0.1" step="0.05" value={scaleMin} onChange={e => setScaleMin(e.target.value)} />
        </div>
        <div>
          <label className="sat-label">Escala máxima</label>
          <input className="sat-input" type="number" min="1" step="0.5" value={scaleMax} onChange={e => setScaleMax(e.target.value)} />
        </div>
      </div>

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button className="sat-btn sat-btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button className="sat-btn sat-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear receta'}
        </button>
      </div>
    </div>
  )
}
