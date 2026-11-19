import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Info,
} from 'lucide-react';
import {
  getObservations,
  subscribe,
  predictionModeLabel,
} from '../services/fareHistoryStore';
import { rideService } from '../services/api';

function normProvider(name) {
  const n = (name ?? '').toLowerCase();
  if (n.includes('ola'))    return 'Ola';
  if (n.includes('rapido')) return 'Rapido';
  if (n.includes('uber'))   return 'Uber';
  if (n.includes('pink'))   return 'Pink Bike';
  return name;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_COLORS = {
  Ola:       '#10b981',   // emerald green
  Rapido:    '#f59e0b',   // amber
  Uber:      '#06b6d4',   // cyan
  'Pink Bike': '#ec4899', // pink
};

const DEFAULT_PROVIDER_KEYS = ['Ola', 'Rapido', 'Uber'];
const ALL_PROVIDER_KEYS = ['Ola', 'Rapido', 'Uber', 'Pink Bike'];

const WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(ts) {
  const diffMs = Date.now() - ts;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin === 0) return 'Now';
  if (diffMin === 1) return '1 min ago';
  return `${diffMin} min ago`;
}

function formatAbsTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Build chart-friendly rows from observations.
 * Each row: { timestamp, label, Ola, Rapido, Uber, _raw: { Ola: obs, Rapido: obs, ... } }
 */
function buildChartData(observations, providerKeys = DEFAULT_PROVIDER_KEYS) {
  if (!observations || observations.length === 0) return [];

  // Sort by time ascending
  const sorted = [...observations].sort((a, b) => a.timestamp - b.timestamp);

  // Group observations into 5-second time snapshot buckets
  const BUCKET_INTERVAL_MS = 5000;
  const buckets = {};
  for (const obs of sorted) {
    const bKey = Math.floor(obs.timestamp / BUCKET_INTERVAL_MS) * BUCKET_INTERVAL_MS;
    if (!buckets[bKey]) {
      buckets[bKey] = { ts: bKey, perProvider: {} };
    }
    buckets[bKey].perProvider[obs.provider] = obs;
  }

  const bucketKeys = Object.keys(buckets).sort((a, b) => Number(a) - Number(b));

  const lastKnownFare = {};
  const lastKnownObs = {};

  return bucketKeys.map((key) => {
    const bucket = buckets[key];
    const timeFormatted = new Date(bucket.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const row = {
      timestamp: bucket.ts,
      label: timeFormatted,
      _raw: {},
    };

    for (const prov of providerKeys) {
      if (bucket.perProvider[prov]) {
        const obs = bucket.perProvider[prov];
        row[prov] = obs.predictedFare;
        row._raw[prov] = obs;
        lastKnownFare[prov] = obs.predictedFare;
        lastKnownObs[prov] = obs;
      } else if (lastKnownFare[prov] !== undefined) {
        // Carry forward previous known fare so lines remain continuous
        row[prov] = lastKnownFare[prov];
        row._raw[prov] = lastKnownObs[prov];
      }
    }

    return row;
  });
}

/**
 * Get the most recent observation for a provider from observations list.
 */
function latestFor(observations, provider) {
  const provObs = observations
    .filter((o) => o.provider === provider)
    .sort((a, b) => b.timestamp - a.timestamp);
  return provObs[0] ?? null;
}

function previousFor(observations, provider) {
  const provObs = observations
    .filter((o) => o.provider === provider)
    .sort((a, b) => b.timestamp - a.timestamp);
  return provObs[1] ?? null;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.97)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '12px',
      padding: '14px 18px',
      fontSize: '13px',
      color: '#f3f4f6',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      minWidth: '220px',
    }}>
      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
        Point Time: {label}
      </div>
      {payload.map((entry) => {
        const obs = entry.payload?._raw?.[entry.name];
        return (
          <div key={entry.name} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: PROVIDER_COLORS[entry.name] ?? '#888',
                display: 'inline-block', flexShrink: 0,
              }} />
              <strong style={{ color: PROVIDER_COLORS[entry.name] ?? '#fff', fontSize: '14px' }}>
                {entry.name}
              </strong>
            </div>
            {obs ? (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#9ca3af', paddingRight: '8px' }}>Ride Type</td>
                    <td style={{ fontWeight: 600 }}>{obs.rideType}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#9ca3af', paddingRight: '8px' }}>Exact Time</td>
                    <td style={{ fontWeight: 600 }}>{formatAbsTime(obs.timestamp)} ({formatRelativeTime(obs.timestamp)})</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#9ca3af', paddingRight: '8px' }}>Predicted Fare</td>
                    <td style={{ fontWeight: 800, color: PROVIDER_COLORS[entry.name] ?? '#fff' }}>
                      ₹{obs.predictedFare}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#9ca3af', paddingRight: '8px' }}>Surge Multiplier</td>
                    <td style={{ fontWeight: 600, color: (obs.surgeMultiplier ?? obs.surgeFactor ?? 1.0) > 1.0 ? '#f59e0b' : '#10b981' }}>
                      {obs.surgeMultiplier ?? obs.surgeFactor ?? 1.0}x
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#9ca3af', paddingRight: '8px' }}>Route Distance</td>
                    <td style={{ fontWeight: 600 }}>{obs.distanceKm} km</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#9ca3af', paddingRight: '8px' }}>Mode</td>
                    <td style={{ fontWeight: 600, color: '#a78bfa' }}>
                      {predictionModeLabel(obs.predictionMode)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ color: '#9ca3af' }}>Fare: ₹{entry.value}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Summary Stats Row ────────────────────────────────────────────────────────

function FareSummaryCard({ label, provider, observations, color }) {
  const current = latestFor(observations, provider);
  const prev    = previousFor(observations, provider);

  if (!current) {
    return (
      <div style={{
        flex: '1 1 180px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '14px 16px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>No observations yet</div>
      </div>
    );
  }

  const diff = prev ? current.predictedFare - prev.predictedFare : null;
  const pct  = (prev && prev.predictedFare !== 0) ? (diff / prev.predictedFare) * 100 : null;
  const isUp = diff !== null && diff > 0;
  const isDown = diff !== null && diff < 0;

  return (
    <div style={{
      flex: '1 1 180px',
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${color}30`,
      borderRadius: '12px',
      padding: '14px 16px',
    }}>
      {/* Provider badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>

      {/* Current Fare */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Fare</div>
        <div style={{ fontSize: '22px', fontWeight: 800, color }}> ₹{current.predictedFare}</div>
      </div>

      {/* Previous */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Previous Observed</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#d1d5db' }}>
          {prev ? `₹${prev.predictedFare}` : '—'}
        </div>
      </div>

      {/* Change */}
      {diff !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isUp ? <TrendingUp size={14} color="#ef4444" /> : isDown ? <TrendingDown size={14} color="#10b981" /> : <Minus size={14} color="#6b7280" />}
          <span style={{ fontSize: '13px', fontWeight: 700, color: isUp ? '#ef4444' : isDown ? '#10b981' : '#6b7280' }}>
            {isUp ? '+' : ''}{Math.round(diff * 100) / 100}  ({pct !== null ? `${pct.toFixed(2)}%` : '--'})
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FareTrendGraph({ sessionKey, searchId, externalHistory, wsSnapshots }) {
  const [observations, setObservations] = useState([]);
  const [providerFilter, setProviderFilter] = useState('ALL');

  // Fetch backend time-series history when searchId changes
  useEffect(() => {
    let isMounted = true;
    if (searchId) {
      rideService.getFareHistory(searchId)
        .then((res) => {
          if (!isMounted || !res.data) return;
          const rawList = Array.isArray(res.data) ? res.data : (res.data.observations || []);
          const backendObs = rawList.map(o => ({
            id: o.id ? `db-${o.id}` : `${o.timestamp}-${o.provider}-${o.rideType}`,
            timestamp: o.timestamp,
            provider: normProvider(o.provider),
            rideType: o.rideType,
            distanceKm: o.distanceKm,
            durationMinutes: o.durationMinutes || o.durationMins,
            predictedFare: o.predictedFare,
            surgeMultiplier: o.surgeMultiplier ?? o.surgeFactor ?? 1.0,
            available: true,
            predictionMode: o.predictionMode || 'ML_PREDICTED'
          }));

          setObservations((prev) => {
            const map = new Map();
            // Store DB items
            backendObs.forEach((item) => {
              const k = item.id || `${item.timestamp}-${item.provider}-${item.rideType}`;
              map.set(k, item);
            });
            const merged = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
            
            console.log("[FARE HISTORY LOADED FROM MYSQL]", "count=", merged.length, merged);
            return merged;
          });
        })
        .catch(() => {});
    } else {
      setObservations([]);
    }
    return () => { isMounted = false; };
  }, [searchId]);

  // Append new WebSocket snapshots when passed as props
  useEffect(() => {
    if (wsSnapshots && Array.isArray(wsSnapshots) && wsSnapshots.length > 0) {
      const formatted = wsSnapshots.map(o => ({
        id: o.id ? `db-${o.id}` : `${o.timestamp || Date.now()}-${normProvider(o.provider || o.providerName)}-${o.rideType}`,
        timestamp: o.timestamp || Date.now(),
        provider: normProvider(o.provider || o.providerName),
        rideType: o.rideType,
        distanceKm: o.distanceKm,
        durationMinutes: o.durationMinutes || o.durationMins,
        predictedFare: o.predictedFare,
        surgeMultiplier: o.surgeMultiplier ?? o.surgeFactor ?? 1.0,
        available: true,
        predictionMode: o.predictionMode || 'ML_PREDICTED'
      }));

      setObservations((prev) => {
        const map = new Map();
        prev.forEach((item) => {
          const k = item.id || `${item.timestamp}-${item.provider}-${item.rideType}`;
          map.set(k, item);
        });
        formatted.forEach((item) => {
          const k = item.id || `${item.timestamp}-${item.provider}-${item.rideType}`;
          if (!map.has(k)) {
            map.set(k, item);
          }
        });
        const merged = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
        console.log("[WS FARE SNAPSHOT APPENDED]", "totalCount=", merged.length);
        return merged;
      });
    }
  }, [wsSnapshots]);

  const refresh = useCallback(() => {
    let localObs = [];
    if (sessionKey) {
      localObs = getObservations(sessionKey, WINDOW_MS);
    }
    if (externalHistory && externalHistory.length > 0) {
      localObs = [...localObs, ...externalHistory];
    }
    if (localObs.length > 0) {
      setObservations((prev) => {
        const map = new Map();
        [...prev, ...localObs].forEach((item) => {
          const k = item.id || `${item.timestamp}-${item.provider}-${item.rideType}`;
          map.set(k, item);
        });
        return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
      });
    }
  }, [sessionKey, externalHistory]);

  // Subscribe to store changes
  useEffect(() => {
    refresh();
    const unsub = subscribe(refresh);
    return unsub;
  }, [refresh]);

  // Dynamic provider keys based on observations present in this route search
  const availableProviders = Array.from(new Set(observations.map((o) => o.provider))).filter(Boolean);
  const activeProviderKeys = ALL_PROVIDER_KEYS.filter(
    (p) => DEFAULT_PROVIDER_KEYS.includes(p) || availableProviders.includes(p)
  );

  // Chart rows (filtered by provider selection)
  const chartData = buildChartData(
    providerFilter === 'ALL'
      ? observations
      : observations.filter((o) => o.provider === providerFilter),
    activeProviderKeys
  );

  // Realistic Y-axis domain calculated strictly from actual route fare observations
  const allFares = chartData.flatMap((row) =>
    activeProviderKeys.map((p) => row[p]).filter((v) => v !== undefined && v !== null)
  );
  const minObserved = allFares.length ? Math.min(...allFares) : 0;
  const maxObserved = allFares.length ? Math.max(...allFares) : 100;
  
  // Pad by 5% above and below for realistic route fare scale
  const minFare = Math.max(0, Math.floor(minObserved * 0.95));
  const maxFare = Math.ceil(maxObserved * 1.05);

  const hasData = chartData.length > 0;
  const isLimitedHistory = chartData.length <= 1;

  return (
    <div
      className="glass-panel"
      style={{ padding: '24px', marginTop: '28px' }}
      id="fare-trend-section"
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent-green)" />
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Live Fare Trend
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '3px', margin: '3px 0 0 0' }}>
            Predicted fare changes over time
          </p>
        </div>

        {/* Dynamic History Status Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: isLimitedHistory ? 'rgba(234, 179, 8, 0.12)' : 'rgba(16, 185, 129, 0.12)',
          border: `1px solid ${isLimitedHistory ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 700,
          color: isLimitedHistory ? 'var(--accent-yellow)' : 'var(--accent-green)'
        }}>
          <Info size={12} />
          {isLimitedHistory
            ? 'Live observations accumulating...'
            : `Time-Series History (${chartData.length} snapshot intervals)`}
        </div>
      </div>

      {/* ── Provider Filter ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#9ca3af' }}>Provider:</span>
        {['ALL', ...activeProviderKeys].map((p) => (
          <button
            key={p}
            id={`fare-trend-filter-${p.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => setProviderFilter(p)}
            style={{
              background: providerFilter === p
                ? (PROVIDER_COLORS[p] ?? 'var(--accent-green)')
                : 'rgba(255,255,255,0.04)',
              color: providerFilter === p ? '#fff' : '#9ca3af',
              border: `1px solid ${providerFilter === p ? (PROVIDER_COLORS[p] ?? 'var(--accent-green)') : 'rgba(255,255,255,0.08)'}`,
              padding: '5px 13px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {activeProviderKeys.map((p) => (
          <FareSummaryCard
            key={p}
            label={p}
            provider={p}
            observations={observations}
            color={PROVIDER_COLORS[p]}
          />
        ))}
      </div>

      {/* ── Chart ── */}
      {hasData ? (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              domain={[minFare, maxFare]}
              tickFormatter={(v) => `₹${v}`}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
              formatter={(value) => (
                <span style={{ color: PROVIDER_COLORS[value] ?? '#fff', fontWeight: 700 }}>
                  {value}
                </span>
              )}
            />
            {(providerFilter === 'ALL' ? activeProviderKeys : [providerFilter]).map((p) => (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                stroke={PROVIDER_COLORS[p]}
                strokeWidth={2.5}
                dot={{ r: 5, fill: PROVIDER_COLORS[p], strokeWidth: 2, stroke: '#111827' }}
                activeDot={{ r: 7, strokeWidth: 2 }}
                connectNulls={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        /* ── Empty State ── */
        <div style={{
          height: '240px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#6b7280', gap: '10px',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <Activity size={36} color="var(--accent-green)" style={{ opacity: 0.8 }} />
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Live fare history will appear as predictions are received.
          </p>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, maxWidth: '380px' }}>
            Every live ML prediction received will add a new observation point to this time-series graph.
          </p>
        </div>
      )}
    </div>
  );
}
