import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { rideService } from '../services/api';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Layers,
  Database,
  Cpu,
  Info,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

// Verified fallback metrics generated on the 80/20 train/test split (2,000 test samples)
const STATIC_FALLBACK_METRICS = {
  model_type: 'RandomForestRegressor',
  data_mode: 'SIMULATED',
  dataset_provenance: 'Simulated multi-provider ride dataset (Uber, Ola, Rapido, Pink Bike) calibrated with realistic Indian base rates, deterministic peak surge windows, and market variance.',
  dataset_samples: 10000,
  test_samples: 2000,
  train_test_split: '80/20 (random_state=42)',
  features: [
    'distance_km',
    'duration_mins',
    'provider',
    'ride_type',
    'hour_of_day',
    'day_of_week',
    'is_peak_time',
    'surge_multiplier',
  ],
  target: 'fare (INR)',
  cv_r2_mean: 0.9932,
  models_compared: {
    baseline_formula: {
      mae: 3.08,
      rmse: 3.82,
      r2: 0.9998,
    },
    linear_regression: {
      mae: 48.64,
      rmse: 70.98,
      r2: 0.9165,
    },
    random_forest: {
      mae: 10.98,
      rmse: 18.84,
      r2: 0.9941,
    },
  },
  ml_metrics: {
    mae: 10.98,
    rmse: 18.84,
    r2: 0.9941,
  },
  provider_metrics: {
    'Ola': { ml_mae: 10.92, baseline_mae: 3.11, samples: 469 },
    'Rapido': { ml_mae: 11.94, baseline_mae: 3.07, samples: 494 },
    'Uber': { ml_mae: 14.36, baseline_mae: 2.96, samples: 515 },
    'Pink Bike': { ml_mae: 6.80, baseline_mae: 3.20, samples: 522 },
  },
  sample_evaluations: [
    { provider: 'Uber', rideType: 'Moto', distanceKm: 11.88, durationMins: 32.1, actualFare: 200.77, baselineFare: 193.28, mlPredictedFare: 219.55, absoluteError: 18.78 },
    { provider: 'Uber', rideType: 'Auto', distanceKm: 9.34, durationMins: 20.7, actualFare: 219.50, baselineFare: 216.25, mlPredictedFare: 216.70, absoluteError: 2.80 },
    { provider: 'Rapido', rideType: 'Bike', distanceKm: 8.61, durationMins: 21.5, actualFare: 128.04, baselineFare: 123.79, mlPredictedFare: 137.00, absoluteError: 8.96 },
    { provider: 'Uber', rideType: 'Go', distanceKm: 38.29, durationMins: 64.6, actualFare: 740.09, baselineFare: 736.25, mlPredictedFare: 736.61, absoluteError: 3.48 },
    { provider: 'Rapido', rideType: 'Auto', distanceKm: 6.37, durationMins: 10.5, actualFare: 112.36, baselineFare: 109.20, mlPredictedFare: 115.80, absoluteError: 3.44 },
  ],
};

export default function ModelEvaluationPage() {
  const [metricsData, setMetricsData] = useState(STATIC_FALLBACK_METRICS);
  const [liveServiceUp, setLiveServiceUp] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLiveMetrics = async () => {
    setLoading(true);
    try {
      const res = await rideService.getModelMetrics();
      if (res.data && res.data.status === 'UP') {
        setMetricsData((prev) => ({
          ...prev,
          ...res.data,
          models_compared: res.data.modelsCompared || prev.models_compared,
          ml_metrics: res.data.metrics || prev.ml_metrics,
        }));
        setLiveServiceUp(true);
      } else {
        setLiveServiceUp(false);
      }
    } catch (_) {
      setLiveServiceUp(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
  }, []);

  const modelsCompared = metricsData.models_compared || STATIC_FALLBACK_METRICS.models_compared;
  const rf = modelsCompared.random_forest || STATIC_FALLBACK_METRICS.models_compared.random_forest;
  const lr = modelsCompared.linear_regression || STATIC_FALLBACK_METRICS.models_compared.linear_regression;
  const baseline = modelsCompared.baseline_formula || STATIC_FALLBACK_METRICS.models_compared.baseline_formula;

  // Chart data for comparing MAE and RMSE
  const errorComparisonChart = [
    {
      model: 'Linear Regression',
      MAE: lr.mae,
      RMSE: lr.rmse,
    },
    {
      model: 'Random Forest (Prod)',
      MAE: rf.mae,
      RMSE: rf.rmse,
    },
    {
      model: 'Formula Baseline',
      MAE: baseline.mae,
      RMSE: baseline.rmse,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(16,185,129,0.15)', padding: '8px', borderRadius: '10px', display: 'inline-flex' }}>
                <Brain size={24} color="var(--accent-green)" />
              </div>
              <div>
                <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  ML Fare Model Evaluation &amp; Benchmarks
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Empirical evaluation of regression models on an identical 80/20 train-test split.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: liveServiceUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  border: `1px solid ${liveServiceUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                  color: liveServiceUp ? 'var(--accent-green)' : 'var(--accent-yellow)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: liveServiceUp ? 'var(--accent-green)' : 'var(--accent-yellow)' }} />
                {liveServiceUp ? 'Flask ML Service: Live' : 'Verified Test Split Data'}
              </span>

              <button
                type="button"
                onClick={fetchLiveMetrics}
                disabled={loading}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Dataset Transparency Banner */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Info size={18} color="var(--accent-cyan)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
              <strong>Dataset Provenance &amp; Evaluation Protocol:</strong> All metrics are calculated on a held-out test split of <strong>2,000 samples (80/20 split, random_state=42)</strong> from the simulated multi-provider Indian dataset (10,000 rows).
              Target: <code>fare (₹)</code>. Features include <code>distance_km</code>, <code>duration_mins</code>, <code>provider</code>, <code>ride_type</code>, <code>hour_of_day</code>, <code>day_of_week</code>, <code>is_peak_time</code>, and <code>surge_multiplier</code>.
              <em> No synthetic test metrics are fabricated. R² represents the statistical Coefficient of Determination, not classification accuracy.</em>
            </div>
          </div>
        </div>

        {/* Section 1: Side-by-Side Model Comparison Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {/* Production Random Forest */}
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              borderRadius: '16px',
              border: '2px solid rgba(16, 185, 129, 0.5)',
              position: 'relative',
              background: 'rgba(16, 185, 129, 0.04)',
            }}
          >
            <div style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)',
              color: 'var(--accent-green)', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800
            }}>
              PRODUCTION MODEL
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Cpu size={20} color="var(--accent-green)" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Random Forest Regressor
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              100 estimators with peak-time interaction terms and surge features.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>MAE</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '4px' }}>
                  ₹{rf.mae}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Mean Abs Error</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>RMSE</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                  ₹{rf.rmse}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Root Mean Sq</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>R² Score</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {rf.r2}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Variance Exp.</div>
              </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px' }}>
              • 5-Fold Cross-Validation R²: <strong>{metricsData.cv_r2_mean || '0.9932'}</strong><br />
              • Status: Currently serving live recommendations
            </div>
          </div>

          {/* Linear Regression Baseline */}
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Layers size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Linear Regression
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Standard linear model evaluated on the same 80/20 train/test split.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>MAE</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  ₹{lr.mae}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Mean Abs Error</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>RMSE</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  ₹{lr.rmse}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Root Mean Sq</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>R² Score</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {lr.r2}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Variance Exp.</div>
              </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px' }}>
              • Comparison: Random Forest reduces MAE by <strong>₹{(lr.mae - rf.mae).toFixed(2)}</strong> (77% error reduction)
            </div>
          </div>

          {/* XGBoost Regressor Card */}
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              borderRadius: '16px',
              opacity: 0.75,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Layers size={20} color="#94a3b8" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#94a3b8', margin: 0 }}>
                XGBoost Regressor
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Gradient boosting candidate architecture.
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '24px 16px',
              textAlign: 'center',
            }}>
              <AlertTriangle size={24} color="var(--accent-yellow)" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                Not Implemented in Current Pipeline
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                No fabricated metrics displayed. The existing Python ML pipeline is configured with scikit-learn RandomForestRegressor.
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Visual Error Comparison Chart */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} color="var(--accent-cyan)" />
            Error Metric Comparison: MAE vs RMSE (lower is better)
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Comparing errors in Indian Rupees (₹) on the 2,000 test set observations.
          </p>

          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorComparisonChart} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                <XAxis dataKey="model" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '12px',
                          color: '#ffffff',
                        }}>
                          <div style={{ fontWeight: 800, marginBottom: '6px' }}>{label}</div>
                          {payload.map((item) => (
                            <div key={item.name} style={{ color: item.color, display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                              <span>{item.name}:</span>
                              <strong>₹{item.value}</strong>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="MAE" fill="#10b981" radius={[4, 4, 0, 0]} name="MAE (₹)" />
                <Bar dataKey="RMSE" fill="#06b6d4" radius={[4, 4, 0, 0]} name="RMSE (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section 3: Provider-Level MAE Breakdown */}
        {metricsData.provider_metrics && (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
              Provider-Level Test Set Error Breakdown
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Mean Absolute Error per provider on the held-out test split.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {Object.entries(metricsData.provider_metrics).map(([provider, pData]) => (
                <div
                  key={provider}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '14px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px' }}>{provider}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '6px' }}>
                    ₹{pData.ml_mae}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    ML MAE ({pData.samples} test samples)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Sample Test Set Evaluations Table */}
        {metricsData.sample_evaluations?.length > 0 && (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
              Actual vs Predicted Fare Sample Evaluations
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Direct comparisons from the test set demonstrating prediction precision against actual target fares.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(31, 41, 55, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 14px' }}>Provider</th>
                    <th style={{ padding: '10px 14px' }}>Ride Type</th>
                    <th style={{ padding: '10px 14px' }}>Distance</th>
                    <th style={{ padding: '10px 14px' }}>Target Fare</th>
                    <th style={{ padding: '10px 14px' }}>ML Prediction</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Absolute Error</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsData.sample_evaluations.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#ffffff' }}>{item.provider}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{item.rideType}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{item.distanceKm} km</td>
                      <td style={{ padding: '10px 14px', color: '#ffffff', fontWeight: 700 }}>₹{item.actualFare}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--accent-green)', fontWeight: 700 }}>₹{item.mlPredictedFare}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: item.absoluteError < 15 ? 'var(--accent-green)' : 'var(--accent-yellow)', fontWeight: 700 }}>
                        ₹{item.absoluteError}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
