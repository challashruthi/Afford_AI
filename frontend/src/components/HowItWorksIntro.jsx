import React from 'react';
import { Search, Scale, Sparkles, CheckCircle } from 'lucide-react';

export default function HowItWorksIntro({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(10, 15, 29, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 9998,
      display: 'flex',
      alignItems: 'center',
      justify: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '32px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <Sparkles size={24} color="var(--accent-green)" />
        </div>

        <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
          How Affordable Ride Works
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Quick 3-step guide to finding your ideal ride.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlignment: 'left', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '8px', color: 'var(--accent-green)', fontWeight: 800 }}>1</div>
            <div style={{ textAlign: 'left' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={15} color="var(--accent-green)" /> Search Route
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Enter your searched pickup location and destination.</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '8px', borderRadius: '8px', color: 'var(--accent-cyan)', fontWeight: 800 }}>2</div>
            <div style={{ textAlign: 'left' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={15} color="var(--accent-cyan)" /> Compare Rides
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Compare estimated fares and route distance across Uber, Ola, and Rapido.</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '8px', borderRadius: '8px', color: 'var(--accent-yellow)', fontWeight: 800 }}>3</div>
            <div style={{ textAlign: 'left' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} color="var(--accent-yellow)" /> AI Recommendation
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Get a personalized recommendation scored against your specific priorities.</p>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
          Got it <CheckCircle size={16} />
        </button>
      </div>
    </div>
  );
}
