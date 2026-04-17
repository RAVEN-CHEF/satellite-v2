'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { isRaven, isAdmin, SECCIONES } from '@/lib/permissions'
import { supabase } from '@/lib/supabaseClient'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import AccessDenied from '@/components/ui/AccessDenied'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const { user } = useAuth()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)

  const canManage = user && (isRaven(user) || isAdmin(user))

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('nombre')
    if (error) { toast.error(error.message); return }
    setUsers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function toggleActivo(u) {
    const { error } = await supabase.from('profiles').update({ activo: !u.activo }).eq('id', u.id)
    if (error) { toast.error(error.message); return }
    toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
    fetchUsers()
  }

  if (!canManage) return <div style={{ padding:32 }}><AccessDenied /></div>
  if (loading)    return <div style={{ padding:32 }}><p style={{ color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', fontSize:12 }}>CARGANDO…</p></div>

  return (
    <div style={{ padding:'32px 24px', maxWidth:900 }}>
      <PageHeader
        title="Usuarios"
        subtitle={`${users.length} usuarios registrados`}
        actions={
          <button className="sat-btn sat-btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            + Nuevo usuario
          </button>
        }
      />

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {users.map(u => (
          <div key={u.id} className="sat-card" style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:14, fontWeight:500, color:'var(--sat-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {u.nombre || u.email}
              </p>
              <p style={{ margin:'2px 0 0', fontSize:11, fontFamily:'DM Mono,monospace', color:'var(--sat-dim)' }}>
                {u.email} · {u.role}
              </p>
              <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                {Object.entries(u.permisos || {}).map(([sec, nivel]) => nivel && (
                  <span key={sec} style={{ fontSize:10, fontFamily:'DM Mono,monospace', background:'#c9a84c15', color:'var(--sat-accent)', border:'1px solid #c9a84c30', borderRadius:3, padding:'1px 5px' }}>
                    {SECCIONES[sec]?.label ?? sec}: {nivel}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              <button className="sat-btn sat-btn-ghost" onClick={() => { setEditing(u); setShowForm(true) }}>✏️</button>
              <button onClick={() => toggleActivo(u)} style={{ padding:'6px 12px', borderRadius:6, fontSize:12, cursor:'pointer', border:'1px solid', fontFamily:'DM Mono,monospace',
                borderColor: u.activo?'#10b98130':'#ef444430',
                background:  u.activo?'#10b98115':'#ef444415',
                color:       u.activo?'#10b981':'#ef4444' }}>
                {u.activo ? 'ACTIVO' : 'INACTIVO'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar usuario' : 'Nuevo usuario'} width={580}>
        <UserForm initial={editing} onSaved={() => { setShowForm(false); fetchUsers() }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  )
}

function UserForm({ initial, onSaved, onCancel }) {
  const isEdit = !!initial
  const [email,    setEmail]    = useState(initial?.email    ?? '')
  const [nombre,   setNombre]   = useState(initial?.nombre   ?? '')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState(initial?.role     ?? 'empleado')
  const [permisos, setPermisos] = useState(initial?.permisos ?? {})
  const [saving,   setSaving]   = useState(false)

  function setPermiso(seccion, valor) {
    setPermisos(prev => ({ ...prev, [seccion]: valor || false }))
  }

  async function handleSave() {
    if (!email.trim())             { toast.error('Email obligatorio'); return }
    if (!isEdit && password.length < 6) { toast.error('Contraseña mínimo 6 caracteres'); return }
    setSaving(true)
    try {
      if (!isEdit) {
        const res  = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ email: email.trim(), password, nombre, role, permisos }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Error al crear usuario')
      } else {
        const res  = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ id: initial.id, nombre, role, permisos }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Error al actualizar usuario')
      }
      toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado')
      onSaved?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label className="sat-label">Nombre</label>
          <input className="sat-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del empleado" />
        </div>
        <div>
          <label className="sat-label">Email</label>
          <input className="sat-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" disabled={isEdit} />
        </div>
      </div>
      {!isEdit && (
        <div>
          <label className="sat-label">Contraseña inicial</label>
          <input className="sat-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>
      )}
      <div>
        <label className="sat-label">Rol</label>
        <select className="sat-input" value={role} onChange={e => setRole(e.target.value)}>
          <option value="empleado">Empleado</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div>
        <label className="sat-label" style={{ marginBottom:10 }}>Permisos por sección</label>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {Object.entries(SECCIONES).map(([key, { label, niveles }]) => (
            <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:6, background:'#ffffff05', border:'1px solid var(--sat-border)' }}>
              <span style={{ fontSize:13, color:'var(--sat-text)' }}>{label}</span>
              <select className="sat-input" style={{ width:130, marginBottom:0 }} value={permisos[key] || ''} onChange={e => setPermiso(key, e.target.value)}>
                <option value="">Sin acceso</option>
                {niveles.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase()+n.slice(1)}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button className="sat-btn sat-btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button className="sat-btn sat-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear usuario'}
        </button>
      </div>
    </div>
  )
}
