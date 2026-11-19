import React, { useState, useEffect } from 'react';
import {
  Sliders, RefreshCw, CheckCircle2, IndianRupee, Users, Sparkles,
  Bike, Car, AlertCircle, RotateCcw, ArrowRight, ArrowLeft, Edit2, Check
} from 'lucide-react';
import { userService } from '../services/api';

const RIDE_TYPES = [
  {
    id: 'ALL',
    label: 'Any / All Rides',
    desc: 'Compare Bikes, Autos, and Cabs simultaneously (Recommended)',
    icon: <Sparkles size={18} color="var(--accent-yellow)" />
  },
  {
    id: 'BIKE',
    label: 'Bike',
    desc: 'Fastest travel & lowest fares for solo commuters',
    icon: <Bike size={18} color="var(--accent-green)" />
  },
  {
    id: 'AUTO',
    label: 'Auto',
    desc: 'Economical 3-wheelers for short and medium urban trips',
    icon: <span style={{ fontSize: '18px', lineHeight: 1 }}>🛺</span>
  },
  {
    id: 'CAB',
    label: 'Cab',
    desc: 'Air-conditioned 4-wheelers for comfort and group rides',
    icon: <Car size={18} color="var(--accent-cyan)" />
  },
];

const PASSENGER_OPTIONS = [1, 2, 3, 4, '5+'];

const WIZARD_STEPS = [
  { step: 1, title: 'Maximum Budget', shortLabel: 'Budget' },
  { step: 2, title: 'Ride Type', shortLabel: 'Ride Type' },
  { step: 3, title: 'Passengers', shortLabel: 'Passengers' },
  { step: 4, title: 'Review & Save', shortLabel: 'Review' },
];

export default function UserPreferencesBar({ preferences, onUpdate, onResetOnboarding }) {
  // Wizard step state (1 to 4)
  const [step, setStep] = useState(1);
  const [editingFromReview, setEditingFromReview] = useState(false);

  // Preference fields state
  const [budgetMode, setBudgetMode] = useState(
    preferences?.maxBudget != null && preferences?.maxBudget > 0 ? 'CUSTOM' : 'NO_LIMIT'
  );
  const [budget, setBudget] = useState(
    preferences?.maxBudget != null && preferences?.maxBudget > 0 ? preferences.maxBudget.toString() : ''
  );
  const [rideType, setRideType] = useState(preferences?.preferredRideType || 'ALL');
  const [passengers, setPassengers] = useState(preferences?.numberOfPassengers || 1);

  // Status and feedback
  const [saving, setSaving] = useState(false);
  const [budgetError, setBudgetError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Sync state whenever parent preferences change
  useEffect(() => {
    if (preferences) {
      if (preferences.maxBudget != null && preferences.maxBudget > 0) {
        setBudgetMode('CUSTOM');
        setBudget(preferences.maxBudget.toString());
      } else {
        setBudgetMode('NO_LIMIT');
        setBudget('');
      }
      setRideType(preferences.preferredRideType || 'ALL');
      setPassengers(preferences.numberOfPassengers || 1);
    }
  }, [preferences]);

  // Navigate to next step with validation
  const handleNext = () => {
    setBudgetError('');

    // Step 1 validation
    if (step === 1) {
      if (budgetMode === 'CUSTOM') {
        const trimmed = budget.toString().trim();
        if (!trimmed) {
          setBudgetError('Please enter a budget amount in ₹ or select "No Budget Limit".');
          return;
        }
        const parsed = parseFloat(trimmed);
        if (isNaN(parsed) || parsed <= 0) {
          setBudgetError('Please enter a valid positive budget amount in ₹ (e.g. 150).');
          return;
        }
      }
    }

    if (editingFromReview) {
      setStep(4);
      setEditingFromReview(false);
      return;
    }

    if (step < 4) {
      setStep(step + 1);
    }
  };

  // Navigate back preserving selections
  const handleBack = () => {
    setBudgetError('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Jump to specific step for editing from Review & Save
  const handleEditStep = (targetStep) => {
    setBudgetError('');
    setEditingFromReview(true);
    setStep(targetStep);
  };

  // Return directly to Review step if user was editing
  const handleReturnToReview = () => {
    // Validate Step 1 if returning from Step 1
    if (step === 1 && budgetMode === 'CUSTOM') {
      const trimmed = budget.toString().trim();
      if (!trimmed) {
        setBudgetError('Please enter a budget amount in ₹ or select "No Budget Limit".');
        return;
      }
      const parsed = parseFloat(trimmed);
      if (isNaN(parsed) || parsed <= 0) {
        setBudgetError('Please enter a valid positive budget amount in ₹ (e.g. 150).');
        return;
      }
    }
    setBudgetError('');
    setStep(4);
    setEditingFromReview(false);
  };

  // Start Over: Resets draft values inside wizard to default and returns to Step 1
  const handleStartOver = () => {
    setBudgetMode('NO_LIMIT');
    setBudget('');
    setRideType('ALL');
    setPassengers(1);
    setBudgetError('');
    setEditingFromReview(false);
    setStep(1);
    setFeedbackMsg('Wizard reset to default starting preferences.');
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // Save Preferences to backend & localStorage
  const handleSavePreferences = async (e) => {
    if (e) e.preventDefault();
    setBudgetError('');
    setFeedbackMsg('');

    let budgetVal = null;
    if (budgetMode === 'CUSTOM') {
      const parsed = parseFloat(budget);
      if (isNaN(parsed) || parsed <= 0) {
        setBudgetError('Please enter a valid positive budget amount in ₹ (e.g. 150).');
        setStep(1);
        return;
      }
      budgetVal = Math.round(parsed * 100) / 100;
    }

    setSaving(true);
    const rawPassengers = typeof passengers === 'string' && passengers.includes('5') ? 5 : Number(passengers);

    const updated = {
      ...preferences,
      maxBudget: budgetVal,
      preferredRideType: rideType,
      numberOfPassengers: rawPassengers,
      ridePriority: 'LOWEST_FARE', // Recommendation always strictly lowest fare
    };

    try {
      await userService.updatePreferences(updated);
    } catch (err) {
      console.warn('Backend preferences update error, falling back to local storage:', err);
    } finally {
      setSaving(false);
      localStorage.setItem('user_preferences', JSON.stringify(updated));
      onUpdate(updated);
      setEditingFromReview(false);
      setFeedbackMsg('✓ Preferences saved successfully! Applied to rides and comparison matrix.');
      setTimeout(() => setFeedbackMsg(''), 4500);
    }
  };

  // Display labels for active summary tags in header
  const activeBudget = preferences?.maxBudget != null && preferences.maxBudget > 0 ? preferences.maxBudget : null;
  const activeType = preferences?.preferredRideType || 'ALL';
  const activePax = preferences?.numberOfPassengers || 1;

  // Helpers for summary labels
  const getRideTypeLabel = () => {
    const found = RIDE_TYPES.find((r) => r.id === rideType);
    return found ? found.label : rideType;
  };

  return (
    <div
      id="my-ride-preferences-section"
      className="glass-panel"
      style={{
        padding: '24px',
        marginBottom: '26px',
        borderLeft: '4px solid var(--accent-green)',
        position: 'relative',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* ── Section Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(16,185,129,0.18)',
            border: '1px solid rgba(16,185,129,0.35)',
            width: '38px', height: '38px',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sliders size={18} color="var(--accent-green)" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              My Ride Preferences
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Step-by-step preference wizard for personalized ride recommendations and comparison matrix
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Active summary tags showing currently saved values */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              background: activeBudget ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
              border: activeBudget ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-color)',
              color: activeBudget ? 'var(--accent-green)' : 'var(--text-muted)',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              {activeBudget ? `Budget: ≤ ₹${activeBudget}` : 'No Budget Limit'}
            </span>

            <span style={{
              background: 'rgba(6,182,212,0.15)',
              border: '1px solid rgba(6,182,212,0.3)',
              color: 'var(--accent-cyan)',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              {activeType === 'ALL' ? 'Any Ride' : activeType}
            </span>

            <span style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              {activePax} pax
            </span>
          </div>

          {onResetOnboarding && (
            <button
              id="reset-onboarding-btn"
              onClick={onResetOnboarding}
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5',
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
                transition: 'all 0.2s ease',
              }}
              title="Re-trigger onboarding flow for testing"
            >
              <RotateCcw size={11} /> Reset Onboarding
            </button>
          )}
        </div>
      </div>

      {/* ── Status Feedback Banners ── */}
      {feedbackMsg && (
        <div style={{
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.35)',
          color: 'var(--accent-green)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} /> {feedbackMsg}
        </div>
      )}

      {budgetError && (
        <div style={{
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.35)',
          color: '#fca5a5',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} /> {budgetError}
        </div>
      )}

      {/* ── Stepper Progress Bar & Indicator ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        marginBottom: '22px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: 'rgba(16,185,129,0.18)',
              border: '1px solid rgba(16,185,129,0.35)',
              color: 'var(--accent-green)',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.5px'
            }}>
              STEP {step} OF {WIZARD_STEPS.length}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
              {WIZARD_STEPS[step - 1]?.title}
            </span>
          </div>

          {editingFromReview && (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--accent-yellow)',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              ✏️ Editing from Review
            </span>
          )}
        </div>

        {/* Multi-step progress tracks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          {WIZARD_STEPS.map((s) => {
            const isCompleted = step > s.step;
            const isCurrent = step === s.step;

            return (
              <div
                key={s.step}
                onClick={() => {
                  if (isCompleted || s.step <= step) {
                    setBudgetError('');
                    setStep(s.step);
                  }
                }}
                title={`Step ${s.step}: ${s.title}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  cursor: (isCompleted || s.step <= step) ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  height: '6px',
                  borderRadius: '4px',
                  background: isCurrent
                    ? 'var(--accent-green)'
                    : isCompleted
                    ? 'rgba(16,185,129,0.6)'
                    : 'rgba(255,255,255,0.08)',
                  boxShadow: isCurrent ? '0 0 10px rgba(16,185,129,0.5)' : 'none',
                  transition: 'all 0.3s ease',
                }} />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 2px'
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: isCurrent ? 800 : 600,
                    color: isCurrent ? 'var(--accent-green)' : isCompleted ? '#cbd5e1' : '#6b7280',
                    transition: 'color 0.2s ease',
                  }}>
                    {s.shortLabel}
                  </span>
                  {isCompleted && <Check size={10} color="var(--accent-green)" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Wizard Step Form Content ── */}
      <div style={{ minHeight: '260px' }}>

        {/* ════════════════════════════════════════════════════════════════════
            STEP 1: Maximum Budget
            ════════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                Maximum Budget Limit
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Set a spending limit in ₹. Rides with estimated fares above this ceiling will be filtered out.
              </p>
            </div>

            {/* Budget Mode Radio Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              <label
                id="pref-budget-mode-no-limit-label"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: budgetMode === 'NO_LIMIT' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                  border: budgetMode === 'NO_LIMIT' ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  id="pref-budget-mode-no-limit"
                  type="radio"
                  name="budgetMode"
                  value="NO_LIMIT"
                  checked={budgetMode === 'NO_LIMIT'}
                  onChange={() => {
                    setBudgetMode('NO_LIMIT');
                    setBudgetError('');
                  }}
                  style={{ accentColor: 'var(--accent-green)', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px', marginBottom: '2px' }}>
                    No Budget Limit
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Display all available ride options regardless of fare cost
                  </div>
                </div>
              </label>

              <label
                id="pref-budget-mode-custom-label"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: budgetMode === 'CUSTOM' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                  border: budgetMode === 'CUSTOM' ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  id="pref-budget-mode-custom"
                  type="radio"
                  name="budgetMode"
                  value="CUSTOM"
                  checked={budgetMode === 'CUSTOM'}
                  onChange={() => {
                    setBudgetMode('CUSTOM');
                    setBudgetError('');
                  }}
                  style={{ accentColor: 'var(--accent-green)', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px', marginBottom: '2px' }}>
                    Custom Maximum Budget
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Specify a maximum upper bound fare limit in ₹
                  </div>
                </div>
              </label>
            </div>

            {/* Custom Budget Input Box (Active only when CUSTOM is selected) */}
            {budgetMode === 'CUSTOM' && (
              <div style={{
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <label htmlFor="pref-budget-input" style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                  Enter Maximum Budget Amount (₹)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '320px' }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <IndianRupee size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-green)' }} />
                    <input
                      id="pref-budget-input"
                      type="number"
                      min="1"
                      step="5"
                      placeholder="e.g. 150"
                      value={budget}
                      onChange={(e) => {
                        setBudget(e.target.value);
                        setBudgetError('');
                      }}
                      style={{
                        paddingLeft: '34px',
                        width: '100%',
                        height: '42px',
                        fontSize: '15px',
                        fontWeight: 700,
                        background: 'rgba(0,0,0,0.3)',
                        borderColor: budgetError ? 'rgba(239,68,68,0.6)' : 'var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#ffffff'
                      }}
                    />
                  </div>
                </div>

                {/* Preset quick-pick chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Presets:</span>
                  {[50, 100, 150, 200, 300].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setBudget(preset.toString());
                        setBudgetError('');
                      }}
                      style={{
                        background: budget === preset.toString() ? 'var(--accent-green)' : 'rgba(255,255,255,0.06)',
                        color: budget === preset.toString() ? '#ffffff' : '#cbd5e1',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '2px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1 Navigation Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              {editingFromReview && (
                <button
                  id="wizard-return-review-btn"
                  type="button"
                  onClick={handleReturnToReview}
                  className="btn-secondary"
                  style={{ padding: '9px 16px', fontSize: '13px' }}
                >
                  Return to Review
                </button>
              )}
              <button
                id="wizard-next-btn"
                type="button"
                onClick={handleNext}
                className="btn-primary"
                style={{ padding: '9px 22px', fontSize: '13px' }}
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 2: Preferred Ride Type
            ════════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                Preferred Ride Category
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Select a preferred category to automatically filter rides (or keep "Any / All Rides" to compare all modes).
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {RIDE_TYPES.map((rt) => {
                const isSelected = rideType === rt.id;
                return (
                  <div
                    key={rt.id}
                    id={`pref-type-${rt.id.toLowerCase()}`}
                    onClick={() => setRideType(rt.id)}
                    style={{
                      background: isSelected ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative',
                      boxShadow: isSelected ? '0 0 16px rgba(16,185,129,0.2)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '8px',
                        background: isSelected ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {rt.icon}
                      </div>
                      {isSelected && <CheckCircle2 size={16} color="var(--accent-green)" />}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                        {rt.label}
                      </h4>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {rt.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 2 Navigation Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '16px' }}>
              <button
                id="wizard-back-btn"
                type="button"
                onClick={handleBack}
                className="btn-secondary"
                style={{ padding: '9px 18px', fontSize: '13px' }}
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {editingFromReview && (
                  <button
                    id="wizard-return-review-btn"
                    type="button"
                    onClick={handleReturnToReview}
                    className="btn-secondary"
                    style={{ padding: '9px 16px', fontSize: '13px' }}
                  >
                    Return to Review
                  </button>
                )}

                <button
                  id="wizard-next-btn"
                  type="button"
                  onClick={handleNext}
                  className="btn-primary"
                  style={{ padding: '9px 22px', fontSize: '13px' }}
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 3: Passenger Count
            ════════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                Passenger Count
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Specify number of passengers traveling to ensure vehicle capacity compatibility (exactly one selection allowed).
              </p>
            </div>

            {/* Passenger Count Selection Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
              {PASSENGER_OPTIONS.map((n) => {
                const isSelected = passengers === n || (n === '5+' && passengers >= 5);
                return (
                  <button
                    key={n}
                    id={`pref-pax-${n}`}
                    type="button"
                    onClick={() => setPassengers(n === '5+' ? 5 : n)}
                    style={{
                      flex: '1 1 60px',
                      maxWidth: '120px',
                      height: '52px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? 'var(--accent-green)' : 'var(--text-main)',
                      border: isSelected ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                      fontSize: '16px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: isSelected ? '0 0 12px rgba(16,185,129,0.25)' : 'none',
                    }}
                  >
                    <Users size={15} color={isSelected ? 'var(--accent-green)' : '#9ca3af'} />
                    <span>{n}</span>
                  </button>
                );
              })}
            </div>

            {/* Capacity Guide Info Box */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginBottom: '20px'
            }}>
              {passengers === 1 ? (
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                  ✓ 1 passenger: All vehicle categories (Bike, Auto, Cab) are fully eligible.
                </span>
              ) : passengers === 2 || passengers === 3 ? (
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  ℹ {passengers} passengers: Bikes are automatically filtered out (capacity 1). Autos and Cabs eligible.
                </span>
              ) : (
                <span style={{ color: 'var(--accent-yellow)', fontWeight: 600 }}>
                  ⚠ {passengers} passengers: Cab options only (maximum passenger capacity).
                </span>
              )}
            </div>

            {/* Step 3 Navigation Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '16px' }}>
              <button
                id="wizard-back-btn"
                type="button"
                onClick={handleBack}
                className="btn-secondary"
                style={{ padding: '9px 18px', fontSize: '13px' }}
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {editingFromReview && (
                  <button
                    id="wizard-return-review-btn"
                    type="button"
                    onClick={handleReturnToReview}
                    className="btn-secondary"
                    style={{ padding: '9px 16px', fontSize: '13px' }}
                  >
                    Return to Review
                  </button>
                )}

                <button
                  id="wizard-next-btn"
                  type="button"
                  onClick={handleNext}
                  className="btn-primary"
                  style={{ padding: '9px 22px', fontSize: '13px' }}
                >
                  Review &amp; Save <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 4: Review & Save
            ════════════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                Review &amp; Save Preferences
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Review your configured preferences below. Click "Edit" on any preference to modify it before saving.
              </p>
            </div>

            {/* Compact Summary Cards Grid (3 cards) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginBottom: '22px'
            }}>
              {/* 1. Budget Summary Item */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Maximum Budget
                    </span>
                    <button
                      id="edit-pref-budget"
                      type="button"
                      onClick={() => handleEditStep(1)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-green)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '3px',
                        padding: 0
                      }}
                    >
                      <Edit2 size={11} /> Edit
                    </button>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: budgetMode === 'CUSTOM' && budget ? 'var(--accent-green)' : '#ffffff' }}>
                    {budgetMode === 'CUSTOM' && budget ? `≤ ₹${budget}` : 'No Budget Limit'}
                  </div>
                </div>
                <span style={{ fontSize: '10px', color: '#6b7280' }}>
                  {budgetMode === 'CUSTOM' && budget ? 'Excluded if fare exceeds ceiling' : 'All fare amounts eligible'}
                </span>
              </div>

              {/* 2. Preferred Ride Type Summary Item */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Preferred Ride Type
                    </span>
                    <button
                      id="edit-pref-type"
                      type="button"
                      onClick={() => handleEditStep(2)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-green)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '3px',
                        padding: 0
                      }}
                    >
                      <Edit2 size={11} /> Edit
                    </button>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {getRideTypeLabel()}
                  </div>
                </div>
                <span style={{ fontSize: '10px', color: '#6b7280' }}>
                  Applied as category filter
                </span>
              </div>

              {/* 3. Passenger Count Summary Item */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Passenger Count
                    </span>
                    <button
                      id="edit-pref-pax"
                      type="button"
                      onClick={() => handleEditStep(3)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-green)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '3px',
                        padding: 0
                      }}
                    >
                      <Edit2 size={11} /> Edit
                    </button>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                    {passengers} {passengers === 1 ? 'Passenger' : 'Passengers'}
                  </div>
                </div>
                <span style={{ fontSize: '10px', color: '#6b7280' }}>
                  Capacity filter applied
                </span>
              </div>
            </div>

            {/* Step 4 Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <button
                id="wizard-back-btn"
                type="button"
                onClick={handleBack}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
                disabled={saving}
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  id="start-over-btn"
                  type="button"
                  onClick={handleStartOver}
                  disabled={saving}
                  className="btn-secondary"
                  style={{
                    padding: '10px 18px',
                    fontSize: '13px',
                    color: '#fca5a5',
                    borderColor: 'rgba(239,68,68,0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Reset wizard draft preferences back to initial default values"
                >
                  <RefreshCw size={13} /> Start Over
                </button>

                <button
                  id="save-preferences-btn"
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="btn-primary"
                  style={{
                    padding: '10px 24px',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {saving ? (
                    <>Saving Preferences...</>
                  ) : (
                    <>
                      <CheckCircle2 size={15} /> Save Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
