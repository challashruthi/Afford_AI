import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  ArrowRight, ArrowLeft, Bike, Car,
  Sparkles, CheckCircle2, Navigation, Loader2, Users
} from 'lucide-react';

const RIDE_TYPES = [
  {
    id: 'BIKE',
    label: 'Bike',
    icon: <Bike size={26} color="var(--accent-green)" />,
    desc: 'Fastest & lowest fare — 1 passenger only',
    capacity: 1,
  },
  {
    id: 'AUTO',
    label: 'Auto',
    icon: <span style={{ fontSize: '24px' }}>🛺</span>,
    desc: 'Budget-friendly — up to 3 passengers',
    capacity: 3,
  },
  {
    id: 'CAB',
    label: 'Cab',
    icon: <Car size={26} color="var(--accent-cyan)" />,
    desc: 'Comfortable — up to 4 passengers',
    capacity: 4,
  },
  {
    id: 'ALL',
    label: 'No Preference / All',
    icon: <Sparkles size={26} color="var(--accent-yellow)" />,
    desc: 'Compare all vehicle options (default)',
    capacity: null,
  },
];

const PASSENGER_OPTIONS = [1, 2, 3, 4, '5+'];

const REQUIREMENT_OPTIONS = [
  {
    id: 'LOWEST_FARE',
    label: 'Lowest Fare',
    desc: 'Always recommend the cheapest suitable ride among available options',
    icon: '💰',
  },
  {
    id: 'NO_PREFERENCE',
    label: 'No Preference',
    desc: 'Show all eligible rides without strict fare priority',
    icon: '✨',
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [preferredRideType, setPreferredRideType] = useState('ALL');
  const [numberOfPassengers, setNumberOfPassengers] = useState(1);
  const [ridePriority, setRidePriority] = useState('LOWEST_FARE');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const totalSteps = 4;

  useEffect(() => {
    // Check if returning user already completed onboarding
    const userInfoStr = localStorage.getItem('user_info');
    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        if (userInfo.onboardingCompleted || userInfo.hasCompletedOnboarding) {
          navigate('/dashboard', { replace: true });
        }
      } catch (e) {}
    }
  }, [navigate]);

  const handleFinalSave = async () => {
    setSaving(true);
    const rawPassengers = numberOfPassengers === '5+' ? 5 : numberOfPassengers;
    const prefData = {
      onboardingCompleted: true,
      preferredRideType,
      ridePriority,
      numberOfPassengers: rawPassengers,
    };

    try {
      await userService.updatePreferences(prefData);
    } catch (e) {
      console.warn('Failed to persist preferences to backend:', e);
    } finally {
      setSaving(false);
      
      // Update local storage
      const userInfoStr = localStorage.getItem('user_info');
      let userInfo = {};
      if (userInfoStr) {
        try { userInfo = JSON.parse(userInfoStr); } catch (_) {}
      }
      userInfo.onboardingCompleted = true;
      userInfo.hasCompletedOnboarding = true;
      userInfo.preferredRideType = preferredRideType;
      userInfo.ridePriority = ridePriority;
      userInfo.numberOfPassengers = rawPassengers;
      
      localStorage.setItem('user_info', JSON.stringify(userInfo));
      localStorage.setItem('user_preferences', JSON.stringify(prefData));
      
      navigate('/dashboard', { replace: true });
    }
  };

  const getRideTypeLabel = () => {
    const rt = RIDE_TYPES.find((r) => r.id === preferredRideType);
    return rt ? rt.label : preferredRideType;
  };

  const getPriorityLabel = () => {
    const p = REQUIREMENT_OPTIONS.find((o) => o.id === ridePriority);
    return p ? p.label : ridePriority;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div className="glass-panel" style={{
          maxWidth: '620px',
          width: '100%',
          padding: '40px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          position: 'relative',
        }}>

          {/* Progress Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : <div />}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {Array.from({ length: totalSteps }, (_, i) => (
                <React.Fragment key={i}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: step > i ? 'var(--accent-green)' : 'rgba(255,255,255,0.2)',
                    transition: 'all 0.3s ease',
                  }} />
                  {i < totalSteps - 1 && (
                    <div style={{ width: '28px', height: '2px', background: step > i + 1 ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)' }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>
              Step {step} of {totalSteps}
            </span>
          </div>

          {/* ─── STEP 1: Preferred Ride Type ─── */}
          {step === 1 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{
                  width: '64px', height: '64px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                  border: '1px solid rgba(16,185,129,0.3)',
                }}>
                  <Navigation size={32} color="var(--accent-green)" />
                </div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                  Tell us your <span className="gradient-text">ride requirements</span>
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                  Step 1 — Preferred Ride Type
                </p>
                <p style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '4px', fontWeight: 600 }}>
                  This is a filter preference — it does not artificially modify fares.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
                {RIDE_TYPES.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setPreferredRideType(item.id)}
                    style={{
                      background: preferredRideType === item.id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                      border: preferredRideType === item.id ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex', flexDirection: 'column', gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {item.icon}
                      {preferredRideType === item.id && <CheckCircle2 size={18} color="var(--accent-green)" />}
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>{item.label}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{item.desc}</p>
                  </div>
                ))}
              </div>

              <button onClick={() => setStep(2)} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px' }}>
                Continue <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ─── STEP 2: Number of Passengers ─── */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Users size={24} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Step 2 — Number of Passengers
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
                Used for <strong style={{ color: 'var(--accent-cyan)' }}>eligibility/capacity filtering</strong> only — does not modify fare calculations.
              </p>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '32px', justifyContent: 'center' }}>
                {PASSENGER_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumberOfPassengers(n)}
                    style={{
                      width: '68px', height: '68px',
                      borderRadius: '16px',
                      border: numberOfPassengers === n ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                      background: numberOfPassengers === n ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)',
                      color: numberOfPassengers === n ? 'var(--accent-green)' : 'var(--text-main)',
                      fontSize: '22px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {numberOfPassengers === 1 && (
                <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--accent-green)', marginBottom: '24px' }}>
                  ✓ All ride types (Bike, Auto, Cab) are eligible for 1 passenger
                </div>
              )}
              {numberOfPassengers === 2 && (
                <div style={{ background: 'rgba(6,182,212,0.08)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--accent-cyan)', marginBottom: '24px' }}>
                  ℹ Bike options filtered out (bikes carry 1 passenger max)
                </div>
              )}
              {numberOfPassengers === 3 && (
                <div style={{ background: 'rgba(6,182,212,0.08)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--accent-cyan)', marginBottom: '24px' }}>
                  ℹ Bike options filtered out (Auto/Cab carry up to 3+ passengers)
                </div>
              )}
              {(numberOfPassengers === 4 || numberOfPassengers === '5+') && (
                <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--accent-yellow)', marginBottom: '24px' }}>
                  ⚠ Cab options only (maximum passenger capacity)
                </div>
              )}

              <button onClick={() => setStep(3)} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px' }}>
                Continue <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ─── STEP 3: Ride Requirement ─── */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                Step 3 — Ride Requirement
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                What is most important for your ride?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
                {REQUIREMENT_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setRidePriority(opt.id)}
                    style={{
                      background: ridePriority === opt.id ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                      border: ridePriority === opt.id ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', gap: '16px',
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '16px', marginBottom: '2px' }}>{opt.label}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </div>
                    {ridePriority === opt.id && <CheckCircle2 size={22} color="var(--accent-green)" />}
                  </div>
                ))}
              </div>

              <button onClick={() => setStep(4)} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px' }}>
                Continue to Summary <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ─── STEP 4: Summary ─── */}
          {step === 4 && (
            <div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                Step 4 — Preferences Summary
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Review your ride requirements before entering the dashboard.
              </p>

              <div style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '16px',
                padding: '22px 24px',
                marginBottom: '28px'
              }}>
                <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
                  Your Requirement Configuration
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Preferred Ride Type</span>
                    <span style={{ fontWeight: 800, color: '#ffffff' }}>{getRideTypeLabel()}</span>
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Number of Passengers</span>
                    <span style={{ fontWeight: 800, color: '#ffffff' }}>{numberOfPassengers}</span>
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Ride Requirement</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-green)' }}>{getPriorityLabel()}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px' }}>
                <button
                  onClick={() => setStep(3)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '15px', fontSize: '15px' }}
                  disabled={saving}
                >
                  Back
                </button>
                <button
                  onClick={handleFinalSave}
                  className="btn-primary"
                  style={{ flex: 2, padding: '15px', fontSize: '15px' }}
                  disabled={saving}
                >
                  {saving
                    ? <><Loader2 size={20} className="animate-spin" /> Saving…</>
                    : <>Continue to Dashboard <ArrowRight size={18} /></>
                  }
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
