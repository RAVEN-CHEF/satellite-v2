export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
      <div>
        <h1 style={{ margin:0, fontFamily:'DM Mono,monospace', fontSize:22, fontWeight:400, color:'var(--sat-text)' }}>{title}</h1>
        {subtitle && <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--sat-dim)' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{actions}</div>}
    </div>
  )
}
