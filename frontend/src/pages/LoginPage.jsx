import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login({ email: trimmedEmail, password });
      if (res.data && res.data.token) {
        localStorage.setItem('jwt_token', res.data.token);
        localStorage.setItem('user_info', JSON.stringify({
          id: res.data.id,
          fullName: res.data.fullName,
          email: res.data.email,
          onboardingCompleted: true,
          hasCompletedOnboarding: true,
          preferredRideType: res.data.preferredRideType || 'ALL',
          tripPriority: res.data.tripPriority || 'LOWEST_FARE'
        }));
        
        navigate('/dashboard');
      }
    } catch (err) {
      let msg = 'Invalid email or password. Please try again.';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.message === 'Network Error' || !err.response) {
        msg = 'Unable to connect to the backend server. Please verify the service is running.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <LogIn size={24} color="var(--accent-green)" />
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>Welcome Back</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>Log in to access your ride recommendation dashboard</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#fca5a5', fontSize: '13px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Email Address</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="commuter@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Log In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)', marginTop: '24px' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Register Now</Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
