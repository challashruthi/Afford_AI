/**
 * fareHistoryStore.js
 *
 * In-memory store for FareObservation records.
 * Observations are keyed by route session:
 *   `${srcLat},${srcLng}->${dstLat},${dstLng}::${rideType}`
 *
 * predictionMode values:
 *   ML_PREDICTED   – calculated by our ML pipeline (default for this app)
 *   OFFICIAL_LIVE  – actual authorised live API (not yet connected)
 *   DEMO_ESTIMATE  – fallback demo value
 *
 * IMPORTANT: No Math.random(), no fabricated points.
 * A new observation is created only when a genuine prediction event arrives.
 */

let _store = {}; // { sessionKey: FareObservation[] }
let _listeners = []; // () => void

/**
 * Build a deterministic session key from route + rideType.
 * Round coords to 5 decimal places to avoid float noise.
 */
export function buildSessionKey({ sourceLat, sourceLng, destLat, destLng, rideType }) {
  const r = (v) => Math.round(v * 100000) / 100000;
  return `${r(sourceLat)},${r(sourceLng)}->${r(destLat)},${r(destLng)}::${rideType ?? 'ALL'}`;
}

/**
 * Record a new observation.
 * @param {object} obs - FareObservation fields
 */
export function recordObservation({
  id: obsId,
  timestamp,
  sessionKey,
  provider,        // e.g. "Ola"
  rideType,        // e.g. "Bike"
  distanceKm,
  durationMinutes,
  predictedFare,
  surgeMultiplier,
  available,
  predictionMode = 'ML_PREDICTED',  // ML_PREDICTED | OFFICIAL_LIVE | DEMO_ESTIMATE
}) {
  if (!sessionKey) return;
  if (!_store[sessionKey]) {
    _store[sessionKey] = [];
  }

  const roundedFare = Math.round(predictedFare * 100) / 100;
  const now = Date.now();
  const existing = _store[sessionKey];

  // Check if the most recent observation for this provider+rideType has the exact same fare and occurred < 5 seconds ago
  const lastObsIndex = existing.slice().reverse().findIndex(o => o.provider === provider && o.rideType === rideType);
  if (lastObsIndex !== -1) {
    const lastObs = existing[existing.length - 1 - lastObsIndex];
    if (lastObs.predictedFare === roundedFare && (now - lastObs.timestamp < 5000)) {
      // Skip redundant duplicate within 5 seconds
      return;
    }
  }

  const observation = {
    id: obsId || `${now}-${provider}-${rideType}`,
    timestamp: timestamp || now,
    provider,
    rideType,
    distanceKm,
    durationMinutes,
    predictedFare: roundedFare,
    surgeMultiplier: surgeMultiplier ?? 1.0,
    available: available ?? true,
    predictionMode,
  };

  _store[sessionKey].push(observation);
  
  // Keep max 100 observations per session key
  if (_store[sessionKey].length > 100) {
    _store[sessionKey] = _store[sessionKey].slice(-100);
  }

  _notifyListeners();
}

/**
 * Get all observations for a session key,
 * optionally capped to the last `windowMs` milliseconds.
 */
export function getObservations(sessionKey, windowMs = 30 * 60 * 1000) {
  if (!sessionKey || !_store[sessionKey]) return [];
  const cutoff = Date.now() - windowMs;
  return _store[sessionKey].filter((obs) => obs.timestamp >= cutoff);
}

/**
 * Clear history for a given session (e.g. when route changes).
 */
export function clearSession(sessionKey) {
  if (sessionKey && _store[sessionKey]) {
    delete _store[sessionKey];
    _notifyListeners();
  }
}

/**
 * Clear ALL stored history.
 */
export function clearAllHistory() {
  _store = {};
  _notifyListeners();
}

/**
 * Subscribe to history changes. Returns an unsubscribe function.
 */
export function subscribe(listener) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

function _notifyListeners() {
  _listeners.forEach((l) => {
    try { l(); } catch (_) {}
  });
}

/**
 * Helpers
 */
export function predictionModeLabel(mode) {
  switch (mode) {
    case 'OFFICIAL_LIVE': return 'Official Live Estimate';
    case 'DEMO_ESTIMATE':  return 'Demo Estimate';
    case 'ML_PREDICTED':
    default:               return 'ML Predicted';
  }
}

// ── Saved Search Comparisons & Category-Specific Fare Analytics ───────────────

const COMPARISONS_STORAGE_KEY = 'saved_search_comparisons';

/**
 * Standardize ride categories strictly into BIKE, AUTO, or CAB.
 */
export function getRideCategory(rideType = '', providerName = '') {
  const type = String(rideType || '').toLowerCase();
  const provider = String(providerName || '').toLowerCase();
  if (type.includes('bike') || type.includes('moto') || type.includes('women') || provider.includes('pink')) {
    return 'BIKE';
  }
  if (type.includes('auto')) {
    return 'AUTO';
  }
  return 'CAB';
}

/**
 * Display label for a ride category.
 */
export function getCategoryDisplayName(cat) {
  switch (cat) {
    case 'BIKE': return 'Bike';
    case 'AUTO': return 'Auto';
    case 'CAB': return 'Cab';
    default: return cat || 'Ride';
  }
}

/**
 * Clean up provider names for analytics and comparison display.
 */
export function normalizeProviderName(name = '') {
  const p = String(name || '').toLowerCase();
  if (p.includes('rapido')) return 'Rapido';
  if (p.includes('ola')) return 'Ola';
  if (p.includes('uber')) return 'Uber';
  if (p.includes('pink')) return 'Pink Bike';
  return name;
}

/**
 * Computes category-specific fare comparisons for an array of ride options.
 * Compares ONLY within the same category: Bike vs Bike, Auto vs Auto, Cab vs Cab.
 * Never compares Bike against Auto or Cab fares.
 *
 * @param {Array} options - List of ride option objects
 * @param {number} passengerCount - Active passenger count for capacity filtering
 * @returns {object} { BIKE: {...}, AUTO: {...}, CAB: {...} }
 */
export function calculateCategoryBreakdown(options = [], passengerCount = 1) {
  const getCapacity = (type, cap) => {
    if (cap) return cap;
    const t = String(type || '').toLowerCase();
    if (t.includes('bike') || t.includes('moto') || t.includes('women')) return 1;
    if (t.includes('auto')) return 3;
    return 4;
  };

  const categories = { BIKE: [], AUTO: [], CAB: [] };

  (options || []).forEach((opt) => {
    const isAvail = opt.available ?? true;
    const rawFare = opt.comparableFare != null ? opt.comparableFare : opt.estimatedFare;
    const fare = Math.round(Number(rawFare));
    if (!isAvail || isNaN(fare) || fare <= 0) return;

    if (passengerCount > 1) {
      const cap = getCapacity(opt.rideType, opt.capacity);
      if (cap < passengerCount) return;
    }

    const cat = getRideCategory(opt.rideType, opt.providerName);
    if (categories[cat]) {
      categories[cat].push({
        ...opt,
        fare,
        normalizedProvider: normalizeProviderName(opt.providerName),
      });
    }
  });

  const result = {};
  const CATEGORIES = ['BIKE', 'AUTO', 'CAB'];

  CATEGORIES.forEach((cat) => {
    const list = categories[cat];
    const catName = getCategoryDisplayName(cat);

    // Group options by distinct normalized provider so we compare PROVIDERS within the category
    // E.g. Rapido Bike vs Ola Bike vs Uber Bike (never a provider against itself)
    const providerMap = {};
    list.forEach((opt) => {
      const pName = opt.normalizedProvider;
      if (!providerMap[pName] || opt.fare < providerMap[pName].fare) {
        providerMap[pName] = opt;
      }
    });

    const providerList = Object.values(providerMap);

    if (providerList.length < 2) {
      result[cat] = {
        category: cat,
        categoryName: catName,
        hasComparison: false,
        status: 'Not enough providers to compare.',
        optionsCount: providerList.length,
        options: providerList,
        cheapestOption: providerList[0] || null,
        highestOption: providerList[0] || null,
        cheapestFare: providerList[0]?.fare ?? null,
        highestFare: providerList[0]?.fare ?? null,
        potentialSavings: 0,
        winningProviders: providerList[0] ? [providerList[0].normalizedProvider] : [],
        cheapestName: null,
        highestName: null,
        comparisonName: null,
        message: 'Not enough providers to compare.',
      };
    } else {
      // Sort ascending by fare
      providerList.sort((a, b) => a.fare - b.fare);
      const cheapest = providerList[0];
      const highest = providerList[providerList.length - 1];
      const minFare = cheapest.fare;
      const maxFare = highest.fare;
      const savings = Math.max(0, maxFare - minFare);

      // Tie handling: all providers matching minFare share the win
      const tiedCheapest = providerList.filter((o) => o.fare === minFare);
      const winningProviders = Array.from(new Set(tiedCheapest.map((o) => o.normalizedProvider)));

      const formatOptionName = (opt) => {
        const prov = opt.normalizedProvider;
        const type = opt.rideType || catName;
        return type.toLowerCase().includes(prov.toLowerCase()) ? type : `${prov} ${type}`;
      };

      const cheapestName = formatOptionName(cheapest);
      const highestName = formatOptionName(highest);

      let message = '';
      if (savings > 0) {
        message = `${cheapestName} ₹${minFare} vs ${highestName} ₹${maxFare} — Potential savings ₹${savings}.`;
      } else {
        message = `${cheapestName} ₹${minFare} and ${highestName} ₹${maxFare} offer the same fare (₹${minFare}) for ${catName} — Potential savings ₹0.`;
      }

      result[cat] = {
        category: cat,
        categoryName: catName,
        hasComparison: true,
        status: 'Valid comparison',
        optionsCount: providerList.length,
        options: providerList,
        cheapestOption: cheapest,
        highestOption: highest,
        cheapestFare: minFare,
        highestFare: maxFare,
        potentialSavings: savings,
        winningProviders,
        cheapestName,
        highestName,
        comparisonName: highestName,
        message,
      };
    }
  });

  return result;
}

/**
 * Persist an intentional search comparison to localStorage.
 *
 * STRICT ENFORCEMENT RULES:
 * 1. Must be explicitly user-initiated (isUserInitiated === true) via "Compare Rides & Find Cheapest".
 * 2. Never called on page load, prefill, background update, re-renders, or page refresh.
 * 3. Deduplicated by searchId and recent timestamp to prevent duplicate entries.
 * 4. Stores category-specific savings breakdown (Bike vs Bike, Auto vs Auto, Cab vs Cab).
 */
export function saveSearchComparison(searchData, isUserInitiated = false) {
  // Rule 1: Guard against automatic calls from renders, page loads, or prefills
  if (!isUserInitiated) {
    return null;
  }
  if (!searchData || !searchData.options || searchData.options.length < 2) {
    return null;
  }

  try {
    const existingRaw = localStorage.getItem(COMPARISONS_STORAGE_KEY);
    const history = existingRaw ? JSON.parse(existingRaw) : [];

    const searchId = searchData.searchId ? String(searchData.searchId) : null;
    const pickupName = searchData.pickup?.name || 'Pickup';
    const destName = searchData.destination?.name || 'Destination';
    const distanceKm = Number(searchData.distanceKm || 0);

    // Rule 3: Deduplicate against existing history (searchId match or same route within 30s)
    // Rule 3: Deduplicate against existing history
    // Avoid double-entries from rapid repeated clicks (< 4s) or exact same searchId,
    // while retaining intentional separate searches on the same route.
    const now = Date.now();
    const isDuplicate = history.some((item) => {
      if (searchId && item.searchId === searchId) return true;
      const sameRoute = item.pickupName === pickupName && item.destName === destName && item.distanceKm === Math.round(distanceKm * 10) / 10;
      const rapidClick = (now - (item.timestamp || 0)) < 4000;
      return sameRoute && rapidClick;
    });

    if (isDuplicate) return null;

    // Rule 4: Category-specific savings calculation (Bike vs Bike, Auto vs Auto, Cab vs Cab)
    const breakdown = calculateCategoryBreakdown(searchData.options, searchData.numberOfPassengers || 1);

    let totalPotentialSavings = 0;
    let validCategoryCount = 0;
    const categorySavings = {};
    const categoryWinners = [];

    ['BIKE', 'AUTO', 'CAB'].forEach((cat) => {
      const c = breakdown[cat];
      const cheapProv = c.cheapestOption ? normalizeProviderName(c.cheapestOption.providerName) : null;
      const highProv = c.highestOption ? normalizeProviderName(c.highestOption.providerName) : null;

      categorySavings[cat] = {
        category: cat,
        categoryName: c.categoryName,
        hasComparison: c.hasComparison,
        optionsCount: c.optionsCount,
        minFare: c.cheapestFare,
        maxFare: c.highestFare,
        cheapestFare: c.cheapestFare,
        highestFare: c.highestFare,
        potentialSavings: c.potentialSavings,
        cheapestProvider: cheapProv,
        highestProvider: highProv,
        comparisonProvider: highProv,
        cheapestRideType: c.cheapestOption ? c.cheapestOption.rideType : null,
        highestRideType: c.highestOption ? c.highestOption.rideType : null,
        comparisonRideType: c.highestOption ? c.highestOption.rideType : null,
        cheapestName: c.cheapestName,
        highestName: c.highestName,
        comparisonName: c.comparisonName || c.highestName,
        winningProviders: c.winningProviders || [],
        message: c.message,
      };

      if (c.hasComparison) {
        totalPotentialSavings += c.potentialSavings;
        validCategoryCount += 1;
        categoryWinners.push(...(c.winningProviders || []));
      }
    });

    // Allow saving even when validCategoryCount === 0 (single-provider categories).
    // The record still contains the raw options and any single-category data,
    // which is useful for analytics aggregation. We only reject completely empty searches.
    // (The old hard gate caused complete loss of real searches with e.g. only 1 bike provider.)

    const record = {
      id: searchId || `search-${now}-${Math.random().toString(36).substr(2, 6)}`,
      searchId: searchId,
      timestamp: now,
      dateString: new Date(now).toISOString(),
      pickupName,
      destName,
      distanceKm: Math.round(distanceKm * 10) / 10,
      totalPotentialSavings,
      validCategoryCount,
      categorySavings,
      categoryBreakdown: categorySavings, // alias for backwards compatibility
      winningProviders: Array.from(new Set(categoryWinners)),
      options: (searchData.options || []).map((o) => ({
        provider: normalizeProviderName(o.providerName),
        rawProvider: o.providerName,
        rideType: o.rideType,
        fare: Math.round(o.comparableFare != null ? o.comparableFare : o.estimatedFare),
        surge: o.surgeFactor ?? 1.0,
        category: getRideCategory(o.rideType, o.providerName),
        available: o.available ?? true,
      })),
    };

    history.unshift(record); // newest first
    const trimmed = history.slice(0, 50); // keep up to 50 unique intentional comparisons
    localStorage.setItem(COMPARISONS_STORAGE_KEY, JSON.stringify(trimmed));
    return record;
  } catch (err) {
    console.warn('Could not save search comparison:', err);
    return null;
  }
}

/**
 * Retrieve saved search comparisons.
 */
export function getSavedSearchComparisons() {
  try {
    const raw = localStorage.getItem(COMPARISONS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

/**
 * Primary central analytics calculator for the Fare Analytics Dashboard.
 * Computes:
 * - Summary cards: Total searches, Bike savings, Auto savings, Cab savings, Total savings opportunity
 * - Route-wise savings table breakdown
 * - Average provider fares per category (Rapido vs Ola vs Uber)
 * - Provider win distributions per category
 */
export function getFareAnalyticsData() {
  const comparisons = getSavedSearchComparisons();
  if (!comparisons || comparisons.length === 0) {
    return {
      hasData: false,
      totalSearches: 0,
      bikeTotalSavings: 0,
      autoTotalSavings: 0,
      cabTotalSavings: 0,
      totalSavingsOpportunity: 0,
      categoryStats: {
        BIKE: { totalSavings: 0, searchCount: 0 },
        AUTO: { totalSavings: 0, searchCount: 0 },
        CAB: { totalSavings: 0, searchCount: 0 },
      },
      categoryWins: {
        ALL: [],
        BIKE: [],
        AUTO: [],
        CAB: [],
      },
      categoryAverageFares: [],
      categorySavingsTotals: [
        { category: 'Bike', savings: 0, color: '#10b981' },
        { category: 'Auto', savings: 0, color: '#f59e0b' },
        { category: 'Cab', savings: 0, color: '#06b6d4' },
      ],
      routeWiseSavings: [],
    };
  }

  let bikeTotalSavings = 0;
  let autoTotalSavings = 0;
  let cabTotalSavings = 0;
  let bikeSearchCount = 0;
  let autoSearchCount = 0;
  let cabSearchCount = 0;

  // Track provider wins per category
  const wins = {
    BIKE: { Rapido: 0, Ola: 0, Uber: 0, 'Pink Bike': 0 },
    AUTO: { Rapido: 0, Ola: 0, Uber: 0 },
    CAB: { Rapido: 0, Ola: 0, Uber: 0 },
  };

  // Track provider fare sums & counts for average fares per category
  const fareSums = {
    BIKE: { Rapido: { sum: 0, count: 0 }, Ola: { sum: 0, count: 0 }, Uber: { sum: 0, count: 0 }, 'Pink Bike': { sum: 0, count: 0 } },
    AUTO: { Rapido: { sum: 0, count: 0 }, Ola: { sum: 0, count: 0 }, Uber: { sum: 0, count: 0 } },
    CAB: { Rapido: { sum: 0, count: 0 }, Ola: { sum: 0, count: 0 }, Uber: { sum: 0, count: 0 } },
  };

  const routeWiseSavings = [];

  for (const comp of comparisons) {
    const cs = comp.categorySavings || comp.categoryBreakdown || {};

    // Process stored options to accumulate average provider fares
    if (Array.isArray(comp.options)) {
      comp.options.forEach((opt) => {
        const cat = opt.category;
        const norm = normalizeProviderName(opt.provider || opt.rawProvider || opt.providerName);
        const fare = Number(opt.fare);
        if (cat && fareSums[cat] && norm && fareSums[cat][norm] && fare > 0) {
          fareSums[cat][norm].sum += fare;
          fareSums[cat][norm].count += 1;
        }
      });
    }

    // Category comparison extractor
    const parseCat = (catKey) => {
      const c = cs[catKey];
      if (!c || !c.hasComparison) {
        return {
          hasComparison: false,
          cheapestProvider: c?.cheapestProvider || null,
          cheapestFare: c?.minFare ?? c?.cheapestFare ?? null,
          comparisonProvider: null,
          highestFare: null,
          potentialSavings: 0,
          displayText: 'Not enough providers to compare',
          shortStatus: 'Not enough providers',
        };
      }

      const cheapestProv = c.cheapestProvider || 'Cheapest';
      const cheapestFare = c.minFare ?? c.cheapestFare ?? 0;
      const compProv = c.comparisonProvider || c.highestProvider || 'Alternative';
      const highestFare = c.maxFare ?? c.highestFare ?? cheapestFare;
      const savings = Math.max(0, c.potentialSavings != null ? c.potentialSavings : (highestFare - cheapestFare));

      const formatLabel = (prov, type, defaultCat) => {
        if (!type) return `${prov} ${defaultCat}`;
        return type.toLowerCase().includes(prov.toLowerCase()) ? type : `${prov} ${type}`;
      };

      const cheapestLabel = c.cheapestName || formatLabel(cheapestProv, c.cheapestRideType, getCategoryDisplayName(catKey));
      const comparisonLabel = c.comparisonName || c.highestName || formatLabel(compProv, c.comparisonRideType || c.highestRideType, getCategoryDisplayName(catKey));

      let displayText = '';
      if (savings > 0) {
        displayText = `${cheapestLabel} ₹${cheapestFare} vs ${comparisonLabel} ₹${highestFare} — Potential savings ₹${savings}`;
      } else {
        displayText = `${cheapestLabel} ₹${cheapestFare} and ${comparisonLabel} ₹${highestFare} offer same fare (₹${cheapestFare}) — Potential savings ₹0`;
      }

      return {
        hasComparison: true,
        cheapestProvider: cheapestProv,
        cheapestRideType: c.cheapestRideType || '',
        cheapestName: cheapestLabel,
        cheapestFare,
        comparisonProvider: compProv,
        comparisonRideType: c.comparisonRideType || c.highestRideType || '',
        comparisonName: comparisonLabel,
        highestFare,
        potentialSavings: savings,
        displayText,
        shortStatus: savings > 0 ? `Save ₹${savings} with ${cheapestProv}` : `Tied lowest (₹${cheapestFare})`,
      };
    };

    const bikeSummary = parseCat('BIKE');
    const autoSummary = parseCat('AUTO');
    const cabSummary = parseCat('CAB');

    if (bikeSummary.hasComparison) {
      bikeTotalSavings += bikeSummary.potentialSavings;
      bikeSearchCount += 1;
      const winning = cs.BIKE?.winningProviders || (bikeSummary.cheapestProvider ? [bikeSummary.cheapestProvider] : []);
      if (winning.length > 0) {
        const credit = 1.0 / winning.length;
        winning.forEach((w) => {
          const norm = normalizeProviderName(w);
          if (wins.BIKE[norm] !== undefined) wins.BIKE[norm] += credit;
        });
      }
    }

    if (autoSummary.hasComparison) {
      autoTotalSavings += autoSummary.potentialSavings;
      autoSearchCount += 1;
      const winning = cs.AUTO?.winningProviders || (autoSummary.cheapestProvider ? [autoSummary.cheapestProvider] : []);
      if (winning.length > 0) {
        const credit = 1.0 / winning.length;
        winning.forEach((w) => {
          const norm = normalizeProviderName(w);
          if (wins.AUTO[norm] !== undefined) wins.AUTO[norm] += credit;
        });
      }
    }

    if (cabSummary.hasComparison) {
      cabTotalSavings += cabSummary.potentialSavings;
      cabSearchCount += 1;
      const winning = cs.CAB?.winningProviders || (cabSummary.cheapestProvider ? [cabSummary.cheapestProvider] : []);
      if (winning.length > 0) {
        const credit = 1.0 / winning.length;
        winning.forEach((w) => {
          const norm = normalizeProviderName(w);
          if (wins.CAB[norm] !== undefined) wins.CAB[norm] += credit;
        });
      }
    }

    const routeTotalSavings = (bikeSummary.potentialSavings || 0) + (autoSummary.potentialSavings || 0) + (cabSummary.potentialSavings || 0);

    const tsNum = typeof comp.timestamp === 'number'
      ? comp.timestamp
      : new Date(comp.dateString || comp.timestamp || Date.now()).getTime();

    routeWiseSavings.push({
      id: comp.id,
      timestamp: tsNum,
      dateFormatted: new Date(tsNum).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      pickup: comp.pickupName,
      destination: comp.destName,
      distanceKm: comp.distanceKm,
      bike: bikeSummary,
      auto: autoSummary,
      cab: cabSummary,
      routeTotalSavings,
    });
  }

  const totalSavingsOpportunity = bikeTotalSavings + autoTotalSavings + cabTotalSavings;

  // Format Category Average Fares for Grouped Bar Chart
  const categoryAverageFares = ['BIKE', 'AUTO', 'CAB'].map((catKey) => {
    const catName = getCategoryDisplayName(catKey);
    const dataObj = { category: catName, key: catKey };
    ['Rapido', 'Ola', 'Uber'].forEach((p) => {
      const item = fareSums[catKey][p];
      if (item && item.count > 0) {
        dataObj[p] = Math.round(item.sum / item.count);
      } else {
        dataObj[p] = null;
      }
    });
    return dataObj;
  });

  // Format Category Win Distributions
  const formatWins = (winObj) => {
    const total = Object.values(winObj).reduce((a, b) => a + b, 0);
    return Object.entries(winObj)
      .map(([provider, count]) => ({
        provider,
        wins: Math.round(count * 10) / 10,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .filter((p) => p.wins > 0 || total === 0)
      .sort((a, b) => b.wins - a.wins);
  };

  const allWinsObj = { Rapido: 0, Ola: 0, Uber: 0, 'Pink Bike': 0 };
  ['BIKE', 'AUTO', 'CAB'].forEach((cat) => {
    Object.entries(wins[cat]).forEach(([p, c]) => {
      allWinsObj[p] = (allWinsObj[p] || 0) + c;
    });
  });

  const categoryWins = {
    ALL: formatWins(allWinsObj),
    BIKE: formatWins(wins.BIKE),
    AUTO: formatWins(wins.AUTO),
    CAB: formatWins(wins.CAB),
  };

  const categorySavingsTotals = [
    { category: 'Bike', savings: Math.round(bikeTotalSavings), color: '#10b981' },
    { category: 'Auto', savings: Math.round(autoTotalSavings), color: '#f59e0b' },
    { category: 'Cab', savings: Math.round(cabTotalSavings), color: '#06b6d4' },
  ];

  return {
    hasData: comparisons.length > 0,
    totalSearches: comparisons.length,
    bikeTotalSavings: Math.round(bikeTotalSavings),
    autoTotalSavings: Math.round(autoTotalSavings),
    cabTotalSavings: Math.round(cabTotalSavings),
    totalSavingsOpportunity: Math.round(totalSavingsOpportunity),
    categoryStats: {
      BIKE: {
        totalSavings: Math.round(bikeTotalSavings),
        searchCount: bikeSearchCount,
        avgSavingsPerSearch: bikeSearchCount > 0 ? Math.round(bikeTotalSavings / bikeSearchCount) : 0,
        mostFrequentCheapest: categoryWins.BIKE[0] || null,
      },
      AUTO: {
        totalSavings: Math.round(autoTotalSavings),
        searchCount: autoSearchCount,
        avgSavingsPerSearch: autoSearchCount > 0 ? Math.round(autoTotalSavings / autoSearchCount) : 0,
        mostFrequentCheapest: categoryWins.AUTO[0] || null,
      },
      CAB: {
        totalSavings: Math.round(cabTotalSavings),
        searchCount: cabSearchCount,
        avgSavingsPerSearch: cabSearchCount > 0 ? Math.round(cabTotalSavings / cabSearchCount) : 0,
        mostFrequentCheapest: categoryWins.CAB[0] || null,
      },
    },
    categoryWins,
    categoryAverageFares,
    categorySavingsTotals,
    routeWiseSavings,
  };
}

/**
 * Compute provider win analytics strictly from within-category comparisons.
 */
export function getProviderWinStats() {
  const analytics = getFareAnalyticsData();
  if (!analytics.hasData) {
    return {
      hasData: false,
      totalComparisons: 0,
      totalCategoryEvaluations: 0,
      providerStats: [],
      tieCount: 0,
    };
  }

  const allWins = analytics.categoryWins.ALL || [];
  const totalCategoryEvaluations =
    (analytics.categoryStats.BIKE.searchCount || 0) +
    (analytics.categoryStats.AUTO.searchCount || 0) +
    (analytics.categoryStats.CAB.searchCount || 0);

  return {
    hasData: true,
    totalComparisons: analytics.totalSearches,
    totalCategoryEvaluations,
    providerStats: allWins,
    tieCount: 0,
  };
}

/**
 * Compute monthly potential savings tracker summary.
 */
export function getMonthlySavingsSummary() {
  const analytics = getFareAnalyticsData();
  if (!analytics.hasData) {
    return {
      hasData: false,
      totalComparisons: 0,
      totalPotentialSavings: 0,
      averageSavingsPerSearch: 0,
      maxSingleSearchSavings: 0,
      categoryTotals: { BIKE: 0, AUTO: 0, CAB: 0 },
      recentComparisons: [],
    };
  }

  const avgSavings = analytics.totalSearches > 0
    ? Math.round(analytics.totalSavingsOpportunity / analytics.totalSearches)
    : 0;

  const maxSavings = Math.max(...analytics.routeWiseSavings.map((r) => r.routeTotalSavings || 0), 0);

  return {
    hasData: true,
    totalComparisons: analytics.totalSearches,
    totalPotentialSavings: analytics.totalSavingsOpportunity,
    averageSavingsPerSearch: avgSavings,
    maxSingleSearchSavings: maxSavings,
    categoryTotals: {
      BIKE: analytics.bikeTotalSavings,
      AUTO: analytics.autoTotalSavings,
      CAB: analytics.cabTotalSavings,
    },
    recentComparisons: analytics.routeWiseSavings.slice(0, 10),
  };
}

export function clearSavedComparisons() {
  try {
    localStorage.removeItem(COMPARISONS_STORAGE_KEY);
  } catch (_) {}
}

