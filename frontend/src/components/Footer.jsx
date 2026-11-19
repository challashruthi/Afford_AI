import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border-color)', padding: '30px 20px', background: 'var(--bg-secondary)', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
          <ShieldCheck size={16} color="var(--accent-green)" />
          <span>AI-Based Affordable Ride Recommendation Platform &copy; {new Date().getFullYear()}</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '700px', lineHeight: 1.5 }}>
          <Info size={12} style={{ display: 'inline', marginRight: '4px' }} />
          This platform computes deterministic fare estimates and AI recommendations based on open routing distances and configurable provider rates. Demo Mode estimates are shown when third-party provider live APIs are unavailable.
        </p>
      </div>
    </footer>
  );
}
