'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { usernameToEmail } from '@/utils/validation'

const S = {
  wrap:  { minHeight:'100vh', background:'#07080d', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'IBM Plex Sans',-apple-system,sans-serif" },
  card:  { background:'#0f1117', border:'1px solid #1c2030', borderRadius:12, padding:28, width:'100%', maxWidth:360 },
  label: { display:'block', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'#5a6280', marginBottom:6, fontFamily:'DM Mono,monospace' },
  input: { width:'100%', background:'#07080d', border:'1px solid #1c2030', borderRadius:7, color:'#c8cfe8', padding:'11px 14px', fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  btn:   { width:'100%', padding:'13px 0', borderRadius:7, border:'none', fontSize:14, fontWeight:700, cursor:'pointer', marginTop:4 },
  ghost: { width:'100%', padding:'10px 0', borderRadius:7, border:'1px solid #1c2030', background:'transparent', color:'#5a6280', fontSize:13, cursor:'pointer', marginTop:8 },
  err:   { background:'#ef444415', border:'1px solid #ef444430', borderRadius:6, padding:'10px 14px', color:'#ef4444', fontSize:13, marginBottom:16 },
  ok:    { background:'#00e5a015', border:'1px solid #00e5a030', borderRadius:6, padding:'10px 14px', color:'#00e5a0', fontSize:13, marginBottom:16 },
  sep:   { border:'none', borderTop:'1px solid #1c2030', margin:'16px 0' },
  hint:  { textAlign:'center', marginTop:16, fontSize:10, color:'#2a3050', fontFamily:'DM Mono,monospace', letterSpacing:'0.1em' },
}

export default function LoginForm() {
  const router = useRouter()
  const [view, setView]           = useState('login')
  const [username, setUsername]   = useState('')
  const [pin, setPin]             = useState('')
  const [ravenEmail, setRavenEmail] = useState('')
  const [ravenPass, setRavenPass] = useState('')
  const [newPin, setNewPin]       = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [ravenAuth, setRavenAuth] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [msg, setMsg]             = useState('')
  const taps     = useRef(0)
  const tapTimer = useRef(null)

  function go(v) { setError(''); setMsg(''); setView(v) }

  function handleDotTap() {
    taps.current += 1
    clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => { taps.current = 0 }, 1800)
    if (taps.current >= 5) { taps.current = 0; go('raven') }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!username.trim()) { setError('Ingresa tu usuario'); return }
    if (pin.length < 6)   { setError('PIN de 6 dígitos requerido'); return }
    setLoading(true)
    const email = usernameToEmail(username)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pin })
    setLoading(false)
    if (err) { setError('Usuario o PIN incorrecto'); return }
    router.replace('/dashboard')
  }

  async function handleRavenLogin(e) {
    e.preventDefault()
    setError('')
    if (!ravenEmail.includes('@')) { setError('Ingresa un email válido'); return }
    if (!ravenPass)                { setError('Contraseña requerida'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email: ravenEmail, password: ravenPass })
    setLoading(false)
    if (err) { setError('Credenciales incorrectas'); return }
    router.replace('/dashboard')
  }

  async function handleChangePin(e) {
    e.preventDefault()
    setError('')
    if (!username.trim())     { setError('Ingresa tu usuario'); return }
    if (newPin.length < 6)    { setError('PIN debe tener 6 dígitos'); return }
    if (newPin !== confirmPin) { setError('Los PINs no coinciden'); return }
    if (!ravenAuth.trim())    { setError('Autorización requerida'); return }
    setLoading(true)
    const res  = await fetch('/api/change-pin', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username: username.trim(), newPin }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Error al cambiar PIN'); return }
    setMsg('PIN actualizado correctamente')
    setTimeout(() => go('login'), 1800)
  }

  return (
    <div style={S.wrap}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:'-20%', right:0, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,#00e5a006 0%,transparent 70%)' }} />
        <div style={{ position:'absolute', inset:0, opacity:0.025, backgroundImage:'linear-gradient(#00e5a0 1px,transparent 1px),linear-gradient(90deg,#00e5a0 1px,transparent 1px)', backgroundSize:'60px 60px' }} />
      </div>

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:360 }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span onClick={handleDotTap} style={{ width:9, height:9, borderRadius:'50%', background:'#00e5a0', boxShadow:'0 0 12px #00e5a0', cursor:'default', userSelect:'none' }} />
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:10, letterSpacing:'0.15em', color:'#00e5a0' }}>SATÉLITE ON · v2</span>
          </div>
          {view==='login'     && <><h1 style={{ margin:'0 0 6px', fontFamily:'DM Mono,monospace', fontSize:26, fontWeight:400, color:'#c8cfe8' }}>Sistema<br /><span style={{ color:'#00e5a0' }}>Onomura</span></h1><p style={{ margin:0, fontSize:13, color:'#5a6280' }}>Acceso para personal autorizado</p></>}
          {view==='changePin' && <h1 style={{ margin:0, fontFamily:'DM Mono,monospace', fontSize:22, fontWeight:400, color:'#c8cfe8' }}>Cambiar <span style={{ color:'#00e5a0' }}>PIN</span></h1>}
          {view==='raven'     && <h1 style={{ margin:0, fontFamily:'DM Mono,monospace', fontSize:22, fontWeight:400, color:'#f59e0b' }}>◆ Acceso Admin</h1>}
        </div>

        {view==='login' && (
          <div style={S.card}>
            {error && <div style={S.err}>{error}</div>}
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom:14 }}>
                <label style={S.label}>Usuario</label>
                <input style={S.input} value={username} onChange={e=>setUsername(e.target.value)} placeholder="Tu nombre de usuario" autoComplete="username" />
              </div>
              <div style={{ marginBottom:8 }}>
                <label style={S.label}>PIN (6 dígitos)</label>
                <input style={S.input} type="password" inputMode="numeric" maxLength={6}
                  value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="••••••" autoComplete="current-password" />
                <p style={{ fontSize:11, color:'#5a6280', margin:'4px 0 0', textAlign:'right' }}>{pin.length} / 6</p>
              </div>
              <button type="submit" disabled={loading} style={{ ...S.btn, background:'#00e5a0', color:'#07080d', opacity:loading?0.7:1 }}>
                {loading ? 'Verificando…' : 'Entrar'}
              </button>
            </form>
            <hr style={S.sep} />
            <button style={S.ghost} onClick={() => go('changePin')}>🔑 Cambiar mi PIN</button>
          </div>
        )}

        {view==='changePin' && (
          <div style={S.card}>
            {error && <div style={S.err}>{error}</div>}
            {msg   && <div style={S.ok}>{msg}</div>}
            <form onSubmit={handleChangePin}>
              <div style={{ marginBottom:12 }}><label style={S.label}>Tu usuario</label><input style={S.input} value={username} onChange={e=>setUsername(e.target.value)} placeholder="Nombre de usuario" /></div>
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Nuevo PIN</label>
                <input style={S.input} type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="••••••" />
                <p style={{ fontSize:11, color:'#5a6280', margin:'4px 0 0', textAlign:'right' }}>{newPin.length} / 6</p>
              </div>
              <div style={{ marginBottom:12 }}><label style={S.label}>Confirmar PIN</label><input style={S.input} type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="••••••" /></div>
              <div style={{ marginBottom:16 }}><label style={S.label}>Autorización Raven</label><input style={S.input} type="password" value={ravenAuth} onChange={e=>setRavenAuth(e.target.value)} placeholder="••••••••" /></div>
              <button type="submit" disabled={loading} style={{ ...S.btn, background:'#00e5a0', color:'#07080d', opacity:loading?0.7:1 }}>
                {loading ? 'Guardando…' : 'Actualizar PIN'}
              </button>
            </form>
            <button style={S.ghost} onClick={() => go('login')}>← Volver</button>
          </div>
        )}

        {view==='raven' && (
          <div style={{ ...S.card, borderColor:'#f59e0b30' }}>
            {error && <div style={S.err}>{error}</div>}
            <form onSubmit={handleRavenLogin}>
              <div style={{ marginBottom:12 }}><label style={{ ...S.label, color:'#f59e0b' }}>Email</label><input style={{ ...S.input, borderColor:'#f59e0b30' }} type="email" value={ravenEmail} onChange={e=>setRavenEmail(e.target.value)} placeholder="admin@dominio.com" autoFocus /></div>
              <div style={{ marginBottom:16 }}><label style={{ ...S.label, color:'#f59e0b' }}>Contraseña</label><input style={{ ...S.input, borderColor:'#f59e0b30' }} type="password" value={ravenPass} onChange={e=>setRavenPass(e.target.value)} placeholder="••••••••" /></div>
              <button type="submit" disabled={loading} style={{ ...S.btn, background:'#f59e0b', color:'#07080d', fontFamily:'DM Mono,monospace', letterSpacing:'0.1em', opacity:loading?0.7:1 }}>
                {loading ? 'VERIFICANDO…' : 'ENTRAR'}
              </button>
            </form>
            <button style={S.ghost} onClick={() => go('login')}>← Volver</button>
          </div>
        )}

        <p style={S.hint}>ACCESO RESTRINGIDO · ONOMURA OPERATIONS</p>
      </div>
    </div>
  )
}
