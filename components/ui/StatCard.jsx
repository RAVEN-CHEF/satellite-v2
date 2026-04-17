export default function StatCard({ label, value, sub, accent = false, icon }) {
  return (
    <div className="sat-card" style={{ padding:'20px 24px', borderColor: accent?'#00e5a030':undefined, background: accent?'#00e5a008':undefined }}>
      {icon && <div style={{ fontSize:22, marginBottom:10 }}>{icon}</div>}
      <p style={{ margin:'0 0 6px', fontSize:11, fontFamily:'DM Mono,monospace', letterSpacing:'0.08em', color:'var(--sat-dim)', textTransform:'uppercase' }}>{label}</p>
      <p style={{ margin:0, fontSize:28, fontFamily:'DM Mono,monospace', color: accent?'var(--sat-accent)':'var(--sat-text)', fontWeight:400 }}>{value}</p>
      {sub && <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--sat-dim)' }}>{sub}</p>}
    </div>
  )
}
