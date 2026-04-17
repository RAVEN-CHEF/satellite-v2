'use client'
import { useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { supabase } from '@/lib/supabaseClient'
import PageHeader from '@/components/ui/PageHeader'
import AccessDenied from '@/components/ui/AccessDenied'
import toast from 'react-hot-toast'

const DIAS    = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const TURNOS  = ['Mañana', 'Tarde', 'Noche', 'Descanso']
const TURNO_COLORS = { Mañana:'#f59e0b', Tarde:'#3b82f6', Noche:'#8b5cf6', Descanso:'#10b981' }

function getMonday(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

export default function HorariosPage() {
  const { user } = useAuth()
  const perm     = usePermission('horarios')
  const [weekStart, setWeekStart] = useState(getMonday())

  const { data: empleados, loading: loadingEmp } = useSupabaseQuery(
    () => supabase.from('profiles').select('id,nombre').eq('activo', true).order('nombre'),
    []
  )

  const { data: horarios, loading: loadingHor, refetch } = useSupabaseQuery(
    () => supabase.from('horarios').select('*').eq('week_start', weekStart),
    [weekStart]
  )

  const getTurno = useCallback((userId, dayIndex) => {
    return (horarios ?? []).find(h => h.user_id === userId && h.day_index === dayIndex)
  }, [horarios])

  async function setTurno(userId, dayIndex, turno) {
    if (!perm.edit) return
    const existing = getTurno(userId, dayIndex)
    if (existing) {
      const { error } = await supabase.from('horarios').update({ shift: turno }).eq('id', existing.id)
      if (error) { toast.error(error.message); return }
    } else {
      const { error } = await supabase.from('horarios').insert({ user_id: userId, week_start: weekStart, day_index: dayIndex, shift: turno })
      if (error) { toast.error(error.message); return }
    }
    refetch()
  }

  function prevWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d.toISOString().slice(0,10))
  }
  function nextWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d.toISOString().slice(0,10))
  }

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  const loading = loadingEmp || loadingHor

  return (
    <div style={{ padding:'32px 24px', maxWidth:1100 }}>
      <PageHeader title="Horarios" subtitle="Turnos semanales del staff" />

      {/* Navegación semana */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
        <button className="sat-btn sat-btn-ghost" onClick={prevWeek}>←</button>
        <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, color:'var(--sat-text)' }}>
          Semana del {new Date(weekStart+'T12:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })}
        </span>
        <button className="sat-btn sat-btn-ghost" onClick={nextWeek}>→</button>
        <button className="sat-btn sat-btn-ghost" style={{ fontSize:12 }} onClick={() => setWeekStart(getMonday())}>Hoy</button>
      </div>

      {loading && <p style={{ color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', fontSize:12 }}>CARGANDO…</p>}

      {!loading && (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
            <thead>
              <tr>
                <th style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontFamily:'DM Mono,monospace', color:'var(--sat-dim)', letterSpacing:'0.08em', textTransform:'uppercase', borderBottom:'1px solid var(--sat-border)', background:'var(--sat-surface)' }}>
                  Empleado
                </th>
                {DIAS.map(d => (
                  <th key={d} style={{ padding:'10px 8px', textAlign:'center', fontSize:11, fontFamily:'DM Mono,monospace', color:'var(--sat-dim)', letterSpacing:'0.08em', textTransform:'uppercase', borderBottom:'1px solid var(--sat-border)', background:'var(--sat-surface)' }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(empleados??[]).map(emp => (
                <tr key={emp.id} style={{ borderBottom:'1px solid var(--sat-border)' }}>
                  <td style={{ padding:'10px 14px', fontSize:13, color:'var(--sat-text)', fontWeight:500, background:'var(--sat-surface)', whiteSpace:'nowrap' }}>
                    {emp.nombre}
                  </td>
                  {DIAS.map((_, i) => {
                    const h = getTurno(emp.id, i)
                    const color = TURNO_COLORS[h?.shift] ?? null
                    return (
                      <td key={i} style={{ padding:'6px 4px', textAlign:'center', background:'var(--sat-bg)' }}>
                        {perm.edit ? (
                          <select
                            value={h?.shift ?? ''}
                            onChange={e => setTurno(emp.id, i, e.target.value)}
                            style={{ background: color ? `${color}20` : 'var(--sat-surface)', border:`1px solid ${color ?? 'var(--sat-border)'}`, borderRadius:5, color: color ?? 'var(--sat-dim)', fontSize:11, fontFamily:'DM Mono,monospace', padding:'4px 2px', width:'100%', cursor:'pointer', textAlign:'center' }}
                          >
                            <option value="">—</option>
                            {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color: color ?? 'var(--sat-dim)' }}>
                            {h?.shift ?? '—'}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda */}
      <div style={{ display:'flex', gap:16, marginTop:20, flexWrap:'wrap' }}>
        {Object.entries(TURNO_COLORS).map(([turno, color]) => (
          <div key={turno} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />
            <span style={{ fontSize:12, color:'var(--sat-dim)', fontFamily:'DM Mono,monospace' }}>{turno}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
