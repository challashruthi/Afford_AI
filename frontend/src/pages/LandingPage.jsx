import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Compass, 
  Sparkles 
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function LandingPage() {
  const token = localStorage.getItem('jwt_token');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#070b14', position: 'relative', overflowX: 'hidden' }}>
      <Navbar />

      {/* Ambient Dark Navy, Teal & Emerald Background Glows */}
      <div 
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.09) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 75%)',
          pointerEvents: 'none',
          zIndex: 0
        }} 
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 1, padding: '48px 20px', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
        
        {/* ── Centered Hero Section ── */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto' }}>
          
          {/* Small Top Label */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            marginBottom: '22px'
          }}>
            <Sparkles size={14} color="#34d399" />
            <span>AI-Powered Ride Fare Optimizer</span>
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontSize: 'clamp(34px, 5.2vw, 56px)',
            fontWeight: 800,
            lineHeight: 1.18,
            marginBottom: '22px',
            letterSpacing: '-1.5px',
            color: '#ffffff'
          }}>
            Stop Overpaying for Rides.<br />
            <span style={{
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Find Your Cheapest Ride with AI.
            </span>
          </h1>

          {/* Description */}
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: '#94a3b8',
            lineHeight: 1.6,
            maxWidth: '640px',
            margin: '0 auto 36px auto',
            fontWeight: 400
          }}>
            Compare estimated Uber, Ola and Rapido fares in one place. Let AI recommend the most affordable ride for your journey.
          </p>

          {/* Hero Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link 
              to={token ? "/comparison" : "/login"} 
              className="btn-primary" 
              id="landing-hero-cheapest-btn"
              style={{
                fontSize: '15px',
                padding: '14px 30px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 700,
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)'
              }}
            >
              Find Cheapest Ride <ArrowRight size={17} />
            </Link>

            <Link 
              to={token ? "/dashboard" : "/login"} 
              className="btn-secondary" 
              id="landing-hero-dashboard-btn"
              style={{
                fontSize: '15px',
                padding: '14px 26px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#cbd5e1',
                fontWeight: 600,
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none'
              }}
            >
              <Compass size={17} color="var(--accent-cyan)" /> Go to Dashboard
            </Link>
          </div>
        </div>

      </main>

      {/* Minimal Footer */}
      <Footer />
    </div>
  );
}
