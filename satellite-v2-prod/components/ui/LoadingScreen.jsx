export default function LoadingScreen({ message = 'CARGANDO…' }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#07080d' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#00e5a0', margin:'0 auto 14px', boxShadow:'0 0 16px #00e5a0' }} />
        <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#5a6280', letterSpacing:'0.12em' }}>{message}</span>
      </div>
    </div>
  )
}
