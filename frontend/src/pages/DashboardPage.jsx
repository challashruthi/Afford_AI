import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { rideService, userService, favouriteService, searchComparisonService } from '../services/api';
import { RideWebSocketClient } from '../services/websocket';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LocationAutocomplete from '../components/LocationAutocomplete';
import MapView from '../components/MapView';
import RideCard from '../components/RideCard';
import RecommendationBadge from '../components/RecommendationBadge';
import LiveUpdateToggle from '../components/LiveUpdateToggle';
import FirstTimeOnboardingModal from '../components/FirstTimeOnboardingModal';
import HowItWorksIntro from '../components/HowItWorksIntro';
import UserPreferencesBar from '../components/UserPreferencesBar';
import FareTrendGraph from '../components/FareTrendGraph';
import RideIcon from '../components/RideIcon';
import { Search, Navigation, Loader2, Filter, TrendingDown, Zap, BarChart3, AlertCircle, IndianRupee, Star, ArrowLeftRight, MapPin, ChevronDown, X } from 'lucide-react';
import { buildSessionKey, recordObservation, clearSession, saveSearchComparison, calculateCategoryBreakdown, getRideCategory, normalizeProviderName } from '../services/fareHistoryStore';

import { decorateOptionsWithOffers } from '../services/offerCalculator';

// ── Helpers ──────────────────────────────────────────────────────────────────

function normProvider(name) {
  const n = (name ?? '').toLowerCase();
  if (n.includes('ola'))    return 'Ola';
  if (n.includes('rapido')) return 'Rapido';
  if (n.includes('uber'))   return 'Uber';
  if (n.includes('pink'))   return 'Pink Bike';
  return name;
}

function routeSessionKey(pickup, destination) {
  if (!pickup || !destination) return null;
  return buildSessionKey({
    sourceLat: pickup.latitude,   sourceLng: pickup.longitude,
    destLat:   destination.latitude, destLng: destination.longitude,
    rideType: 'ALL',
  });
}

function storeSearchObservations(pickup, destination, options, distanceKm, durationMins, prevKey, clearPrev) {
  const key = routeSessionKey(pickup, destination);
  if (!key) return null;
  if (clearPrev && prevKey && prevKey !== key) clearSession(prevKey);
  for (const opt of (options ?? [])) {
    if (opt.available === false) continue;
    recordObservation({
      sessionKey: key, provider: normProvider(opt.providerName),
      rideType: opt.rideType, distanceKm: opt.distanceKm ?? distanceKm,
      durationMinutes: opt.durationMins ?? durationMins,
      predictedFare: opt.estimatedFare, surgeMultiplier: opt.surgeFactor ?? 1.0,
      available: opt.available ?? true, predictionMode: 'ML_PREDICTED',
    });
  }
  return key;
}

// ── Fare Comparison Summary (mini table) ─────────────────────────────────────

function FareComparisonSummary({ options, recommendation }) {
  if (!options || options.length === 0) return null;

  // Group by provider — pick the cheapest option per provider based on comparable fare
  const byProvider = {};
  for (const opt of options) {
    if (opt.available === false) continue;
    const prov = normProvider(opt.providerName);
    const fare = opt.comparableFare != null ? opt.comparableFare : opt.estimatedFare;
    if (!byProvider[prov] || fare < byProvider[prov].fare) {
      byProvider[prov] = {
        provider: prov,
        rideType: opt.rideType,
        fare: fare,
        originalFare: opt.originalEstimatedFare != null ? opt.originalEstimatedFare : opt.estimatedFare,
        platformDiscount: opt.platformDiscount || 0,
        offerTitle: opt.offerTitle,
        surge: opt.surgeFactor ?? 1.0,
        available: opt.available ?? true,
        pricingNote: opt.pricingNote,
      };
    }
  }

  const providerList = Object.values(byProvider).sort((a, b) => a.fare - b.fare);
  if (providerList.length === 0) return null;

  const cheapestFare = providerList[0].fare;
  const cheapestProvider = providerList[0].provider;

  const providerColors = {
    Uber:      '#06b6d4',
    Ola:       '#10b981',
    Rapido:    '#f59e0b',
    'Pink Bike': '#ec4899',
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <BarChart3 size={18} color="var(--accent-cyan)" />
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
          Fare Comparison Summary
        </h3>
        <span style={{
          fontSize: '10px', fontWeight: 700,
          background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)',
          color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '20px',
          marginLeft: 'auto',
        }}>ESTIMATED DIFFERENCES</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {providerList.map((p) => {
          const isCheapest = Math.round(p.fare) === Math.round(cheapestFare);
          const fareDiff = Math.round(p.fare - cheapestFare);
          const color = providerColors[p.provider] ?? '#9ca3af';
          return (
            <div key={p.provider} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: isCheapest ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
              border: isCheapest ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px', padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: color, display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>{p.provider}</span>
                <span style={{ fontSize: '12px', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RideIcon rideType={p.rideType} size={14} color="#6b7280" />
                  {p.rideType}
                </span>
                <span style={{ fontSize: '11px', color: p.surge > 1.0 ? 'var(--accent-yellow)' : '#6b7280' }}>
                  {p.surge}x
                </span>
                {p.platformDiscount > 0 && (
                  <span style={{
                    fontSize: '9px', fontWeight: 800,
                    background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.3)',
                    color: 'var(--accent-green)', padding: '1px 6px', borderRadius: '10px',
                  }}>
                    -₹{p.platformDiscount} offer
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isCheapest ? (
                  <span style={{
                    background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)',
                    color: 'var(--accent-green)', fontSize: '10px', fontWeight: 800,
                    padding: '2px 8px', borderRadius: '20px',
                  }}>CHEAPEST</span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: 600 }}>
                    +₹{fareDiff} higher
                  </span>
                )}
                <div style={{ textAlign: 'right' }}>
                  {p.platformDiscount > 0 && (
                    <div style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'line-through' }}>
                      ₹{Math.round(p.originalFare)}
                    </div>
                  )}
                  <div style={{ fontSize: '18px', fontWeight: 800, color: isCheapest ? 'var(--accent-green)' : '#ffffff' }}>
                    ₹{Math.round(p.fare)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AI Recommendation Card ────────────────────────────────────────────────────

function AiRecommendedCard({ recommendation, distanceKm, durationMins, demandInfo }) {
  if (!recommendation) return null;

  const surgeLevel = demandInfo?.level || 'OFF_PEAK';
  const surgeBadge = surgeLevel === 'HIGH_DEMAND' ? { label: 'High Demand', color: '#ef4444' }
    : surgeLevel === 'PEAK_TIME' ? { label: 'Peak Pricing', color: 'var(--accent-yellow)' }
    : { label: 'Normal Pricing', color: 'var(--accent-green)' };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(6,182,212,0.14) 100%)',
      border: '1.5px solid var(--accent-green)',
      borderRadius: 'var(--radius-lg)',
      padding: '22px 24px',
      marginBottom: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow effect */}
      <div style={{
        position: 'absolute', top: '-40px', right: '-40px',
        width: '120px', height: '120px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <Zap size={16} color="var(--accent-green)" />
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          AI Recommended Cheapest Ride
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: '10px', fontWeight: 700,
          background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
          color: '#c084fc', padding: '2px 8px', borderRadius: '20px',
        }}>ML PREDICTED</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
            {recommendation.providerName}{' '}
            <span style={{ color: 'var(--accent-cyan)' }}>{recommendation.rideType}</span>
          </h3>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            {recommendation.reason}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
            ₹{Math.round(recommendation.estimatedFare)}
          </div>
          {recommendation.expectedSavings > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', fontSize: '12px', color: 'var(--accent-green)', marginTop: '2px' }}>
              <TrendingDown size={13} />
              Save ₹{Math.round(recommendation.expectedSavings)} vs next cheapest
            </div>
          )}
        </div>
      </div>

      {/* Metadata row */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
        {distanceKm && (
          <span style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Navigation size={13} color="var(--accent-cyan)" /> {Number(distanceKm).toFixed(1)} km
          </span>
        )}
        <span style={{
          fontSize: '11px', fontWeight: 700,
          color: surgeBadge.color,
          background: `${surgeBadge.color}18`,
          border: `1px solid ${surgeBadge.color}40`,
          padding: '2px 10px', borderRadius: '20px',
          marginLeft: 'auto',
        }}>
          {demandInfo?.baseSurge && demandInfo.baseSurge > 1.0 ? `${demandInfo.baseSurge}x ` : ''}
          {surgeBadge.label}
        </span>
      </div>
    </div>
  );
}

// ── Main Dashboard Component ──────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [durationMins, setDurationMins] = useState(null);
  const [rideOptions, setRideOptions] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [demandInfo, setDemandInfo] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Favourite locations for quick-select
  const [favourites, setFavourites] = useState([]);
  const [showPickupFavs, setShowPickupFavs] = useState(false);
  const [showDestFavs, setShowDestFavs] = useState(false);
  const pickupFavRef = useRef(null);
  const destFavRef = useRef(null);

  // Click-to-pin mode: 'pickup' | 'destination' | null
  const [pinMode, setPinMode] = useState(null);
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);

  // Fare trend
  const [fareSessionKey, setFareSessionKey] = useState(null);
  const prevFareSessionRef = useRef(null);

  // Active searchId for WS subscription & history
  const [activeSearchId, setActiveSearchId] = useState(() => {
    const saved = localStorage.getItem('last_search_id');
    return saved ? Number(saved) : null;
  });
  const [latestWsSnapshots, setLatestWsSnapshots] = useState([]);

  // Onboarding & Preferences state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);

  // Passenger count from preferences (used in search)
  const [searchPassengers, setSearchPassengers] = useState(1);

  // WebSocket: 'connected' | 'reconnecting' | 'unavailable' | 'disconnected'
  const [wsStatus, setWsStatus] = useState('reconnecting');
  const [lastWsMsg, setLastWsMsg] = useState('');
  const wsClientRef = useRef(null);

  // Sync refs to avoid stale closures in WS callbacks
  const pickupRef = useRef(pickup);
  const destinationRef = useRef(destination);
  const distanceKmRef = useRef(distanceKm);
  const durationMinsRef = useRef(durationMins);
  const searchPassengersRef = useRef(searchPassengers);
  const userPreferencesRef = useRef(userPreferences);

  useEffect(() => { pickupRef.current = pickup; }, [pickup]);
  useEffect(() => { destinationRef.current = destination; }, [destination]);
  useEffect(() => { distanceKmRef.current = distanceKm; }, [distanceKm]);
  useEffect(() => { durationMinsRef.current = durationMins; }, [durationMins]);
  useEffect(() => { searchPassengersRef.current = searchPassengers; }, [searchPassengers]);
  useEffect(() => { userPreferencesRef.current = userPreferences; }, [userPreferences]);

  // ── Handle incoming WebSocket fare updates ──
  const handleWsMessage = useCallback((payload) => {
    if (!payload) return;

    if (payload.updateType === 'SURGE_STATE_UPDATE') {
      setLastWsMsg(payload.message || 'System demand updated.');
      return;
    }

    if (payload.updateType === 'FARE_UPDATE') {
      const updatedOpts = payload.updatedOptions || [];
      if (updatedOpts.length > 0) {
        setRideOptions(updatedOpts);

        // Recalculate AI Recommendation dynamically based on current passengers & options
        const passCount = searchPassengersRef.current || 1;
        const validOptions = updatedOpts.filter(opt => {
          const cap = opt.capacity || (opt.rideType.toLowerCase().includes('bike') ? 1 : opt.rideType.toLowerCase().includes('auto') ? 3 : 4);
          return cap >= passCount;
        });

        const pool = validOptions.length > 0 ? validOptions : updatedOpts;
        const cheapest = [...pool].sort((a, b) => a.estimatedFare - b.estimatedFare)[0];
        const nextCheapest = [...pool].sort((a, b) => a.estimatedFare - b.estimatedFare)[1];
        const savings = nextCheapest ? Math.max(0, nextCheapest.estimatedFare - cheapest.estimatedFare) : 0;

        if (cheapest) {
          setRecommendation({
            providerName: cheapest.providerName,
            rideType: cheapest.rideType,
            estimatedFare: cheapest.estimatedFare,
            compositeScore: 100.0,
            expectedSavings: savings,
            reason: `${cheapest.providerName} ${cheapest.rideType} has the lowest predicted fare (₹${Math.round(cheapest.estimatedFare)}) among currently available rides.`
          });
        }
      }

      if (payload.demandInfo) {
        setDemandInfo(payload.demandInfo);
      }
      if (payload.observations && payload.observations.length > 0) {
        setLatestWsSnapshots(payload.observations);
      }
      setLastWsMsg(`Fare updated · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);

      const currentPickup = pickupRef.current;
      const currentDest = destinationRef.current;
      if (updatedOpts.length > 0 && currentPickup && currentDest) {
        const prevKey = prevFareSessionRef.current;
        const newKey = storeSearchObservations(
          currentPickup, currentDest,
          updatedOpts,
          payload.distanceKm ?? distanceKmRef.current,
          payload.durationMins ?? durationMinsRef.current,
          prevKey, false
        );
        if (newKey) {
          prevFareSessionRef.current = newKey;
          setFareSessionKey(newKey);
        }
      }
    }
  }, []);

  const handleWsMessageRef = useRef(handleWsMessage);
  useEffect(() => { handleWsMessageRef.current = handleWsMessage; }, [handleWsMessage]);

  useEffect(() => {
    // 1. Apply pending favourite from Favourites page navigation (if any)
    const state = routerLocation.state || {};
    if (state.pendingPickup) {
      setPickup(state.pendingPickup);
      // Clear state so back-navigation doesn't re-apply
      window.history.replaceState({}, document.title);
    }
    if (state.pendingDestination) {
      setDestination(state.pendingDestination);
      window.history.replaceState({}, document.title);
    }

    // 2. Fetch User Preferences (without auto-searching)
    checkUserOnboarding();

    // 3. Load saved favourites for quick-select
    loadFavourites();

    // 4. Initialize STOMP WebSocket
    const client = new RideWebSocketClient(
      (msg) => handleWsMessageRef.current(msg),
      (status) => setWsStatus(status)
    );
    client.connect();
    wsClientRef.current = client;

    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close favourite dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickupFavRef.current && !pickupFavRef.current.contains(e.target)) {
        setShowPickupFavs(false);
      }
      if (destFavRef.current && !destFavRef.current.contains(e.target)) {
        setShowDestFavs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle smooth scroll to preferences when navigated with hash
  useEffect(() => {
    const handleHashScroll = () => {
      if (window.location.hash === '#preferences') {
        const el = document.getElementById('my-ride-preferences-section');
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-pulse');
            setTimeout(() => el.classList.remove('highlight-pulse'), 2500);
          }, 150);
        }
      }
    };
    handleHashScroll();
    window.addEventListener('hashchange', handleHashScroll);
    return () => window.removeEventListener('hashchange', handleHashScroll);
  }, []);

  // Subscribe to search-specific WS topic when searchId changes
  useEffect(() => {
    if (activeSearchId != null && wsClientRef.current) {
      wsClientRef.current.subscribeToSearchId(activeSearchId);
    }
  }, [activeSearchId]);

  const loadFavourites = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token || token === 'null' || token === 'undefined' || !token.trim()) return;
    try {
      const res = await favouriteService.getFavourites();
      if (Array.isArray(res.data)) setFavourites(res.data);
    } catch (e) {
      // silently ignore — favourites are optional
    }
  };

  const checkUserOnboarding = async () => {
    try {
      const res = await userService.getPreferences();
      if (res.data) {
        setUserPreferences(res.data);
        if (res.data.preferredRideType) {
          setCategoryFilter(res.data.preferredRideType);
        }
        if (res.data.numberOfPassengers) {
          setSearchPassengers(res.data.numberOfPassengers);
        }

        if (!res.data.onboardingCompleted) {
          userService.updatePreferences({
            onboardingCompleted: true,
            preferredRideType: res.data.preferredRideType || 'ALL',
            ridePriority: res.data.ridePriority || 'LOWEST_FARE',
            numberOfPassengers: res.data.numberOfPassengers || 1
          }).catch(() => {});
        }
        // Do NOT auto-execute search — wait for user action
      } else {
        const saved = localStorage.getItem('user_preferences');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setUserPreferences(parsed);
            if (parsed.preferredRideType) setCategoryFilter(parsed.preferredRideType);
            if (parsed.numberOfPassengers) setSearchPassengers(parsed.numberOfPassengers);
          } catch (_) {}
        }
      }
    } catch (e) {
      const saved = localStorage.getItem('user_preferences');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUserPreferences(parsed);
          if (parsed.preferredRideType) setCategoryFilter(parsed.preferredRideType);
          if (parsed.numberOfPassengers) setSearchPassengers(parsed.numberOfPassengers);
        } catch (_) {}
      }
    }
  };

  // Active search sequence ID to prevent stale search results from replacing newer ones
  const searchSeqRef = useRef(0);
  // Track the last searchId we saved to backend to prevent duplicate backend POSTs
  const lastSavedSearchIdRef = useRef(null);
  const lastSavedSearchTimeRef = useRef(0);

  const executeSearch = async (
    pLoc = pickup,
    dLoc = destination,
    passengers = searchPassengers,
    dist = distanceKm,
    dur = durationMins,
    isUserInitiated = false
  ) => {
    if (!pLoc || !dLoc) {
      setError('Please select both a valid pickup location and destination.');
      return;
    }

    const currentSeq = ++searchSeqRef.current;
    setError('');
    setLoading(true);

    try {
      const res = await rideService.searchRides({
        pickup: pLoc,
        destination: dLoc,
        distanceKm: dist,
        durationMins: dur,
        numberOfPassengers: passengers,
      });

      // Ignore stale response if a newer search request was initiated
      if (currentSeq !== searchSeqRef.current) {
        return;
      }

      if (res.data) {
        setPickup(res.data.pickup || pLoc);
        setDestination(res.data.destination || dLoc);
        setDistanceKm(res.data.distanceKm);
        setDurationMins(res.data.durationMins);
        setRideOptions(res.data.options || []);
        setRecommendation(res.data.recommendation);
        setDemandInfo(res.data.demandInfo);

        // Record genuine ML fare observations for trend graph
        const prevKey = prevFareSessionRef.current;
        const updPickup = res.data.pickup || pLoc;
        const updDest = res.data.destination || dLoc;
        const newKey = storeSearchObservations(
          updPickup, updDest,
          res.data.options,
          res.data.distanceKm,
          res.data.durationMins,
          prevKey, true // clear on route change
        );
        if (newKey) {
          prevFareSessionRef.current = newKey;
          setFareSessionKey(newKey);
        }

        // Subscribe WS & store searchId for persistence across refreshes
        if (res.data.searchId) {
          setActiveSearchId(res.data.searchId);
          localStorage.setItem('last_search_id', res.data.searchId.toString());
        }

        // Store active search for comparison page sync
        localStorage.setItem('last_search_result', JSON.stringify(res.data));
        
        // Save unique search comparison for Fare Analytics ONLY when user explicitly clicked compare
        if (isUserInitiated) {
          // Build the full structured record (null only if < 2 options total)
          const record = saveSearchComparison(res.data, true);

          // Guard: prevent duplicate backend POSTs for the same searchId within 10 seconds
          const searchIdStr = res.data.searchId ? String(res.data.searchId) : null;
          const now = Date.now();
          const isDuplicateSave =
            searchIdStr &&
            lastSavedSearchIdRef.current === searchIdStr &&
            now - lastSavedSearchTimeRef.current < 10000;

          if (!isDuplicateSave) {
            const pickupObj = res.data.pickup || pLoc;
            const destObj = res.data.destination || dLoc;
            const pickupName = (pickupObj?.name || 'Pickup').substring(0, 490);
            const destName = (destObj?.name || 'Destination').substring(0, 490);
            const distKm = res.data.distanceKm ?? dist ?? 0;

            // Always compute full breakdown from actual fares — never fall back to empty
            // Uses statically-imported functions: calculateCategoryBreakdown, getRideCategory, normalizeProviderName
            const breakdown = calculateCategoryBreakdown(res.data.options || [], res.data.numberOfPassengers || 1);
            let totalSavings = 0;
            let validCount = 0;
            const categorySavings = {};
            const winners = [];
            ['BIKE', 'AUTO', 'CAB'].forEach((cat) => {
              const c = breakdown[cat] || {};
              categorySavings[cat] = {
                category: cat,
                categoryName: c.categoryName || cat,
                hasComparison: c.hasComparison || false,
                optionsCount: c.optionsCount || 0,
                minFare: c.cheapestFare ?? null,
                maxFare: c.highestFare ?? null,
                cheapestFare: c.cheapestFare ?? null,
                highestFare: c.highestFare ?? null,
                potentialSavings: c.potentialSavings || 0,
                cheapestProvider: c.cheapestOption ? normalizeProviderName(c.cheapestOption.providerName) : null,
                highestProvider: c.highestOption ? normalizeProviderName(c.highestOption.providerName) : null,
                comparisonProvider: c.highestOption ? normalizeProviderName(c.highestOption.providerName) : null,
                cheapestRideType: c.cheapestOption?.rideType || null,
                highestRideType: c.highestOption?.rideType || null,
                comparisonRideType: c.highestOption?.rideType || null,
                cheapestName: c.cheapestName || null,
                highestName: c.highestName || null,
                comparisonName: c.comparisonName || c.highestName || null,
                winningProviders: c.winningProviders || [],
                message: c.message || '',
              };
              if (c.hasComparison) {
                totalSavings += c.potentialSavings || 0;
                validCount += 1;
                winners.push(...(c.winningProviders || []));
              }
            });

            const fullRecord = record || {
              id: searchIdStr || `search-${now}`,
              searchId: searchIdStr,
              timestamp: now,
              dateString: new Date(now).toISOString(),
              pickupName,
              destName,
              pickupLat: pickupObj?.latitude ?? null,
              pickupLng: pickupObj?.longitude ?? null,
              destLat: destObj?.latitude ?? null,
              destLng: destObj?.longitude ?? null,
              distanceKm: Math.round(distKm * 10) / 10,
              totalPotentialSavings: Math.round(totalSavings),
              validCategoryCount: validCount,
              categorySavings,
              categoryBreakdown: categorySavings,
              winningProviders: Array.from(new Set(winners)),
              options: (res.data.options || []).map((o) => ({
                provider: normProvider(o.providerName),
                rawProvider: o.providerName,
                rideType: o.rideType,
                fare: Math.round(o.comparableFare != null ? o.comparableFare : o.estimatedFare),
                surge: o.surgeFactor ?? 1.0,
                category: getRideCategory(o.rideType, o.providerName),
                available: o.available ?? true,
              })),
            };

            // Merge computed savings back into fullRecord for accuracy
            fullRecord.totalPotentialSavings = Math.round(totalSavings);
            fullRecord.validCategoryCount = validCount;
            fullRecord.categorySavings = categorySavings;
            fullRecord.categoryBreakdown = categorySavings;

            try {
              await searchComparisonService.saveComparison({
                rideSearchId: res.data.searchId || null,
                pickupName,
                destName,
                distanceKm: distKm,
                totalPotentialSavings: Math.round(totalSavings),
                validCategoryCount: validCount,
                comparisonJson: JSON.stringify(fullRecord),
              });
              // Mark success — update guard refs
              if (searchIdStr) {
                lastSavedSearchIdRef.current = searchIdStr;
                lastSavedSearchTimeRef.current = now;
              }
              // Notify FareAnalyticsPage (if mounted) to refresh immediately
              window.dispatchEvent(new CustomEvent('rideafford:searchSaved', { detail: { record: fullRecord } }));
            } catch (saveErr) {
              // Surface save failure visibly — do not silently ignore
              console.error('Backend save failed:', saveErr);
              setError(
                `Fare comparison could not be saved to your analytics history. ` +
                `Please check your connection or try again. (${saveErr?.response?.data?.message || saveErr?.message || 'Server error'})`
              );
            }
          }
        }

      }
    } catch (err) {
      if (currentSeq === searchSeqRef.current) {
        setError('Failed to fetch ride estimates. Please ensure backend and database are running.');
      }
    } finally {
      if (currentSeq === searchSeqRef.current) {
        setLoading(false);
      }
    }
  };

  const handleOnboardingComplete = (savedPrefs) => {
    setShowOnboarding(false);
    setUserPreferences(savedPrefs);
    if (savedPrefs?.preferredRideType) {
      setCategoryFilter(savedPrefs.preferredRideType);
    }
    if (savedPrefs?.numberOfPassengers) {
      setSearchPassengers(savedPrefs.numberOfPassengers);
    }

    // Show 3-step "How It Works" intro modal once
    setShowHowItWorks(true);

    // Execute search with new preferences
    executeSearch(pickup, destination, savedPrefs?.numberOfPassengers || 1);
  };

  const handleResetOnboarding = async () => {
    try {
      await userService.resetOnboarding();
      const userInfoStr = localStorage.getItem('user_info');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        userInfo.onboardingCompleted = false;
        userInfo.hasCompletedOnboarding = false;
        localStorage.setItem('user_info', JSON.stringify(userInfo));
      }
    } catch (e) {}
    navigate('/onboarding');
  };

  const handleRouteCalculated = (dist, dur, routeError) => {
    if (routeError) {
      setError(routeError);
      setDistanceKm(null);
      setDurationMins(null);
      return;
    }
    setDistanceKm(dist);
    setDurationMins(dur);
    // Recalculate fare estimates only if both locations are set
    if (pickupRef.current && destinationRef.current) {
      executeSearch(pickupRef.current, destinationRef.current, searchPassengersRef.current, dist, dur);
    }
  };

  // Reverse-geocode a clicked map coordinate to a human-readable name
  const handleMapClick = useCallback(async (coords) => {
    if (!pinMode) return;
    setReverseGeoLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'AffordableRidePlatform/1.0' } });
      let locationName = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          const parts = data.display_name.split(',').map(p => p.trim());
          locationName = parts.slice(0, 3).join(', ');
        }
      }
      const loc = { name: locationName, latitude: coords.latitude, longitude: coords.longitude };
      if (pinMode === 'pickup') {
        setPickup(loc);
      } else {
        setDestination(loc);
      }
    } catch (e) {
      const loc = { name: `Pinned (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`, latitude: coords.latitude, longitude: coords.longitude };
      if (pinMode === 'pickup') setPickup(loc);
      else setDestination(loc);
    } finally {
      setPinMode(null); // exit pin mode after placing
      setReverseGeoLoading(false);
    }
  }, [pinMode]);

  const applyFavouriteAsPickup = (fav) => {
    setPickup({ name: fav.name, latitude: fav.latitude, longitude: fav.longitude });
    setShowPickupFavs(false);
    setRideOptions([]);
    setDistanceKm(null);
    setDurationMins(null);
  };

  const applyFavouriteAsDestination = (fav) => {
    setDestination({ name: fav.name, latitude: fav.latitude, longitude: fav.longitude });
    setShowDestFavs(false);
    setRideOptions([]);
    setDistanceKm(null);
    setDurationMins(null);
  };

  const handleSwapLocations = () => {
    setPickup(destination);
    setDestination(pickup);
    setRideOptions([]);
    setDistanceKm(null);
    setDurationMins(null);
  };

  const handlePreferencesUpdate = (updated) => {
    setUserPreferences(updated);
    if (updated.preferredRideType) setCategoryFilter(updated.preferredRideType);
    if (updated.numberOfPassengers) setSearchPassengers(updated.numberOfPassengers);
    executeSearch(pickup, destination, updated.numberOfPassengers || searchPassengers);
  };

  const toggleWs = () => {
    if (wsClientRef.current) {
      if (wsStatus === 'connected') {
        wsClientRef.current.disconnect();
      } else {
        wsClientRef.current.connect();
      }
    }
  };

  // Standard Decorated Options
  const decoratedRideOptions = decorateOptionsWithOffers(rideOptions);

  // Dynamically resolve AI recommendation for lowest predicted fare
  const activeRecommendation = (() => {
    const available = decoratedRideOptions.filter(o => (o.available ?? true) && (o.comparableFare ?? o.estimatedFare) > 0);
    if (available.length === 0) return recommendation;
    const sorted = [...available].sort((a, b) => (a.comparableFare ?? a.estimatedFare) - (b.comparableFare ?? b.estimatedFare));
    const best = sorted[0];
    const second = sorted.length > 1 ? sorted[1] : best;
    const bestFare = best.comparableFare ?? best.estimatedFare;
    const secondFare = second.comparableFare ?? second.estimatedFare;
    const savings = Math.max(0, secondFare - bestFare);
    return {
      providerName: best.providerName,
      rideType: best.rideType,
      estimatedFare: bestFare,
      confidenceScore: 100.0,
      expectedSavings: savings,
      reason: `${best.providerName} ${best.rideType} has the lowest predicted fare (₹${Math.round(bestFare)}) among available rides.`
    };
  })();

  // Category & Budget Filter
  const filteredRideOptions = decoratedRideOptions.filter(opt => {
    // Budget limit filter if configured in preferences
    const fareToCheck = opt.comparableFare != null ? opt.comparableFare : opt.estimatedFare;
    if (userPreferences?.maxBudget != null && userPreferences.maxBudget > 0) {
      if (fareToCheck == null || isNaN(fareToCheck) || fareToCheck > userPreferences.maxBudget) {
        return false;
      }
    }

    if (categoryFilter === 'BIKE') {
      return opt.rideType.toLowerCase().includes('bike') ||
             opt.rideType.toLowerCase().includes('moto') ||
             opt.rideType.toLowerCase().includes('women') ||
             opt.providerName.toLowerCase().includes('pink');
    }
    if (categoryFilter === 'AUTO') {
      return opt.rideType.toLowerCase().includes('auto');
    }
    if (categoryFilter === 'CAB') {
      return !opt.rideType.toLowerCase().includes('bike') &&
             !opt.rideType.toLowerCase().includes('moto') &&
             !opt.rideType.toLowerCase().includes('women') &&
             !opt.rideType.toLowerCase().includes('auto') &&
             !opt.providerName.toLowerCase().includes('pink');
    }
    return true;
  });

  const isRecommended = (option) => {
    if (!activeRecommendation) return false;
    return option.providerName.toLowerCase() === activeRecommendation.providerName.toLowerCase() &&
           option.rideType.toLowerCase() === activeRecommendation.rideType.toLowerCase();
  };

  const surgeLevel = demandInfo?.level || 'OFF_PEAK';
  const surgeLabel = surgeLevel === 'HIGH_DEMAND' ? 'High Demand Pricing'
    : surgeLevel === 'PEAK_TIME' ? 'Peak Pricing'
    : 'Normal Pricing';
  const surgeLabelColor = surgeLevel === 'HIGH_DEMAND' ? '#ef4444'
    : surgeLevel === 'PEAK_TIME' ? 'var(--accent-yellow)'
    : 'var(--accent-green)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      {/* Onboarding Flow Modal */}
      <FirstTimeOnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      {/* How It Works Intro Modal */}
      <HowItWorksIntro
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      <main style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', padding: '30px 20px', flex: 1 }}>

        {/* Platform Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
            AI-Based <span className="gradient-text">Affordable Ride</span> Recommendation Platform
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            ML-powered fare prediction · Dynamic route · Cheapest ride recommendation
          </p>
        </div>

        {/* User Preferences Section */}
        <UserPreferencesBar
          preferences={userPreferences || { preferredRideType: 'ALL', numberOfPassengers: searchPassengers, ridePriority: 'LOWEST_FARE', maxBudget: null, applyOffers: true }}
          onUpdate={handlePreferencesUpdate}
          onResetOnboarding={handleResetOnboarding}
        />

        <LiveUpdateToggle
          wsStatus={wsStatus}
          lastUpdateMsg={lastWsMsg}
          demandInfo={demandInfo}
          onConnectToggle={toggleWs}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
          {/* Left Panel - Input Controls & Map */}
          <div style={{ gridColumn: 'span 7' }}>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} color="var(--accent-green)" /> Search Rides
              </h2>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>

                {/* ── PICKUP LOCATION with Favourites Dropdown ── */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PICKUP / SOURCE</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {favourites.length > 0 && (
                        <div ref={pickupFavRef} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            id="pickup-favs-btn"
                            onClick={() => { setShowPickupFavs(p => !p); setShowDestFavs(false); }}
                            style={{
                              background: showPickupFavs ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                              border: showPickupFavs ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                              color: showPickupFavs ? 'var(--accent-green)' : 'var(--text-muted)',
                              borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            }}
                            title="Pick from Favourites"
                          >
                            <Star size={11} /> Favourites <ChevronDown size={10} />
                          </button>
                          {showPickupFavs && (
                            <div style={{
                              position: 'absolute', top: '100%', right: 0, zIndex: 200, marginTop: '4px',
                              background: 'rgba(17,24,39,0.98)', border: '1px solid var(--border-color)',
                              borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                              minWidth: '240px', maxHeight: '200px', overflowY: 'auto',
                            }}>
                              <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase' }}>Set as Pickup</div>
                              {favourites.map(fav => (
                                <div
                                  key={fav.id}
                                  onClick={() => applyFavouriteAsPickup(fav)}
                                  style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.12)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{fav.name}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.address}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        id="pickup-pin-btn"
                        onClick={() => setPinMode(prev => prev === 'pickup' ? null : 'pickup')}
                        title="Click on map to set pickup"
                        style={{
                          background: pinMode === 'pickup' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                          border: pinMode === 'pickup' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                          color: pinMode === 'pickup' ? '#f59e0b' : 'var(--text-muted)',
                          borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        <MapPin size={11} /> {pinMode === 'pickup' ? 'Pinning...' : 'Pin'}
                      </button>
                    </div>
                  </div>
                  <LocationAutocomplete
                    label=""
                    placeholder="Search street, college, locality, landmark, city..."
                    onSelectLocation={(loc) => { setPickup(loc); setPinMode(null); }}
                    initialValue={pickup?.name || ''}
                  />
                </div>

                {/* Swap button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    type="button"
                    id="swap-locations-btn"
                    onClick={handleSwapLocations}
                    disabled={!pickup && !destination}
                    title="Swap pickup and destination"
                    style={{
                      background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
                      color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <ArrowLeftRight size={14} /> Swap
                  </button>
                </div>

                {/* ── DESTINATION LOCATION with Favourites Dropdown ── */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESTINATION / DROP</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {favourites.length > 0 && (
                        <div ref={destFavRef} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            id="dest-favs-btn"
                            onClick={() => { setShowDestFavs(p => !p); setShowPickupFavs(false); }}
                            style={{
                              background: showDestFavs ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
                              border: showDestFavs ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                              color: showDestFavs ? 'var(--accent-cyan)' : 'var(--text-muted)',
                              borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            }}
                            title="Pick from Favourites"
                          >
                            <Star size={11} /> Favourites <ChevronDown size={10} />
                          </button>
                          {showDestFavs && (
                            <div style={{
                              position: 'absolute', top: '100%', right: 0, zIndex: 200, marginTop: '4px',
                              background: 'rgba(17,24,39,0.98)', border: '1px solid var(--border-color)',
                              borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                              minWidth: '240px', maxHeight: '200px', overflowY: 'auto',
                            }}>
                              <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase' }}>Set as Destination</div>
                              {favourites.map(fav => (
                                <div
                                  key={fav.id}
                                  onClick={() => applyFavouriteAsDestination(fav)}
                                  style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.12)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{fav.name}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.address}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        id="dest-pin-btn"
                        onClick={() => setPinMode(prev => prev === 'destination' ? null : 'destination')}
                        title="Click on map to set destination"
                        style={{
                          background: pinMode === 'destination' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                          border: pinMode === 'destination' ? '1px solid #ef4444' : '1px solid var(--border-color)',
                          color: pinMode === 'destination' ? '#ef4444' : 'var(--text-muted)',
                          borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        <MapPin size={11} /> {pinMode === 'destination' ? 'Pinning...' : 'Pin'}
                      </button>
                    </div>
                  </div>
                  <LocationAutocomplete
                    label=""
                    placeholder="Search street, college, locality, landmark, city..."
                    onSelectLocation={(loc) => { setDestination(loc); setPinMode(null); }}
                    initialValue={destination?.name || ''}
                  />
                </div>

                {/* Passengers & Ride Type row */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Passengers
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, '5+'].map((n) => (
                        <button
                          key={n}
                          onClick={() => setSearchPassengers(n === '5+' ? 5 : n)}
                          style={{
                            width: '38px', height: '38px',
                            borderRadius: '8px',
                            border: searchPassengers === (n === '5+' ? 5 : n)
                              ? '2px solid var(--accent-green)'
                              : '1px solid var(--border-color)',
                            background: searchPassengers === (n === '5+' ? 5 : n)
                              ? 'rgba(16,185,129,0.18)'
                              : 'rgba(255,255,255,0.03)',
                            color: searchPassengers === (n === '5+' ? 5 : n)
                              ? 'var(--accent-green)'
                              : 'var(--text-muted)',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Preferred Ride Type
                    </label>
                    <select
                      className="form-input"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      style={{ height: '38px', padding: '0 10px', fontSize: '13px' }}
                    >
                      <option value="ALL">All Types</option>
                      <option value="BIKE">Bike / Moto</option>
                      <option value="AUTO">Auto</option>
                      <option value="CAB">Cab</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={() => executeSearch(pickup, destination, searchPassengers, distanceKm, durationMins, true)}
                className="btn-primary"
                style={{ width: '100%', padding: '14px' }}
                disabled={loading}
                id="compare-rides-btn"
              >
                {loading
                  ? <Loader2 size={20} className="animate-spin" />
                  : <><Search size={18} /> Compare Rides &amp; Find Cheapest</>
                }
              </button>
            </div>

            {/* Leaflet Map Card */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  OpenStreetMap Route
                </span>
                <div style={{ display: 'flex', align: 'center', gap: '12px' }}>
                  {reverseGeoLoading && (
                    <span style={{ fontSize: '11px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 size={12} className="animate-spin" /> Locating pin…
                    </span>
                  )}
                  {distanceKm && (
                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', fontWeight: 700 }}>
                      <span style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Navigation size={14} /> {Number(distanceKm).toFixed(1)} km Route
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {pinMode && (
                <div style={{ marginBottom: '8px', padding: '6px 12px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '8px', fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={13} /> Click on the map to set your <strong>{pinMode}</strong> location. Click the <em>Pin</em> button again to cancel.
                </div>
              )}

              <MapView
                pickup={pickup}
                destination={destination}
                onRouteCalculated={handleRouteCalculated}
                onMapClick={handleMapClick}
                pinMode={pinMode}
              />
            </div>
          </div>

          {/* Right Panel - AI Recommendation & Filtered Provider Cards */}
          <div style={{ gridColumn: 'span 5' }}>
            {/* AI Recommended Cheapest Ride */}
            <AiRecommendedCard
              recommendation={activeRecommendation}
              distanceKm={distanceKm}
              durationMins={durationMins}
              demandInfo={demandInfo}
            />

            {/* Fare Comparison Summary */}
            <FareComparisonSummary options={decoratedRideOptions} recommendation={activeRecommendation} />

            {/* Category Filter Controls */}
            <div className="glass-panel" style={{ padding: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={15} color="var(--accent-green)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>Category:</span>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['ALL', 'BIKE', 'AUTO', 'CAB'].map(cat => (
                  <button
                    key={cat}
                    id={`dashboard-cat-${cat.toLowerCase()}`}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      background: categoryFilter === cat ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
                      color: categoryFilter === cat ? '#ffffff' : 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      padding: '4px 9px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                {categoryFilter} Rides ({filteredRideOptions.length})
              </h3>
              <span style={{ fontSize: '11px', fontWeight: 700, color: surgeLabelColor }}>
                {surgeLabel}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(() => {
                const categoryBreakdown = calculateCategoryBreakdown(filteredRideOptions, searchPassengers);

                return filteredRideOptions.length > 0 ? (
                  filteredRideOptions.map((opt, index) => {
                    const optCat = getRideCategory(opt.rideType, opt.providerName);
                    const catInfo = categoryBreakdown[optCat] || null;

                    return (
                      <RideCard
                        key={index}
                        option={opt}
                        isRecommended={isRecommended(opt)}
                        categoryComparison={catInfo}
                      />
                    );
                  })
                ) : (
                  <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ marginBottom: '8px' }}>No ride options found for category "{categoryFilter}".</p>
                    <p style={{ fontSize: '12px', opacity: 0.7 }}>
                      {searchPassengers > 1
                        ? `Bikes are excluded for ${searchPassengers} passengers. Try selecting ALL to see all options.`
                        : 'Select ALL to view all options.'
                      }
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── Fare Trend Graph (full width, below the grid) ── */}
        <FareTrendGraph sessionKey={fareSessionKey} searchId={activeSearchId} wsSnapshots={latestWsSnapshots} />
      </main>

      <Footer />
    </div>
  );
}
