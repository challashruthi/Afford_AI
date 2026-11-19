import React from 'react';
import { Sparkles, TrendingDown, CheckCircle2 } from 'lucide-react';

export default function RecommendationBadge({ recommendation }) {
  if (!recommendation) return null;

  return (
    <div 
      className="glass-panel pulse-badge" 
      style={{ 
        padding: '24px', 
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
        border: '1px solid var(--accent-green)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '24px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'var(--accent-green)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
          }}>
            <Sparkles size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              AI-PREDICTED LOWEST FARE
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              {recommendation.providerName} <span style={{ color: 'var(--accent-cyan)' }}>{recommendation.rideType}</span>
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {recommendation.expectedSavings > 0 && (
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>EXPECTED SAVINGS</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingDown size={18} /> ₹{Math.round(recommendation.expectedSavings)}
              </div>
            </div>
          )}

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              RECOMMENDED FARE
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>
              ₹{Math.round(recommendation.estimatedFare)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e5e7eb' }}>
        <CheckCircle2 size={16} color="var(--accent-green)" />
        <span><strong>Reason:</strong> {recommendation.reason}</span>
      </div>
    </div>
  );
}
