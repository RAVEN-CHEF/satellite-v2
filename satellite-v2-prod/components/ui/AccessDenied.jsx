export default function AccessDenied() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:12 }}>
      <span style={{ fontSize:36 }}>🔒</span>
      <p style={{ color:'var(--sat-dim)', fontFamily:'DM Mono,monospace', fontSize:13, margin:0 }}>ACCESO DENEGADO</p>
    </div>
  )
}
