'use client'
import { useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { supabase } from '@/lib/supabaseClient'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import AccessDenied from '@/components/ui/AccessDenied'
import toast from 'react-hot-toast'

const UNIDADES = ['kg','g','L','ml','unidad','caja','bolsa']
const LOW_STOCK_THRESHOLD = 2

export default function InventarioPage() {
  const perm  = usePermission('inventario')
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)

  const { data: items, loading, refetch } = useSupabaseQuery(
    () => supabase.from('inventory').select('*').order('ingrediente'),
    []
  )

  const handleDelete = useCallback(async (id) => {
    if (!perm.edit) return
    if (!confirm('¿Eliminar ítem?')) return
    const { error } = await supabase.from('inventory').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Ítem eliminado')
    refetch()
  }, [perm.edit, refetch])

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  const lowStock = (items ?? []).filter(i => Number(i.stock) <= LOW_STOCK_THRESHOLD)

  return (
    <div style={{ padding:'32px 24px', maxWidth:900 }}>
      <PageHeader
        title="Inventario"
        subtitle={`${(items??[]).length} ítems · ${lowStock.length} bajo stock`}
        actions={perm.edit && (
          <button className="sat-btn sat-btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            + Nuevo ítem
          </button>
        )}
      />

      {lowStock.length > 0 && (
        <div style={{ background:'#f59e0b12', border:'1px solid #f59e0b30', borderRadius:8, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <p style={{ margin:0, fontSize:13, color:'var(--sat-warn)' }}>
            {lowStock.length} ítem{lowStock.length>1?'s':''} con stock bajo: {lowStock.map(i=>i.ingrediente).join(', ')}
          </p>
        </div>
      )}

      {loading && <p style={{ color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', fontSize:12 }}>CARGANDO…</p>}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {(items??[]).map(item => {
          const isLow = Number(item.stock) <= LOW_STOCK_THRESHOLD
          return (
            <div key={item.id} className="sat-card" style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, borderColor: isLow ? '#f59e0b30' : undefined }}>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:500, color:'var(--sat-text)' }}>{item.ingrediente}</p>
                <p style={{ margin:'3px 0 0', fontSize:12, color:'var(--sat-dim)' }}>
                  Actualizado: {new Date(item.updated_at).toLocaleDateString('es-MX')}
                </p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:16, color: isLow ? 'var(--sat-warn)' : 'var(--sat-accent)', minWidth:80, textAlign:'right' }}>
                  {item.stock} {item.unit}
                </span>
                {perm.edit && (
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="sat-btn sat-btn-ghost" style={{ padding:'4px 8px' }} onClick={() => { setEditing(item); setShowForm(true) }}>✏️</button>
                    <button className="sat-btn sat-btn-danger" style={{ padding:'4px 8px' }} onClick={() => handleDelete(item.id)}>🗑</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar ítem' : 'Nuevo ítem'} width={440}>
        <InventarioForm initial={editing} onSaved={() => { setShowForm(false); refetch() }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  )
}

function InventarioForm({ initial, onSaved, onCancel }) {
  const isEdit = !!initial
  const [ingrediente, setIngrediente] = useState(initial?.ingrediente ?? '')
  const [stock,       setStock]       = useState(initial?.stock       ?? 0)
  const [unit,        setUnit]        = useState(initial?.unit        ?? 'kg')
  const [saving,      setSaving]      = useState(false)

  async function handleSave() {
    if (!ingrediente.trim()) { toast.error('Nombre obligatorio'); return }
    setSaving(true)
    const payload = { ingrediente: ingrediente.trim(), stock: Number(stock), unit, updated_at: new Date().toISOString() }
    const { error } = isEdit
      ? await supabase.from('inventory').update(payload).eq('id', initial.id)
      : await supabase.from('inventory').insert(payload)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(isEdit ? 'Ítem actualizado' : 'Ítem creado')
    onSaved?.()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <label className="sat-label">Ingrediente</label>
        <input className="sat-input" value={ingrediente} onChange={e => setIngrediente(e.target.value)} placeholder="Ej: Harina de trigo" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label className="sat-label">Stock</label>
          <input className="sat-input" type="number" min="0" step="0.01" value={stock} onChange={e => setStock(e.target.value)} />
        </div>
        <div>
          <label className="sat-label">Unidad</label>
          <select className="sat-input" value={unit} onChange={e => setUnit(e.target.value)}>
            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button className="sat-btn sat-btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button className="sat-btn sat-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </div>
  )
}
