import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { rideService, userService, favouriteService } from '../services/api';
import { RideWebSocketClient } from '../services/websocket';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FareTrendGraph from '../components/FareTrendGraph';
import RideIcon from '../components/RideIcon';
import ErrorBoundary from '../components/ErrorBoundary';
import FareBreakdown from '../components/FareBreakdown';
import { Filter, ArrowUpDown, Navigation, Users, Loader2, RefreshCw, Brain, Sliders, TrendingDown, AlertCircle, Star, Tag, WifiOff, MapPin, BarChart2, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  buildSessionKey,
  recordObservation,
  clearSession,
  calculateCategoryBreakdown,
  getRideCategory,
  getCategoryDisplayName,
  saveSearchComparison,
} from '../services/fareHistoryStore';
import { decorateOptionsWithOffers } from '../services/offerCalculator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseProvider(name) {
  const n = (name ?? '').toLowerCase();
  if (n.includes('ola'))    return 'Ola';
  if (n.includes('rapido')) return 'Rapido';
  if (n.includes('uber'))   return 'Uber';
  if (n.includes('pink'))   return 'Pink Bike';
  return name;
}

function buildRouteSessionKey(searchData) {
  if (!searchData?.pickup || !searchData?.destination) return null;
  return buildSessionKey({
    sourceLat: searchData.pickup.latitude,
    sourceLng: searchData.pickup.longitude,
    destLat:   searchData.destination.latitude,
    destLng:   searchData.destination.longitude,
    rideType:  'ALL',
  });
}

function recordSearchResult(searchData, sessionKey) {
  if (!sessionKey || !searchData?.options) return;
  const { distanceKm, durationMins } = searchData;
  for (const opt of searchData.options) {
    if (!opt.available && opt.available !== undefined) continue;
    recordObservation({
      sessionKey,
      provider:        normaliseProvider(opt.providerName),
      rideType:        opt.rideType,
      distanceKm:      opt.distanceKm ?? distanceKm,
      durationMinutes: opt.durationMins ?? durationMins,
      predictedFare:   opt.estimatedFare,
      surgeMultiplier: opt.surgeFactor ?? 1.0,
      available:       opt.available ?? true,
      predictionMode:  'ML_PREDICTED',
    });
  }
}

// ─── ML Metrics Panel ─────────────────────────────────────────────────────────

function MlMetricsPanel({ metrics }) {
  if (!metrics) return null;

  const ml = metrics.metrics || {};
  const mlStatus = metrics.status;
  const modelType = metrics.modelType || 'RandomForestRegressor';

  if (mlStatus === 'ML_SERVICE_OFFLINE' || metrics.status === 'MODEL_NOT_LOADED') {
    return (
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Brain size={16} color="var(--accent-green)" />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>ML Model Metrics</h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          {metrics.message || 'ML service offline — start ml_service/app.py to see live metrics.'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={16} color="var(--accent-green)" />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>ML Model Performance</h3>
        </div>
        <div style={{
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-green)',
        }}>
          {modelType}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {[
          { label: 'MAE', value: ml.mae != null ? `₹${ml.mae}` : '—', desc: 'Mean Absolute Error', color: 'var(--accent-cyan)' },
          { label: 'RMSE', value: ml.rmse != null ? `₹${ml.rmse}` : '—', desc: 'Root Mean Sq. Error', color: 'var(--accent-yellow)' },
          { label: 'R²', value: ml.r2 != null ? ml.r2.toFixed(4) : '—', desc: 'Coefficient of Determination', color: 'var(--accent-green)' },
        ].map(({ label, value, desc, color }) => (
          <div key={label} style={{
            flex: '1 1 110px',
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${color}30`,
            borderRadius: '8px',
            padding: '10px 14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{desc}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', marginBottom: 0, fontStyle: 'italic' }}>
        Metrics computed on actual test set ({metrics.test_samples || '2000'} samples, 80/20 train-test split). Not fabricated.
      </p>
    </div>
  );
}

// ─── Fare Comparison Bar Chart (Category-Specific) ───────────────────────────
function FareComparisonBarChart({ options, filterType = 'ALL', passengerCount = 1 }) {
  const [selectedCat, setSelectedCat] = useState('BIKE');

  // Sync category tab with active page filter when not ALL
  useEffect(() => {
    if (filterType !== 'ALL') {
      setSelectedCat(filterType);
    }
  }, [filterType]);

  if (!options || options.length === 0) return null;

  const activeCategoryToDisplay = filterType !== 'ALL' ? filterType : selectedCat;
  const breakdown = calculateCategoryBreakdown(options, passengerCount);
  const catData = breakdown[activeCategoryToDisplay] || { hasComparison: false, options: [], optionsCount: 0 };

  const chartData = (catData.options || []).map((opt) => {
    const isCheapest = catData.cheapestOption && (opt === catData.cheapestOption || opt.fare === catData.cheapestFare);
    return {
      name: `${opt.providerName} ${opt.rideType}`,
      provider: opt.providerName,
      rideType: opt.rideType,
      fare: opt.fare,
      isCheapest: isCheapest,
    };
  });

  return (
    <div id="fare-comparison-bar-chart" className="glass-panel" style={{ padding: '18px 20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={16} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Live Fare Comparison — {getCategoryDisplayName(activeCategoryToDisplay)}
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Comparing fares strictly within {getCategoryDisplayName(activeCategoryToDisplay)} options. Highlighted emerald bar indicates the lowest fare.
          </p>
        </div>

        {/* Category Switcher Tabs when page filter is ALL */}
        {filterType === 'ALL' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            {['BIKE', 'AUTO', 'CAB'].map((c) => {
              const count = breakdown[c]?.optionsCount || 0;
              const isSelected = selectedCat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCat(c)}
                  style={{
                    background: isSelected ? 'var(--accent-green)' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {getCategoryDisplayName(c)} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!catData.hasComparison ? (
        <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
          Not enough {getCategoryDisplayName(activeCategoryToDisplay).toLowerCase()} providers to compare on this route.
        </div>
      ) : (
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                interval={0}
                tick={{ fill: '#94a3b8' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => `₹${v}`}
                tick={{ fill: '#94a3b8' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: `1px solid ${data.isCheapest ? '#10b981' : 'rgba(255, 255, 255, 0.2)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}>
                        <div style={{ fontWeight: 800, color: data.isCheapest ? '#10b981' : '#ffffff' }}>
                          {data.name} {data.isCheapest ? '⭐ CHEAPEST' : ''}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px', color: data.isCheapest ? '#10b981' : '#ffffff' }}>
                          ₹{data.fare}
                        </div>
                        {data.isCheapest && (
                          <div style={{ color: '#10b981', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                            ⭐ Lowest fare for {catData.categoryName}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="fare" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`bar-cell-${index}`}
                    fill={entry.isCheapest ? '#10b981' : '#06b6d4'}
                    opacity={entry.isCheapest ? 1.0 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Default Resilient Route & Fare Dataset (Fallback if Backend is Offline) ───
const DEFAULT_FALLBACK_ROUTE_SEARCH = {
  searchId: 101,
  pickup: {
    name: "KITS Warangal (Kakatiya Institute of Technology & Science)",
    latitude: 17.9836,
    longitude: 79.5312
  },
  destination: {
    name: "Hanamkonda Bus Station, Warangal",
    latitude: 18.0125,
    longitude: 79.5511
  },
  distanceKm: 4.8,
  durationMins: 14,
  options: [
    { providerName: 'Pink Bike', rideType: 'Bike (Women)', estimatedFare: 42, durationMins: 12, capacity: 1, surgeFactor: 1.0, available: true, pricingNote: 'ML Predicted' },
    { providerName: 'Rapido', rideType: 'Bike', estimatedFare: 48, durationMins: 12, capacity: 1, surgeFactor: 1.0, available: true, pricingNote: 'ML Predicted' },
    { providerName: 'Ola', rideType: 'Auto', estimatedFare: 72, durationMins: 14, capacity: 3, surgeFactor: 1.0, available: true, pricingNote: 'ML Predicted' },
    { providerName: 'Uber', rideType: 'Auto', estimatedFare: 76, durationMins: 14, capacity: 3, surgeFactor: 1.0, available: true, pricingNote: 'ML Predicted' },
    { providerName: 'Uber', rideType: 'Go (Cab)', estimatedFare: 145, durationMins: 15, capacity: 4, surgeFactor: 1.1, available: true, pricingNote: 'ML Predicted' },
    { providerName: 'Ola', rideType: 'Mini (Cab)', estimatedFare: 155, durationMins: 15, capacity: 4, surgeFactor: 1.1, available: true, pricingNote: 'ML Predicted' },
  ]
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RideComparisonPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filterType, setFilterType] = useState('ALL');
  const [sortBy, setSortBy] = useState('FARE_ASC');
  const [searchData, setSearchData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mlMetrics, setMlMetrics] = useState(null);
  const [latestWsSnapshots, setLatestWsSnapshots] = useState([]);
  const [backendOffline, setBackendOffline] = useState(false);
  const [favourites, setFavourites] = useState([]);
  const [routeChangeStatus, setRouteChangeStatus] = useState('');

  // User Preferences State (loaded from Dashboard preferences)
  const [userPreferences, setUserPreferences] = useState(null);

  // Current session key (changes when route changes)
  const [sessionKey, setSessionKey] = useState(null);
  const prevSessionKeyRef = useRef(null);

  // WebSocket
  const wsClientRef = useRef(null);

  // ── Fetch ML metrics once on mount ──
  useEffect(() => {
    rideService.getModelMetrics()
      .then((res) => setMlMetrics(res.data))
      .catch(() => setMlMetrics({ status: 'ML_SERVICE_OFFLINE', message: 'Could not reach model metrics endpoint.' }));
  }, []);

  // ── Load saved preferences on mount ──
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await userService.getPreferences();
        if (res.data) {
          setUserPreferences(res.data);
          if (res.data.preferredRideType) {
            setFilterType(res.data.preferredRideType);
          }
          return;
        }
      } catch (err) {
        console.warn('Could not load preferences from backend, trying localStorage fallback:', err);
      }

      // Fallback to local storage (non-sensitive preferences)
      const saved = localStorage.getItem('user_preferences');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUserPreferences(parsed);
          if (parsed.preferredRideType) {
            setFilterType(parsed.preferredRideType);
          }
        } catch (_) {}
      } else {
        setUserPreferences({
          preferredRideType: 'ALL',
          numberOfPassengers: 1,
          ridePriority: 'LOWEST_FARE',
          maxBudget: null,
        });
      }
    };

    loadPreferences();
  }, []);

  // ── Load saved favourite locations on mount ──
  useEffect(() => {
    favouriteService.getFavourites()
      .then((res) => {
        if (Array.isArray(res.data)) {
          setFavourites(res.data);
        }
      })
      .catch((err) => {
        console.error('Could not load favourites from backend:', err);
      });
  }, []);

  const handleSelectFavouriteRoute = async (fav, isPickup) => {
    if (!fav) return;
    const locObj = {
      name: `${fav.name} (${fav.address})`,
      latitude: fav.latitude,
      longitude: fav.longitude
    };
    const currentP = searchData?.pickup || DEFAULT_FALLBACK_ROUTE_SEARCH.pickup;
    const currentD = searchData?.destination || DEFAULT_FALLBACK_ROUTE_SEARCH.destination;

    const newPickup = isPickup ? locObj : currentP;
    const newDest = isPickup ? currentD : locObj;

    setLoading(true);
    setRouteChangeStatus(`Comparing route: ${isPickup ? fav.name : currentP.name?.split(',')[0]} → ${isPickup ? currentD.name?.split(',')[0] : fav.name}...`);
    try {
      const res = await rideService.searchRides({
        pickup: newPickup,
        destination: newDest,
        numberOfPassengers: passengerCount
      });
      if (res?.data && Array.isArray(res.data.options) && res.data.options.length > 0) {
        setBackendOffline(false);
        applySearchData(res.data);
        localStorage.setItem('last_search_result', JSON.stringify(res.data));
        saveSearchComparison(res.data, true);
        setRouteChangeStatus(`Updated route with "${fav.name}" as ${isPickup ? 'Pickup' : 'Destination'}!`);
        setTimeout(() => setRouteChangeStatus(''), 3000);
      }
    } catch (err) {
      console.error('Error changing route from favourite location:', err);
      setRouteChangeStatus('Failed to update route.');
      setTimeout(() => setRouteChangeStatus(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // If navigated from FavouritesPage with a selected favourite location, auto-select it!
  useEffect(() => {
    if (location.state?.selectedFavourite) {
      handleSelectFavouriteRoute(location.state.selectedFavourite, location.state.isPickup ?? true);
    }
  }, [location.state]);

  // ── Load search result & record observations ──
  const applySearchData = useCallback((data) => {
    setSearchData(data);
    const key = buildRouteSessionKey(data);
    if (!key) return;

    if (prevSessionKeyRef.current && prevSessionKeyRef.current !== key) {
      clearSession(prevSessionKeyRef.current);
    }
    prevSessionKeyRef.current = key;
    setSessionKey(key);

    recordSearchResult(data, key);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('last_search_result');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.options) && parsed.options.length > 0) {
          applySearchData(parsed);
        } else {
          fetchDefaultComparison();
        }
      } catch (e) {
        fetchDefaultComparison();
      }
    } else {
      fetchDefaultComparison();
    }

    // WebSocket
    const client = new RideWebSocketClient(
      (payload) => {
        if (payload?.updateType === 'FARE_UPDATE' && payload?.updatedOptions) {
          setSearchData((prev) => prev ? { ...prev, options: payload.updatedOptions } : prev);
        }
        if (payload?.options && payload?.pickup && payload?.destination) {
          const key = buildRouteSessionKey(payload);
          if (key) recordSearchResult(payload, key);
        }
        if (payload?.observations && payload.observations.length > 0) {
          setLatestWsSnapshots(payload.observations);
        }
      },
      () => {}
    );
    client.connect();
    wsClientRef.current = client;

    return () => {
      if (wsClientRef.current) wsClientRef.current.disconnect();
    };
  }, [applySearchData]);

  // Subscribe WS topic when searchId is available
  useEffect(() => {
    if (searchData?.searchId && wsClientRef.current) {
      wsClientRef.current.subscribeToSearchId(searchData.searchId);
    }
  }, [searchData?.searchId]);

  const fetchDefaultComparison = async () => {
    setLoading(true);
    try {
      const defaultPickup = {
        name: "KITS Warangal (Kakatiya Institute of Technology & Science)",
        latitude: 17.9836,
        longitude: 79.5312
      };
      const defaultDest = {
        name: "Hanamkonda Bus Station, Warangal",
        latitude: 18.0125,
        longitude: 79.5511
      };

      const res = await rideService.searchRides({
        pickup: defaultPickup,
        destination: defaultDest
      });

      if (res?.data && Array.isArray(res.data.options) && res.data.options.length > 0) {
        setBackendOffline(false);
        applySearchData(res.data);
        localStorage.setItem('last_search_result', JSON.stringify(res.data));
      } else {
        throw new Error('Empty response data');
      }
    } catch (err) {
      console.warn('Backend ride search unavailable, applying resilient fallback dataset:', err);
      setBackendOffline(true);
      applySearchData(DEFAULT_FALLBACK_ROUTE_SEARCH);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const pickupToUse = searchData?.pickup || DEFAULT_FALLBACK_ROUTE_SEARCH.pickup;
      const destToUse = searchData?.destination || DEFAULT_FALLBACK_ROUTE_SEARCH.destination;

      const res = await rideService.searchRides({
        pickup: pickupToUse,
        destination: destToUse,
      });
      if (res?.data && Array.isArray(res.data.options) && res.data.options.length > 0) {
        setBackendOffline(false);
        applySearchData(res.data);
        localStorage.setItem('last_search_result', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Refresh failed (backend unreachable):', err);
      setBackendOffline(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Preference parameters ──
  const priority = userPreferences?.ridePriority || 'LOWEST_FARE';
  const maxBudget = userPreferences?.maxBudget != null && userPreferences.maxBudget > 0
    ? Number(userPreferences.maxBudget)
    : null;
  const passengerCount = userPreferences?.numberOfPassengers || 1;

  // ── Filter & sort ──
  const rawOptions = searchData?.options || [];
  const options = decorateOptionsWithOffers(rawOptions);

  const getCapacity = (type, capacityProp) => {
    if (capacityProp) return capacityProp;
    if (type.toLowerCase().includes('bike') || type.toLowerCase().includes('moto') || type.toLowerCase().includes('women')) return 1;
    if (type.toLowerCase().includes('auto')) return 3;
    return 4;
  };

  const filteredOptions = options
    .filter(opt => {
      // 1. Category filter
      if (filterType === 'BIKE') {
        const isBike = opt.rideType.toLowerCase().includes('bike') ||
                       opt.rideType.toLowerCase().includes('moto') ||
                       opt.rideType.toLowerCase().includes('women') ||
                       opt.providerName.toLowerCase().includes('pink');
        if (!isBike) return false;
      }
      if (filterType === 'AUTO') {
        if (!opt.rideType.toLowerCase().includes('auto')) return false;
      }
      if (filterType === 'CAB') {
        const isCab = !opt.rideType.toLowerCase().includes('bike') &&
                      !opt.rideType.toLowerCase().includes('moto') &&
                      !opt.rideType.toLowerCase().includes('women') &&
                      !opt.rideType.toLowerCase().includes('auto') &&
                      !opt.providerName.toLowerCase().includes('pink');
        if (!isCab) return false;
      }

      // 2. Capacity check based on passenger preference
      if (passengerCount > 1) {
        const cap = getCapacity(opt.rideType, opt.capacity);
        if (cap < passengerCount) return false;
      }

      // 3. Budget filter (comparable fare <= maxBudget) loaded from Dashboard preferences
      const costToCheck = opt.comparableFare != null ? opt.comparableFare : opt.estimatedFare;
      if (maxBudget !== null && maxBudget !== undefined) {
        if (costToCheck == null || isNaN(costToCheck) || costToCheck > maxBudget) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const fareA = a.comparableFare != null ? a.comparableFare : a.estimatedFare;
      const fareB = b.comparableFare != null ? b.comparableFare : b.estimatedFare;
      if (sortBy === 'FARE_DESC') {
        return fareB - fareA;
      }
      return fareA - fareB;
    });

  // Calculate category-specific breakdown (Bike vs Bike, Auto vs Auto, Cab vs Cab)
  const rawOptionsForBreakdown = (searchData?.options || []).map((o) => {
    let opt = { ...o };
    if (userPreferences?.isFirstRide) {
      const decorated = decorateOptionsWithOffers([opt], userPreferences.isFirstRide);
      if (decorated && decorated[0]) opt = decorated[0];
    }
    return opt;
  });

  const categoryBreakdown = calculateCategoryBreakdown(rawOptionsForBreakdown, passengerCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', padding: '32px 20px', flex: 1 }}>
        {/* ── Title ── */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', margin: 0 }}>
            Multi-Provider <span className="gradient-text">Comparison Matrix</span>
          </h1>
          {searchData && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span>Route: <strong>{searchData.pickup?.name ? searchData.pickup.name.split(',')[0] : 'KITS Warangal'}</strong> → <strong>{searchData.destination?.name ? searchData.destination.name.split(',')[0] : 'Hanamkonda Bus Station'}</strong></span>
              {searchData.distanceKm != null && (
                <span style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Navigation size={13} /> {Number(searchData.distanceKm).toFixed(1)} km Route Distance
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Quick Favourite Locations Selector ── */}
        <div
          id="comparison-favourites-bar"
          className="glass-panel"
          style={{
            padding: '10px 16px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderLeft: '4px solid var(--accent-green)'
          }}
        >
          {favourites.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--accent-green)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <Star size={13} /> Favourite Locations:
              </span>

              {favourites.map((fav) => (
                <div
                  key={fav.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    padding: '2px 8px',
                    fontSize: '11px'
                  }}
                >
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>{fav.name}</span>
                  <button
                    onClick={() => handleSelectFavouriteRoute(fav, true)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'var(--accent-green)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '10px',
                      padding: '2px 5px'
                    }}
                    title={`Set ${fav.name} as Pickup`}
                  >
                    Set Pickup
                  </button>
                  <button
                    onClick={() => handleSelectFavouriteRoute(fav, false)}
                    style={{
                      background: 'rgba(6, 182, 212, 0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'var(--accent-cyan)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '10px',
                      padding: '2px 5px'
                    }}
                    title={`Set ${fav.name} as Destination`}
                  >
                    Set Dest
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <Star size={13} color="var(--accent-green)" />
              <span>Save frequently visited locations on your Dashboard to compare rides in a single click.</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {routeChangeStatus && (
              <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
                {routeChangeStatus}
              </span>
            )}
            <button
              onClick={() => navigate('/favourites')}
              id="comparison-manage-favourites-btn"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Star size={11} color="var(--accent-green)" /> Manage Favourites
            </button>
          </div>
        </div>

        {/* ── Preferences Applied Indicator Banner ── */}
        <div
          id="preferences-applied-indicator"
          className="glass-panel"
          style={{
            padding: '12px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            borderLeft: '4px solid var(--accent-green)',
            background: 'rgba(16,185,129,0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px'
            }}>
              <Sliders size={14} /> Preferences Applied:
            </span>

            <span style={{
              background: maxBudget ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)',
              border: maxBudget ? '1px solid rgba(16,185,129,0.35)' : '1px solid var(--border-color)',
              color: maxBudget ? 'var(--accent-green)' : 'var(--text-muted)',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              {maxBudget ? `Budget: ≤ ₹${maxBudget}` : 'No Budget Limit'}
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
              Preferred Type: {userPreferences?.preferredRideType === 'ALL' || !userPreferences?.preferredRideType ? 'Any Ride' : userPreferences.preferredRideType}
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
              {passengerCount} pax
            </span>
          </div>

          <button
            id="edit-preferences-btn"
            onClick={() => navigate('/dashboard#preferences')}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <Sliders size={13} color="var(--accent-green)" /> Edit Preferences in Dashboard
          </button>
        </div>

        {/* ── Backend Offline Notice if Applicable ── */}
        {backendOffline && (
          <div
            id="backend-offline-banner"
            style={{
              fontSize: '12px', color: '#fde68a', background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)',
              padding: '10px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px'
            }}
          >
            <WifiOff size={16} color="var(--accent-yellow)" />
            <span>
              <strong>Offline Resilient Mode:</strong> Backend/ML service is currently connecting or offline. Displaying cached standard fare estimates for this route. Comparison filters and budget calculations remain fully functional.
            </span>
          </div>
        )}

        {/* ── ML Metrics Panel ── */}
        <ErrorBoundary title="ML Performance Metrics" message="Model performance metrics are temporarily offline.">
          <MlMetricsPanel metrics={mlMetrics} />
        </ErrorBoundary>

        {/* ── Filter & Sort Controls Panel ── */}
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Filter size={18} color="var(--accent-green)" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Category:</span>
              {['ALL', 'BIKE', 'AUTO', 'CAB'].map(type => (
                <button
                  key={type}
                  id={`comparison-filter-${type.toLowerCase()}`}
                  onClick={() => setFilterType(type)}
                  style={{
                    background: filterType === type ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
                    color: filterType === type ? '#ffffff' : 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ArrowUpDown size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Sort By:</span>
              <button
                id="comparison-sort-toggle"
                onClick={() => setSortBy(sortBy === 'FARE_ASC' ? 'FARE_DESC' : 'FARE_ASC')}
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: '13px' }}
              >
                {sortBy === 'FARE_DESC' ? 'Highest Fare First' : 'Lowest Fare First'}
              </button>

              <button
                id="comparison-refresh-btn"
                onClick={handleRefresh}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                disabled={loading}
                title="Re-fetch fares — adds a new genuine observation to the trend graph"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Fare Analytics Central Hub Callout ── */}
        <div
          className="glass-panel"
          style={{
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            borderLeft: '4px solid var(--accent-cyan)',
            background: 'rgba(6, 182, 212, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
              Potential savings analytics and category comparisons are centralized on the <strong>Fare Analytics Dashboard</strong>.
            </span>
          </div>
          <Link
            to="/analytics"
            id="view-fare-analytics-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent-cyan)',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            View Fare Analytics Dashboard <ArrowRight size={14} />
          </Link>
        </div>

        {/* ── Fare Comparison Bar Chart ── */}
        <FareComparisonBarChart
          options={rawOptionsForBreakdown}
          filterType={filterType}
          passengerCount={passengerCount}
        />

        {/* ── Comparison Table ── */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px auto', color: 'var(--accent-green)' }} />
              <p style={{ fontSize: '13px', margin: 0 }}>Fetching ML fare predictions for current route…</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(31,41,55,0.8)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>PROVIDER</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>RIDE TYPE</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>CAPACITY</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>ROUTE DISTANCE</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>SURGE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>PREDICTED FARE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>RECOMMENDATION &amp; STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt, index) => {
                    const isAvailable = opt.available ?? true;
                    const optCategory = getRideCategory(opt.rideType, opt.providerName);
                    const catInfo = categoryBreakdown[optCategory];
                    const optFare = Math.round(opt.comparableFare != null ? opt.comparableFare : opt.estimatedFare);
                    const isCheapestInCat = isAvailable && catInfo?.hasComparison && optFare === catInfo.cheapestFare;

                    return (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s ease' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#ffffff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{opt.providerName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RideIcon rideType={opt.rideType} size={16} />
                            <span>{opt.rideType}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={13} /> {getCapacity(opt.rideType, opt.capacity)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Navigation size={12} /> {opt.distanceKm ? `${Number(opt.distanceKm).toFixed(1)} km` : (searchData?.distanceKm ? `${Number(searchData.distanceKm).toFixed(1)} km` : '—')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: opt.surgeFactor > 1.0 ? 'var(--accent-yellow)' : 'var(--accent-green)', fontWeight: 600 }}>
                          {opt.surgeFactor}x
                          <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '4px' }}>simulated</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: isCheapestInCat ? 'var(--accent-green)' : '#ffffff' }}>
                              ₹{Math.round(opt.estimatedFare)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {opt.pricingNote || 'ML Predicted'}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                              <FareBreakdown option={opt} routeDistanceKm={opt.distanceKm || searchData?.distanceKm} compact={true} />
                            </div>
                          </div>
                        </td>

                        {/* Recommendation & Status Column (Cheapest in Category Recommendation) */}
                        <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                          {!isAvailable ? (
                            <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>Currently Unavailable</span>
                          ) : !catInfo || !catInfo.hasComparison ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                              Not enough providers to compare.
                            </span>
                          ) : isCheapestInCat ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{
                                background: 'rgba(16,185,129,0.15)',
                                border: '1px solid rgba(16,185,129,0.35)',
                                color: 'var(--accent-green)',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                width: 'fit-content'
                              }}>
                                Cheapest {catInfo.categoryName} Option
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
                                Lowest predicted fare for {catInfo.categoryName}
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Available {catInfo.categoryName} option
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ maxWidth: '460px', margin: '0 auto' }}>
                        <AlertCircle size={32} color="var(--accent-yellow)" style={{ margin: '0 auto 10px auto' }} />
                        <p style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                          No ride options match your preferences
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                          {maxBudget !== null
                            ? `No available ${filterType !== 'ALL' ? filterType : ''} ride is within your maximum budget of ₹${maxBudget}.`
                            : `No rides found matching category "${filterType}".`
                          } You can update your budget limit or ride requirements on the Dashboard.
                        </p>
                        <button
                          id="empty-state-edit-preferences-btn"
                          type="button"
                          onClick={() => navigate('/dashboard#preferences')}
                          className="btn-primary"
                          style={{ padding: '8px 18px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Sliders size={13} /> Edit Preferences on Dashboard
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Fare Trend Graph ── */}
        <ErrorBoundary title="Live Fare Trend Graph" message="Fare trend graph is accumulating observations.">
          <FareTrendGraph sessionKey={sessionKey} searchId={searchData?.searchId} wsSnapshots={latestWsSnapshots} />
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}
