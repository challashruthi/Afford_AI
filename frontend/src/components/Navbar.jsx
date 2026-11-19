import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Car, LogOut, User, Compass, Zap, Star, Home, BarChart3, Brain } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('jwt_token');
  const userStr = localStorage.getItem('user_info');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
    navigate('/');
  };

  return (
    <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', position: 'sticky', top: 0, zIndex: 1100, padding: '14px 28px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }} id="nav-brand-logo">
          <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', margin: 0 }}>
              Ride<span className="gradient-text">Afford</span>
            </h2>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', margin: 0 }}>AI RIDE RECOMMENDATION</p>
          </div>
        </Link>

        {/* Center / Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: location.pathname === '/' ? 'var(--accent-green)' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none'
            }}
            id="nav-link-home"
          >
            <Home size={16} />
            <span>Home</span>
          </Link>

          <Link 
            to={token ? "/dashboard" : "/login"} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: location.pathname === '/dashboard' ? 'var(--accent-green)' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none'
            }}
            id="nav-link-dashboard"
          >
            <Compass size={16} />
            <span>Dashboard</span>
          </Link>

          <Link 
            to={token ? "/comparison" : "/login"} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: location.pathname === '/comparison' ? 'var(--accent-green)' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none'
            }}
            id="nav-link-comparison"
          >
            <Zap size={16} />
            <span>Comparison</span>
          </Link>

          <Link 
            to={token ? "/analytics" : "/login"} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: location.pathname === '/analytics' ? 'var(--accent-green)' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none'
            }}
            id="nav-link-analytics"
          >
            <BarChart3 size={16} />
            <span>Fare Analytics</span>
          </Link>

          <Link 
            to={token ? "/model-evaluation" : "/login"} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: location.pathname === '/model-evaluation' ? 'var(--accent-green)' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none'
            }}
            id="nav-link-model-eval"
          >
            <Brain size={16} />
            <span>Model Evaluation</span>
          </Link>

          <Link 
            to={token ? "/favourites" : "/login"}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: location.pathname === '/favourites' ? 'var(--accent-green)' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none'
            }}
            id="nav-link-favourites"
          >
            <Star size={16} />
            <span>Favourites</span>
          </Link>
        </div>

        {/* Auth / Profile Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '16px', borderLeft: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-highlight)' }}>
                  <User size={16} color="var(--accent-green)" />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>{user?.fullName || 'Commuter'}</span>
              </div>
              <button 
                onClick={handleLogout}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', padding: '6px' }}
                title="Logout"
                id="nav-logout-btn"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link to="/login" style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }} id="nav-login-btn">
                Login
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '8px 18px', fontSize: '14px', textDecoration: 'none' }} id="nav-get-started-btn">
                Get Started
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}
