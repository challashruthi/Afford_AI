import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Custom Leaflet Icons using inline SVG data URIs
const pickupIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#10b981" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3" fill="#ffffff"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const destIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3" fill="#ffffff"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const tempPinIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#f59e0b" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3" fill="#ffffff"/>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

// Helper component to auto-recenter and fit bounds
function FitBoundsController({ pickup, destination, routeCoords }) {
  const map = useMap();

  useEffect(() => {
    if (pickup && destination) {
      const bounds = L.latLngBounds([
        [pickup.latitude, pickup.longitude],
        [destination.latitude, destination.longitude]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (pickup) {
      map.setView([pickup.latitude, pickup.longitude], 15);
    } else if (destination) {
      map.setView([destination.latitude, destination.longitude], 15);
    }
  }, [pickup, destination, routeCoords, map]);

  return null;
}

// Map click handler for manual pin placement
function MapClickHandler({ onMapClick, pinMode }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick && pinMode) {
        onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function MapView({ pickup, destination, onRouteCalculated, onMapClick, pinMode }) {
  const [routePolyline, setRoutePolyline] = useState([]);
  const defaultCenter = [17.3850, 78.4867]; // Default Hyderabad center

  useEffect(() => {
    if (pickup && destination) {
      fetchOSRMRoute(pickup, destination);
    } else {
      setRoutePolyline([]);
    }
  }, [pickup, destination]);

  const fetchOSRMRoute = async (start, end) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          setRoutePolyline(coords);

          // Pass unrounded exact distance in km (3 decimal places precision)
          const exactDistanceKm = parseFloat((route.distance / 1000).toFixed(3));
          const durationMins = Math.max(1, Math.round(route.duration / 60));

          if (onRouteCalculated) {
            onRouteCalculated(exactDistanceKm, durationMins, null);
          }
          return;
        }
      }
      // If OSRM returns no route
      setRoutePolyline([]);
      if (onRouteCalculated) {
        onRouteCalculated(null, null, "Unable to calculate a driving road route between the selected locations.");
      }
    } catch (err) {
      console.error('OSRM route calculation error:', err);
      setRoutePolyline([]);
      if (onRouteCalculated) {
        onRouteCalculated(null, null, "Routing service timeout or network error while calculating road route.");
      }
    }
  };

  const center = pickup
    ? [pickup.latitude, pickup.longitude]
    : destination
    ? [destination.latitude, destination.longitude]
    : defaultCenter;

  return (
    <div className="map-wrapper" style={{ position: 'relative' }}>
      {pinMode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 800,
          background: 'rgba(245, 158, 11, 0.95)',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 700,
          padding: '6px 14px',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          📍 Click anywhere on the map to drop a pin
        </div>
      )}
      <MapContainer center={center} zoom={12} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={onMapClick} pinMode={pinMode} />

        {pickup && (
          <Marker position={[pickup.latitude, pickup.longitude]} icon={pickupIcon}>
            <Popup>
              <div style={{ color: '#111827', fontWeight: 600 }}>Pickup: {pickup.name}</div>
            </Popup>
          </Marker>
        )}

        {destination && (
          <Marker position={[destination.latitude, destination.longitude]} icon={destIcon}>
            <Popup>
              <div style={{ color: '#111827', fontWeight: 600 }}>Destination: {destination.name}</div>
            </Popup>
          </Marker>
        )}

        {routePolyline.length > 0 && (
          <Polyline positions={routePolyline} color="#10b981" weight={5} opacity={0.8} />
        )}

        <FitBoundsController pickup={pickup} destination={destination} routeCoords={routePolyline} />
      </MapContainer>
    </div>
  );
}
