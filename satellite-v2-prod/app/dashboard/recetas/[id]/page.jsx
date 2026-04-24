'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { usePermission } from '@/hooks/usePermission'
import PageHeader from '@/components/ui/PageHeader'
import AccessDenied from '@/components/ui/AccessDenied'
import ScaleCalculator from '@/components/recetas/ScaleCalculator'

export default function RecetaDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const perm     = usePermission('recetas')
  const [receta, setReceta]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('recetas').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => { setReceta(data); setLoading(false) })
  }, [id])

  if (!perm.view)  return <div style={{ padding:32 }}><AccessDenied /></div>
  if (loading)     return <p style={{ padding:32, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', fontSize:12 }}>CARGANDO…</p>
  if (!receta)     return <div style={{ padding:32 }}><p style={{ color:'var(--sat-danger)' }}>Receta no encontrada</p><button className="sat-btn sat-btn-ghost" onClick={() => router.back()}>← Volver</button></div>

  const ingredientes = Array.isArray(receta.ingredientes) ? receta.ingredientes : []

  return (
    <div style={{ padding:'32px 24px', maxWidth:800 }}>
      <PageHeader
        title={receta.nombre}
        subtitle={receta.categoria ?? 'Sin categoría'}
        actions={<button className="sat-btn sat-btn-ghost" onClick={() => router.back()}>← Volver</button>}
      />

      {ingredientes.length > 0 && (
        <>
          <h3 style={{ fontFamily:'DM Mono,monospace', fontWeight:400, fontSize:14, color:'var(--sat-dim)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>
            Ingredientes
          </h3>
          <div className="sat-card" style={{ marginBottom:24 }}>
            {ingredientes.map((ing, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 18px', borderBottom: i < ingredientes.length-1 ? '1px solid var(--sat-border)' : 'none' }}>
                <span style={{ fontSize:14, color:'var(--sat-text)' }}>{ing.nombre}</span>
                <span style={{ fontSize:14, color:'var(--sat-accent)', fontFamily:'DM Mono,monospace' }}>
                  {ing.cantidad} {ing.unidad}
                </span>
              </div>
            ))}
          </div>

          <ScaleCalculator ingredientes={ingredientes} scaleMin={receta.scale_min ?? 0.25} scaleMax={receta.scale_max ?? 10} />
        </>
      )}

      {receta.pasos && (
        <>
          <h3 style={{ fontFamily:'DM Mono,monospace', fontWeight:400, fontSize:14, color:'var(--sat-dim)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14, marginTop:32 }}>
            Preparación
          </h3>
          <div className="sat-card" style={{ padding:'18px 20px', fontSize:14, lineHeight:'1.7', color:'var(--sat-text)', whiteSpace:'pre-wrap' }}>
            {receta.pasos}
          </div>
        </>
      )}
    </div>
  )
}
