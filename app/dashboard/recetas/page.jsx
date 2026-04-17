'use client'
import { useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { supabase } from '@/lib/supabaseClient'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import AccessDenied from '@/components/ui/AccessDenied'
import RecetaCard from '@/components/recetas/RecetaCard'
import RecetaForm from '@/components/recetas/RecetaForm'
import toast from 'react-hot-toast'

export default function RecetasPage() {
  const { user } = useAuth()
  const perm = usePermission('recetas')
  const [search,    setSearch]   = useState('')
  const [categoria, setCategoria] = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)

  const { data: recetas, loading, refetch } = useSupabaseQuery(
    () => supabase.from('recetas').select('*').order('nombre'),
    []
  )

  const handleDelete = useCallback(async (id) => {
    if (!perm.edit) { toast.error('Sin permiso'); return }
    if (!confirm('¿Eliminar receta?')) return
    const { error } = await supabase.from('recetas').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Receta eliminada')
    refetch()
  }, [perm.edit, refetch])

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  const categorias = [...new Set((recetas ?? []).map(r => r.categoria).filter(Boolean))]
  const filtered   = (recetas ?? []).filter(r => {
    const matchSearch = !search || r.nombre?.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !categoria || r.categoria === categoria
    return matchSearch && matchCat
  })

  return (
    <div style={{ padding:'32px 24px', maxWidth:1100 }}>
      <PageHeader
        title="Recetario"
        subtitle={`${(recetas ?? []).length} recetas`}
        actions={perm.edit && (
          <button className="sat-btn sat-btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            + Nueva receta
          </button>
        )}
      />

      {/* Filtros */}
      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        <input className="sat-input" style={{ maxWidth:280 }} placeholder="Buscar receta…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="sat-input" style={{ maxWidth:180 }} value={categoria} onChange={e => setCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading && <p style={{ color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', fontSize:12 }}>CARGANDO…</p>}

      {!loading && filtered.length === 0 && (
        <div className="sat-card" style={{ padding:40, textAlign:'center' }}>
          <p style={{ color:'var(--sat-dim)', fontSize:14 }}>No hay recetas{search ? ` con "${search}"` : ''}</p>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {filtered.map(r => (
          <RecetaCard
            key={r.id}
            receta={r}
            canEdit={perm.edit}
            onEdit={() => { setEditing(r); setShowForm(true) }}
            onDelete={() => handleDelete(r.id)}
          />
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar receta' : 'Nueva receta'} width={640}>
        <RecetaForm
          initial={editing}
          onSaved={() => { setShowForm(false); refetch() }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  )
}
