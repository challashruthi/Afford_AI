import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  TrendingDown,
  PieChart as PieIcon,
  Compass,
  ArrowRight,
  Info,
  Trash2,
  CheckCircle2,
  Bike,
  Car,
  Layers,
  Sparkles,
  Award,
  AlertCircle,
  Clock,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  getFareAnalyticsData,
  clearSavedComparisons,
  getCategoryDisplayName,
} from '../services/fareHistoryStore';
import { searchComparisonService } from '../services/api';

const PROVIDER_COLORS = {
  Rapido: '#f59e0b',
  Ola: '#10b981',
  Uber: '#06b6d4',
  'Pink Bike': '#ec4899',
};

const CATEGORY_COLORS = {
  Bike: '#10b981',
  Auto: '#f59e0b',
  Cab: '#06b6d4',
};

const COMPARISONS_STORAGE_KEY = 'saved_search_comparisons';

/**
 * Merge backend records into localStorage so that getFareAnalyticsData()
 * (which reads localStorage) reflects all persisted comparisons.
 * Backend records are treated as the source of truth.
 * Dedup is based ONLY on the canonical db-{id} key so that records are not
 * falsely skipped after localStorage is cleared (e.g. new device / private browsing).
 * Always stamps the DB row's createdAt as the authoritative timestamp.
 */
function mergeBackendRecordsIntoLocalStorage(backendItems) {
  try {
    const existingRaw = localStorage.getItem(COMPARISONS_STORAGE_KEY);
    const local = existingRaw ? JSON.parse(existingRaw) : [];

    // Only track canonical db-prefixed IDs for dedup — ignore content-level ids
    // because those may have been cleared from localStorage on a new session.
    const localCanonicalIds = new Set(
      local.map((r) => String(r.id)).filter((id) => id.startsWith('db-'))
    );

    const toAdd = [];
    for (const item of backendItems) {
      const canonicalId = `db-${item.id}`;
      if (localCanonicalIds.has(canonicalId)) continue; // already merged

      let record;
      try {
        record = JSON.parse(item.comparisonJson);
      } catch (_) {
        record = null;
      }

      if (record && typeof record === 'object') {
        // Stamp the canonical DB id so future merges are idempotent
        record.id = canonicalId;
        // Always use the DB createdAt as the authoritative timestamp
        record.timestamp = item.createdAt
          ? new Date(item.createdAt).getTime()
          : (record.timestamp || Date.now());
        record.dateString = new Date(record.timestamp).toISOString();
        // Ensure required fields have safe defaults for analytics rendering
        if (!record.pickupName) record.pickupName = item.pickupName || 'Pickup';
        if (!record.destName) record.destName = item.destName || 'Destination';
        if (record.distanceKm == null) record.distanceKm = item.distanceKm ?? 0;
        if (!record.categorySavings) record.categorySavings = {};
        if (!record.options) record.options = [];
        toAdd.push(record);
      } else {
        // Fallback: build a minimal record from the DB row's top-level fields
        toAdd.push({
          id: canonicalId,
          searchId: item.rideSearchId ? String(item.rideSearchId) : null,
          timestamp: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
          dateString: item.createdAt || new Date().toISOString(),
          pickupName: item.pickupName || 'Pickup',
          destName: item.destName || 'Destination',
          distanceKm: item.distanceKm ?? 0,
          totalPotentialSavings: item.totalPotentialSavings ?? 0,
          validCategoryCount: item.validCategoryCount ?? 0,
          categorySavings: {},
          winningProviders: [],
          options: [],
        });
      }
    }

    if (toAdd.length > 0) {
      const merged = [...toAdd, ...local].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      localStorage.setItem(COMPARISONS_STORAGE_KEY, JSON.stringify(merged.slice(0, 50)));
      return true; // signals that new records were added
    }
    return false;
  } catch (_) {
    // Non-critical - analytics will still work with whatever is in localStorage
    return false;
  }
}

export default function FareAnalyticsPage() {
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [clearedNotice, setClearedNotice] = useState(false);
  const [activeWinCategory, setActiveWinCategory] = useState('ALL');
  const [loadingBackend, setLoadingBackend] = useState(false);

  const loadData = () => {
    const data = getFareAnalyticsData();
    setAnalyticsData(data);
  };

  useEffect(() => {
    // 1. Immediately load from localStorage for instant render
    loadData();

    // 2. Fetch from backend, merge persisted records, and re-compute analytics
    const token = localStorage.getItem('jwt_token');
    if (token && token !== 'null' && token !== 'undefined' && token.trim()) {
      setLoadingBackend(true);
      searchComparisonService.getComparisons()
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            // Merge backend records; always reload analytics afterwards so UI
            // reflects any newly merged records (or confirms existing data is current)
            mergeBackendRecordsIntoLocalStorage(res.data);
          }
          // Always re-compute after the API call, even if nothing new was merged,
          // to ensure the UI state is consistent with the final localStorage state.
          loadData();
        })
        .catch(() => {
          // Silently fall back to localStorage-only data (already loaded above)
        })
        .finally(() => {
          setLoadingBackend(false);
        });
    }

    // 3. Listen for immediate save events from DashboardPage (same session)
    const handleSearchSaved = (e) => {
      const newRecord = e?.detail?.record;
      if (newRecord && typeof newRecord === 'object') {
        // Merge the just-saved record directly into localStorage
        try {
          const existingRaw = localStorage.getItem(COMPARISONS_STORAGE_KEY);
          const existing = existingRaw ? JSON.parse(existingRaw) : [];
          // Dedup: skip if same searchId already present
          const alreadyPresent = existing.some(
            (r) => newRecord.searchId && r.searchId === newRecord.searchId
          );
          if (!alreadyPresent) {
            const merged = [newRecord, ...existing].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            localStorage.setItem(COMPARISONS_STORAGE_KEY, JSON.stringify(merged.slice(0, 50)));
          }
        } catch (_) {}
      }
      // Re-compute analytics regardless (catches both new and existing records)
      loadData();
    };

    window.addEventListener('rideafford:searchSaved', handleSearchSaved);
    return () => window.removeEventListener('rideafford:searchSaved', handleSearchSaved);
  }, []);


  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your saved fare comparison history? This will reset all aggregated savings and provider win statistics.')) {
      clearSavedComparisons();
      loadData();
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 3500);
      // Also clear from backend
      const token = localStorage.getItem('jwt_token');
      if (token && token !== 'null' && token !== 'undefined' && token.trim()) {
        searchComparisonService.clearComparisons().catch(() => {});
      }
    }
  };

  const hasData = analyticsData?.hasData && analyticsData.totalSearches > 0;

  // Selected win category data
  const currentWinStats = (analyticsData?.categoryWins?.[activeWinCategory] || []).filter((p) => p.wins > 0);
  const totalCategoryWins = currentWinStats.reduce((sum, p) => sum + p.wins, 0);

  const pieData = currentWinStats.map((p) => ({
    name: p.provider,
    value: p.wins,
    percentage: p.percentage,
    color: PROVIDER_COLORS[p.provider] || '#94a3b8',
  }));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '32px 24px', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', padding: '10px', borderRadius: '12px', display: 'inline-flex' }}>
                <BarChart3 size={26} color="var(--accent-cyan)" />
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  Fare Affordability Analytics &amp; Savings Tracker
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Centralized savings intelligence evaluated strictly within the same ride category (Bike vs Bike, Auto vs Auto, Cab vs Cab).
                  {loadingBackend && (
                    <span style={{ marginLeft: '8px', color: 'var(--accent-cyan)', fontSize: '12px' }}>
                      <RefreshCw size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />
                      Syncing history from server…
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {hasData && (
                <button
                  type="button"
                  id="clear-analytics-history-btn"
                  onClick={handleClearHistory}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  title="Clear all saved comparison records"
                >
                  <Trash2 size={14} /> Clear History
                </button>
              )}

              <button
                type="button"
                id="analytics-compare-new-route-btn"
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <Compass size={15} /> Compare New Route
              </button>
            </div>
          </div>

          {/* Compliance & Transparency Disclaimer */}
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
              <strong>Category-Specific Savings Transparency:</strong> Potential savings are evaluated exclusively within identical ride categories (Bike vs Bike, Auto vs Auto, Cab vs Cab) for completed route searches initiated by you.
              Potential Savings = <code>Highest Category Fare - Lowest Category Fare</code>.
              <em> Values represent estimated potential savings across available provider options, not confirmed cash transactions or completed bookings.</em>
            </div>
          </div>
        </div>

        {clearedNotice && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <CheckCircle2 size={16} /> Saved comparison history successfully reset.
          </div>
        )}

        {!hasData ? (
          /* Empty State */
          <div
            className="glass-panel"
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              borderRadius: '16px',
              marginTop: '20px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <PieIcon size={32} color="var(--accent-cyan)" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              No Saved Fare Comparisons Yet
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                maxWidth: '540px',
                margin: '0 auto 24px auto',
                lineHeight: '1.6',
              }}
            >
              To populate the savings analytics and category comparison breakdown, search for a route on the Dashboard and click <strong>'Compare Rides &amp; Find Cheapest'</strong>.
              Comparisons are recorded only when explicitly initiated by you to ensure clean history without duplicate entries.
            </p>
            <button
              type="button"
              id="empty-state-start-comparing-btn"
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              <Compass size={18} />
              Go to Dashboard &amp; Compare Rides
            </button>
          </div>
        ) : (
          /* Populated Analytics View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* ── View 1: Summary Cards (Requirement 3) ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Sparkles size={18} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Savings Summary Overview
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
                {/* 1. Total Completed Route Searches */}
                <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '12px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Completed Searches
                    </span>
                    <Compass size={16} color="var(--accent-cyan)" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff' }}>
                    {analyticsData.totalSearches}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    User-initiated comparisons
                  </div>
                </div>

                {/* 2. Bike Potential Savings */}
                <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '12px', borderLeft: '4px solid #10b981', background: 'rgba(16,185,129,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Bike Potential Savings
                    </span>
                    <Bike size={16} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981' }}>
                    ₹{analyticsData.bikeTotalSavings}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Across {analyticsData.categoryStats.BIKE.searchCount} bike comparisons
                  </div>
                </div>

                {/* 3. Auto Potential Savings */}
                <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '12px', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Auto Potential Savings
                    </span>
                    <Car size={16} color="#f59e0b" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#f59e0b' }}>
                    ₹{analyticsData.autoTotalSavings}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Across {analyticsData.categoryStats.AUTO.searchCount} auto comparisons
                  </div>
                </div>

                {/* 4. Cab Potential Savings */}
                <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '12px', borderLeft: '4px solid #06b6d4', background: 'rgba(6,182,212,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Cab Potential Savings
                    </span>
                    <Car size={16} color="#06b6d4" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#06b6d4' }}>
                    ₹{analyticsData.cabTotalSavings}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Across {analyticsData.categoryStats.CAB.searchCount} cab comparisons
                  </div>
                </div>

                {/* 5. Total Estimated Potential Savings (Sum of category savings) */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '18px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(16,185,129,0.4)',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.12) 100%)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Total Potential Savings
                    </span>
                    <Award size={18} color="var(--accent-green)" />
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 900, color: '#10b981' }}>
                    ₹{analyticsData.totalSavingsOpportunity}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                    Estimated potential savings across searches
                  </div>
                </div>
              </div>
            </div>

            {/* ── View 2: Category Comparison Breakdown (Requirement 3) ── */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={20} color="var(--accent-cyan)" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    Category Comparison Breakdown
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Independent analysis for each vehicle category with average provider fares, most frequent cheapest provider, and average savings.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {['BIKE', 'AUTO', 'CAB'].map((catKey) => {
                  const catName = getCategoryDisplayName(catKey);
                  const stats = analyticsData.categoryStats[catKey];
                  const avgFares = analyticsData.categoryAverageFares.find((c) => c.key === catKey) || {};
                  const mostCheapest = stats.mostFrequentCheapest;
                  const catColor = CATEGORY_COLORS[catName] || '#06b6d4';

                  return (
                    <div
                      key={catKey}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid rgba(255, 255, 255, 0.08)`,
                        borderTop: `3px solid ${catColor}`,
                        borderRadius: '12px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      {/* Category Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {catKey === 'BIKE' && <Bike size={18} color={catColor} />}
                          {catKey === 'AUTO' && <Car size={18} color={catColor} />}
                          {catKey === 'CAB' && <Car size={18} color={catColor} />}
                          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                            {catName} Category
                          </h3>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {stats.searchCount} evaluated search{stats.searchCount === 1 ? '' : 'es'}
                        </span>
                      </div>

                      {/* Metric Row: Most Frequent Cheapest & Average Savings */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Cheapest Provider</span>
                          {mostCheapest ? (
                            <div style={{ marginTop: '4px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 800, color: PROVIDER_COLORS[mostCheapest.provider] || '#ffffff' }}>
                                {mostCheapest.provider}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                Cheapest in <strong>{mostCheapest.percentage}%</strong> of comparisons
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No comparison yet</span>
                          )}
                        </div>

                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Avg. Savings / Search</span>
                          <div style={{ marginTop: '4px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--accent-green)' }}>
                              ₹{stats.avgSavingsPerSearch}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                              Total: ₹{stats.totalSavings}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Average Fare Comparison: Rapido vs Ola vs Uber */}
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
                          Average Fare Comparison (Rapido vs Ola vs Uber):
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {['Rapido', 'Ola', 'Uber'].map((prov) => {
                            const val = avgFares[prov];
                            const pColor = PROVIDER_COLORS[prov];
                            return (
                              <div
                                key={prov}
                                style={{
                                  background: 'rgba(15, 23, 42, 0.6)',
                                  border: '1px solid rgba(255, 255, 255, 0.06)',
                                  borderRadius: '8px',
                                  padding: '8px',
                                  textAlign: 'center',
                                }}
                              >
                                <span style={{ fontSize: '11px', fontWeight: 700, color: pColor, display: 'block' }}>{prov}</span>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: val != null ? '#ffffff' : 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                                  {val != null ? `₹${val}` : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── View 3: Visual Charts (Requirement 3) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
              {/* Chart A: Savings Distribution Across Categories */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                <div style={{ marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingDown size={18} color="var(--accent-green)" />
                    Savings Distribution Across Categories
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Total estimated savings opportunity split across Bike, Auto, and Cab.
                  </p>
                </div>

                <div style={{ height: '240px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData.categorySavingsTotals}
                      margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="category" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}`} tick={{ fill: '#94a3b8' }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: `1px solid ${d.color}`, borderRadius: '8px', padding: '8px 12px', color: '#ffffff', fontSize: '12px' }}>
                                <div style={{ fontWeight: 800, color: d.color }}>{d.category} Category</div>
                                <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>₹{d.savings} total savings</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="savings" radius={[6, 6, 0, 0]}>
                        {analyticsData.categorySavingsTotals.map((entry, index) => (
                          <Cell key={`cat-bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart B: Provider Competitiveness / Win Rate */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PieIcon size={18} color="var(--accent-cyan)" />
                      Provider Competitiveness &amp; Win Rate
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                      Frequency each provider offered the lowest fare within category.
                    </p>
                  </div>

                  {/* Category Filter Pills */}
                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px' }}>
                    {['ALL', 'BIKE', 'AUTO', 'CAB'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setActiveWinCategory(c)}
                        style={{
                          background: activeWinCategory === c ? 'var(--accent-cyan)' : 'transparent',
                          color: activeWinCategory === c ? '#0b1120' : '#94a3b8',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: pieData.length > 0 ? '1fr 1fr' : '1fr', gap: '16px', alignItems: 'center' }}>
                  {pieData.length > 0 ? (
                    <>
                      <div style={{ height: '220px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: `1px solid ${d.color}`, borderRadius: '8px', padding: '8px 12px', color: '#ffffff', fontSize: '12px' }}>
                                      <div style={{ fontWeight: 800, color: d.color }}>{d.name}</div>
                                      <div>Wins: <strong>{d.value}</strong> ({d.percentage}%)</div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={28}
                              formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: 600 }}>{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {currentWinStats.map((item) => {
                          const col = PROVIDER_COLORS[item.provider] || '#94a3b8';
                          return (
                            <div key={item.provider} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>{item.provider}</span>
                                <span style={{ fontWeight: 800, color: col, fontSize: '13px' }}>{item.percentage}%</span>
                              </div>
                              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${item.percentage}%`, height: '100%', background: col, borderRadius: '3px' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                      No comparisons recorded yet in {activeWinCategory} category.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── View 4: Saved Route Comparisons Table (Requirement 3) ── */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={20} color="var(--accent-cyan)" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    Saved Route Comparisons Table
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Route-by-route audit log displaying category cheapest provider, fare, and savings evaluated on that route.
                </p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(31, 41, 55, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.4px' }}>DATE / TIME</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.4px' }}>ROUTE &amp; DISTANCE</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.4px' }}>BIKE COMPARISON</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.4px' }}>AUTO COMPARISON</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.4px' }}>CAB COMPARISON</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '12px', fontWeight: 700, letterSpacing: '0.4px' }}>POTENTIAL ROUTE SAVINGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.routeWiseSavings.map((row) => {
                      const renderCategoryCell = (catData, catName) => {
                        if (!catData || !catData.hasComparison) {
                          return (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>
                              Not enough providers to compare.
                            </span>
                          );
                        }

                        const cheapLabel = catData.cheapestName || (catData.cheapestRideType && !catData.cheapestRideType.toLowerCase().includes(catData.cheapestProvider?.toLowerCase()) ? `${catData.cheapestProvider} ${catData.cheapestRideType}` : (catData.cheapestRideType || `${catData.cheapestProvider} ${catName}`));
                        const compLabel = catData.comparisonName || (catData.comparisonRideType && !catData.comparisonRideType.toLowerCase().includes(catData.comparisonProvider?.toLowerCase()) ? `${catData.comparisonProvider} ${catData.comparisonRideType}` : (catData.comparisonRideType || `${catData.comparisonProvider} ${catName}`));

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: 600 }}>
                              <span style={{ fontWeight: 800, color: PROVIDER_COLORS[catData.cheapestProvider] || '#ffffff' }}>
                                {cheapLabel}
                              </span>
                              {' '}₹{catData.cheapestFare} vs{' '}
                              <span style={{ fontWeight: 700, color: PROVIDER_COLORS[catData.comparisonProvider] || 'var(--text-muted)' }}>
                                {compLabel}
                              </span>
                              {' '}₹{catData.highestFare}
                            </div>
                            {catData.potentialSavings > 0 ? (
                              <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 700 }}>
                                Potential savings ₹{catData.potentialSavings}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Same fare — Potential savings ₹0
                              </span>
                            )}
                          </div>
                        );
                      };

                      return (
                        <tr
                          key={row.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'background 0.2s ease',
                          }}
                        >
                          {/* Date / Time */}
                          <td style={{ padding: '12px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                            {row.dateFormatted}
                          </td>

                          {/* Pickup & Destination + Distance */}
                          <td style={{ padding: '12px 14px', color: '#ffffff' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>
                              {row.pickup?.split(',')[0]} → {row.destination?.split(',')[0]}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={11} /> {row.distanceKm} km
                            </div>
                          </td>

                          {/* Bike Category */}
                          <td style={{ padding: '12px 14px' }}>
                            {renderCategoryCell(row.bike, 'Bike')}
                          </td>

                          {/* Auto Category */}
                          <td style={{ padding: '12px 14px' }}>
                            {renderCategoryCell(row.auto, 'Auto')}
                          </td>

                          {/* Cab Category */}
                          <td style={{ padding: '12px 14px' }}>
                            {renderCategoryCell(row.cab, 'Cab')}
                          </td>

                          {/* Total Route Savings Opportunity */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--accent-green)' }}>
                              ₹{row.routeTotalSavings}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                              opportunity
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
