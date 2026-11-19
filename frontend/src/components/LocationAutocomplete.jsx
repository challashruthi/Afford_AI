import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Loader2, AlertCircle, Navigation, PinOff } from 'lucide-react';

// ─── Formatters & Normalizers ──────────────────────────────────────────────────

function extractPlaceInfo(item) {
  // Handle Photon format (GeoJSON Feature)
  if (item.properties && item.geometry) {
    const props = item.properties;
    const coords = item.geometry.coordinates; // [lon, lat]
    
    const primaryName = props.name || props.street || props.district || props.city || props.state || 'Selected Location';
    
    const addressParts = [
      props.street,
      props.housenumber ? `No. ${props.housenumber}` : null,
      props.district,
      props.suburb || props.neighbourhood,
      props.city || props.town || props.village,
      props.state,
      props.postcode,
      props.country
    ].filter(p => p && p !== primaryName);

    // Remove duplicate tokens
    const uniqueAddressParts = Array.from(new Set(addressParts));
    const subtitle = uniqueAddressParts.join(', ');

    const category = props.type || props.osm_value || (props.city ? 'City' : props.street ? 'Street' : 'Place');

    return {
      primaryName,
      subtitle: subtitle || 'Detailed Location',
      fullDisplayName: subtitle ? `${primaryName}, ${subtitle}` : primaryName,
      latitude: parseFloat(coords[1]),
      longitude: parseFloat(coords[0]),
      category: category.toUpperCase(),
      raw: item
    };
  }

  // Handle Nominatim format
  if (item.display_name && item.lat && item.lon) {
    const parts = item.display_name.split(',').map(p => p.trim());
    const primaryName = item.address?.amenity || item.address?.building || item.address?.road || item.name || parts[0];
    const subtitleParts = parts.filter(p => p !== primaryName);
    const subtitle = subtitleParts.slice(0, 5).join(', ');

    const category = item.type || item.class || 'Location';

    return {
      primaryName,
      subtitle: subtitle || 'Detailed Location',
      fullDisplayName: subtitle ? `${primaryName}, ${subtitle}` : primaryName,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      category: category.toUpperCase(),
      raw: item
    };
  }

  return null;
}

export default function LocationAutocomplete({ label, placeholder, onSelectLocation, onQueryChange, initialValue = '' }) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const dropdownRef = useRef(null);
  const searchCache = useRef({});
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hybrid search execution engine
  const performSearch = useCallback(async (searchQuery, isExplicit = false) => {
    const q = searchQuery ? searchQuery.trim() : '';
    if (!q || q.length < 2) {
      setSuggestions([]);
      setNotFound(false);
      setErrorMessage('');
      setShowDropdown(false);
      return;
    }

    const cacheKey = q.toLowerCase();
    if (searchCache.current[cacheKey]) {
      const cached = searchCache.current[cacheKey];
      setSuggestions(cached);
      setNotFound(cached.length === 0);
      setErrorMessage('');
      setShowDropdown(true);
      return;
    }

    // Cancel any ongoing fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setNotFound(false);
    setErrorMessage('');

    // Shared Nominatim options: include streets, residential, amenities, all place types
    const nomBaseParams = 'format=json&limit=10&addressdetails=1&namedetails=1&dedupe=1&countrycodes=in';
    const nomHeaders = { 'Accept': 'application/json', 'User-Agent': 'AffordableRidePlatform/1.0' };

    try {
      let results = [];

      // ── Step 1: Photon API (fast, fuzzy, indexed OSM — great for cities, colleges, streets) ──
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&bbox=68.7,8.4,97.4,37.6`;
        const res = await fetch(photonUrl, { signal });
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            results = data.features.map(extractPlaceInfo).filter(Boolean);
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
      }

      // ── Step 2: Nominatim with India country filter (catches small areas, hostels, PGs) ──
      if (results.length < 3) {
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/search?${nomBaseParams}&q=${encodeURIComponent(q)}`;
          const res = await fetch(nomUrl, { headers: nomHeaders, signal });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const nomResults = data.map(extractPlaceInfo).filter(Boolean);
              // Merge: add any that are not already in results (deduplicate by coordinates)
              const existingKeys = new Set(results.map(r => `${r.latitude.toFixed(3)}_${r.longitude.toFixed(3)}`));
              for (const r of nomResults) {
                const key = `${r.latitude.toFixed(3)}_${r.longitude.toFixed(3)}`;
                if (!existingKeys.has(key)) { existingKeys.add(key); results.push(r); }
              }
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      // ── Step 3: Nominatim structured query — try treating entire input as a street/place name ──
      if (results.length === 0) {
        try {
          const structUrl = `https://nominatim.openstreetmap.org/search?${nomBaseParams}&street=${encodeURIComponent(q)}`;
          const res = await fetch(structUrl, { headers: nomHeaders, signal });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              results = data.map(extractPlaceInfo).filter(Boolean);
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      // ── Step 4: Fallback — append ", India" for queries without regional context ──
      if (results.length === 0 && !q.toLowerCase().includes('india')) {
        try {
          const nomIndiaUrl = `https://nominatim.openstreetmap.org/search?${nomBaseParams}&q=${encodeURIComponent(q + ', India')}`;
          const res = await fetch(nomIndiaUrl, { headers: nomHeaders, signal });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              results = data.map(extractPlaceInfo).filter(Boolean);
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      // Deduplicate results by rounded lat/lng and primary name
      const uniqueResults = [];
      const seen = new Set();

      for (const item of results) {
        const key = `${item.primaryName.toLowerCase()}_${item.latitude.toFixed(3)}_${item.longitude.toFixed(3)}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueResults.push(item);
        }
      }

      searchCache.current[cacheKey] = uniqueResults;
      setSuggestions(uniqueResults);
      setNotFound(uniqueResults.length === 0);
      setShowDropdown(true);

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Geocoding error:', err);
        setNotFound(true);
        setErrorMessage('Location search timeout or network error. Please try again.');
        setSuggestions([]);
        setShowDropdown(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced input change handler
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setNotFound(false);
    setErrorMessage('');
    if (onQueryChange) {
      onQueryChange(value);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(value, false);
      }, 400);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      performSearch(query, true);
    }
  };

  const handleSelect = (item) => {
    const locationData = {
      name: item.fullDisplayName,
      latitude: item.latitude,
      longitude: item.longitude,
      rawItem: item.raw
    };
    
    setQuery(item.fullDisplayName);
    setShowDropdown(false);
    onSelectLocation(locationData);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
        {label}
      </label>
      
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <MapPin size={18} color="var(--accent-green)" style={{ position: 'absolute', left: '12px', zIndex: 2 }} />
        
        <input
          type="text"
          className="form-input"
          style={{ paddingLeft: '38px', paddingRight: '84px' }}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 || notFound || errorMessage) {
              setShowDropdown(true);
            }
          }}
        />

        <button
          type="button"
          onClick={() => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            performSearch(query, true);
          }}
          disabled={loading}
          style={{
            position: 'absolute',
            right: '6px',
            background: 'var(--accent-green)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 3
          }}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <Search size={13} />
              Search
            </>
          )}
        </button>
      </div>

      {showDropdown && (
        <div className="suggestions-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 100,
          marginTop: '4px',
          background: 'rgba(17, 24, 39, 0.98)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          maxHeight: '280px',
          overflowY: 'auto'
        }}>
          {notFound || errorMessage ? (
            <div style={{ padding: '14px 16px', color: '#fca5a5', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{errorMessage || 'No results found. Try a landmark, road name, colony, or full address.'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '24px' }}>
                <PinOff size={12} />
                <span>Can’t find it? Click directly on the map below to pin your location.</span>
              </div>
            </div>
          ) : (
            suggestions.map((item, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => handleSelect(item)}
                style={{
                  padding: '10px 14px',
                  borderBottom: index < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Navigation size={13} color="var(--accent-green)" style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.primaryName}
                    </span>
                  </div>
                  {item.subtitle && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px', paddingLeft: '19px' }}>
                      {item.subtitle}
                    </div>
                  )}
                </div>

                {item.category && (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--accent-cyan)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}>
                    {item.category}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

