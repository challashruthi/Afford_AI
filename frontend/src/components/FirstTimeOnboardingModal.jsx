import React, { useState } from 'react';
import { userService } from '../services/api';
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
    label: 'No Preference',
    icon: <Sparkles size={26} color="var(--accent-yellow)" />,
    desc: 'Compare all vehicle options (default)',
    capacity: null,
  },
];

const PASSENGER_OPTIONS = [1, 2, 3, 4, '5+'];

const PRIORITY_OPTIONS = [
  {
    id: 'LOWEST_FARE',
    label: 'Lowest Fare',
    desc: 'Always show cheapest available ride',
    icon: '💰',
  },
  {
    id: 'NO_PREFERENCE',
    label: 'No Preference',
    desc: 'Show all eligible rides without fare priority',
    icon: '✨',
  },
];

export default function FirstTimeOnboardingModal({ isOpen, onComplete }) {
  const [step, setStep] = useState(1);
  const [preferredRideType, setPreferredRideType] = useState('ALL');
  const [numberOfPassengers, setNumberOfPassengers] = useState(1);
  const [ridePriority, setRidePriority] = useState('LOWEST_FARE');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const totalSteps = 4;

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
      localStorage.setItem('user_preferences', JSON.stringify(prefData));
      onComplete(prefData);
    }
  };

  const canProceedStep1 = true; // ride type always has a default
  const canProceedStep2 = numberOfPassengers !== null;
  const canProceedStep3 = ridePriority !== null;

  const getRideTypeLabel = () => {
    const rt = RIDE_TYPES.find((r) => r.id === preferredRideType);
    return rt ? rt.label : preferredRideType;
  };

  const getPriorityLabel = () => {
    const p = PRIORITY_OPTIONS.find((o) => o.id === ridePriority);
    return p ? p.label : ridePriority;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      backgroundColor: 'rgba(10, 15, 29, 0.9)',
      backdropFilter: 'blur(14px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div className="glass-panel" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '40px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        position: 'relative',
      }}>

        {/* Progress bar */}
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

        {/* ─── STEP 1: Welcome ─── */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '24px',
              border: '1px solid rgba(16,185,129,0.3)',
            }}>
              <Navigation size={40} color="var(--accent-green)" />
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
              Tell us your <span className="gradient-text">ride requirements</span>
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.65', marginBottom: '12px' }}>
              We'll personalise ride comparisons and recommendations based on your preferences. This takes just a moment.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '36px', opacity: 0.7 }}>
              Preferences can be changed anytime from the dashboard.
            </p>

            <button
              onClick={() => setStep(2)}
              className="btn-primary"
              style={{ width: '100%', padding: '15px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              Get Started <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ─── STEP 2: Preferred Ride Type ─── */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Preferred Ride Type
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              This is a <strong style={{ color: 'var(--accent-cyan)' }}>filter preference</strong> — it does not artificially change fares.
            </p>

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

            <button onClick={() => setStep(3)} className="btn-primary" style={{ width: '100%', padding: '14px' }}>
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ─── STEP 3: Number of Passengers ─── */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Users size={24} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Number of Passengers
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
              Used for <strong style={{ color: 'var(--accent-cyan)' }}>capacity filtering</strong> only — does not modify fare calculations.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
              {PASSENGER_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setNumberOfPassengers(n)}
                  style={{
                    width: '64px', height: '64px',
                    borderRadius: '14px',
                    border: numberOfPassengers === n ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                    background: numberOfPassengers === n ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)',
                    color: numberOfPassengers === n ? 'var(--accent-green)' : 'var(--text-main)',
                    fontSize: '20px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title={n === '5+' ? '5 or more passengers' : `${n} passenger${n > 1 ? 's' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>

            {numberOfPassengers === 1 && (
              <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: 'var(--accent-green)', marginBottom: '20px' }}>
                ✓ All ride types (Bike, Auto, Cab) will be available
              </div>
            )}
            {numberOfPassengers === 2 && (
              <div style={{ background: 'rgba(6,182,212,0.08)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: 'var(--accent-cyan)', marginBottom: '20px' }}>
                ℹ Bike options will be filtered out (bikes carry 1 passenger only)
              </div>
            )}
            {(numberOfPassengers === 3) && (
              <div style={{ background: 'rgba(6,182,212,0.08)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: 'var(--accent-cyan)', marginBottom: '20px' }}>
                ℹ Bike options will be filtered out (maximum 3 passengers for Auto/Cab)
              </div>
            )}
            {(numberOfPassengers === 4 || numberOfPassengers === '5+') && (
              <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: 'var(--accent-yellow)', marginBottom: '20px' }}>
                ⚠ Only Cab-type rides will be shown (maximum passenger capacity)
              </div>
            )}

            <button onClick={() => setStep(4)} className="btn-primary" style={{ width: '100%', padding: '14px' }}>
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ─── STEP 4: Ride Priority + Summary ─── */}
        {step === 4 && (
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              What matters most?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Select your ride priority preference.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {PRIORITY_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setRidePriority(opt.id)}
                  style={{
                    background: ridePriority === opt.id ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                    border: ridePriority === opt.id ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', gap: '14px',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px', marginBottom: '2px' }}>{opt.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                  {ridePriority === opt.id && <CheckCircle2 size={20} color="var(--accent-green)" />}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '14px', padding: '18px 20px', marginBottom: '24px' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>
                Your Saved Preferences
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Ride Type</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>{getRideTypeLabel()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Passengers</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>{numberOfPassengers}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Priority</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{getPriorityLabel()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleFinalSave}
              className="btn-primary"
              style={{ width: '100%', padding: '15px', fontSize: '16px' }}
              disabled={saving}
            >
              {saving
                ? <><Loader2 size={20} className="animate-spin" /> Saving…</>
                : <>Continue to Dashboard <ArrowRight size={18} /></>
              }
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
