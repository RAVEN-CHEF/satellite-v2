'use client'
import { Toaster } from 'react-hot-toast'
export default function Toast() {
  return (
    <Toaster position="bottom-right"
      toastOptions={{ style: { background:'var(--sat-surface)', color:'var(--sat-text)', border:'1px solid var(--sat-border)', fontFamily:'IBM Plex Sans,sans-serif', fontSize:13 },
        success: { iconTheme: { primary:'#00e5a0', secondary:'#07080d' } },
        error:   { iconTheme: { primary:'#ef4444', secondary:'#07080d' } } }} />
  )
}
