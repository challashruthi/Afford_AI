import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';

// Exact rates from backend providers (UberProvider, OlaProvider, RapidoProvider, PinkBikeProvider)
const PROVIDER_RATES = {
  uber: {
    moto: { base: 30.0, perKm: 8.0, min: 35.0 },
    bike: { base: 30.0, perKm: 8.0, min: 35.0 },
    auto: { base: 45.0, perKm: 11.5, min: 55.0 },
    go:   { base: 65.0, perKm: 15.0, min: 90.0 },
    cab:  { base: 65.0, perKm: 15.0, min: 90.0 },
  },
  ola: {
    bike: { base: 25.0, perKm: 7.5, min: 32.0 },
    auto: { base: 40.0, perKm: 11.0, min: 50.0 },
    mini: { base: 60.0, perKm: 14.0, min: 85.0 },
    cab:  { base: 60.0, perKm: 14.0, min: 85.0 },
  },
  rapido: {
    bike: { base: 20.0, perKm: 7.0, min: 28.0 },
    auto: { base: 35.0, perKm: 10.0, min: 45.0 },
    'cab economy': { base: 50.0, perKm: 13.0, min: 75.0 },
    cab:  { base: 50.0, perKm: 13.0, min: 75.0 },
  },
  'pink bike': {
    bike: { base: 22.0, perKm: 7.2, min: 30.0 },
    'bike (women)': { base: 22.0, perKm: 7.2, min: 30.0 },
    'women captain': { base: 22.0, perKm: 7.2, min: 30.0 },
  },
};

export function getFareBreakdown(option, routeDistanceKm) {
  const pName = (option?.providerName || '').toLowerCase().trim();
  const rType = (option?.rideType || '').toLowerCase().trim();

  let pRates = PROVIDER_RATES[pName];
  if (!pRates) {
    if (pName.includes('uber')) pRates = PROVIDER_RATES.uber;
    else if (pName.includes('ola')) pRates = PROVIDER_RATES.ola;
    else if (pName.includes('rapido')) pRates = PROVIDER_RATES.rapido;
    else if (pName.includes('pink')) pRates = PROVIDER_RATES['pink bike'];
    else pRates = PROVIDER_RATES.uber;
  }

  let rate = pRates[rType];
  if (!rate) {
    if (rType.includes('bike') || rType.includes('moto')) {
      rate = pRates.bike || pRates.moto || { base: 25.0, perKm: 7.5, min: 30.0 };
    } else if (rType.includes('auto')) {
      rate = pRates.auto || { base: 40.0, perKm: 11.0, min: 50.0 };
    } else {
      rate = pRates.go || pRates.mini || pRates['cab economy'] || pRates.cab || { base: 60.0, perKm: 14.0, min: 85.0 };
    }
  }

  const dist = Number(option?.distanceKm ?? routeDistanceKm ?? 5.0);
  const surge = Number(option?.surgeFactor ?? 1.0);
  const finalFare = Math.round(option?.estimatedFare ?? (option?.comparableFare ?? 50));

  const baseFare = rate.base;
  const distanceCharge = Math.round(dist * rate.perKm);
  const subtotal = baseFare + distanceCharge;

  const surgeAdjustment = surge > 1.0 ? Math.round(subtotal * (surge - 1.0)) : 0;
  const afterSurge = subtotal + surgeAdjustment;

  let minFareAdjustment = 0;
  if (rate.min > afterSurge) {
    minFareAdjustment = rate.min - afterSurge;
  }

  // Calibration adjustment to guarantee exact sum equals final estimated fare
  const sumBeforeCalibration = baseFare + distanceCharge + surgeAdjustment + minFareAdjustment;
  const calibrationAdjustment = finalFare - sumBeforeCalibration;

  return {
    baseFare,
    distanceKm: dist,
    perKmRate: rate.perKm,
    distanceCharge,
    surgeFactor: surge,
    surgeAdjustment,
    minFareThreshold: rate.min,
    minFareAdjustment,
    calibrationAdjustment,
    finalEstimatedFare: finalFare,
  };
}

export default function FareBreakdown({ option, routeDistanceKm, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const breakdown = getFareBreakdown(option, routeDistanceKm);

  return (
    <div style={{ marginTop: '8px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: isOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          border: '1px solid ' + (isOpen ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.1)'),
          borderRadius: '6px',
          padding: compact ? '2px 8px' : '4px 10px',
          color: isOpen ? 'var(--accent-green)' : 'var(--text-muted)',
          fontSize: compact ? '11px' : '12px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'all 0.15s ease',
        }}
        title="View detailed fare breakdown"
      >
        <Calculator size={compact ? 12 : 13} />
        <span>Fare Breakdown</span>
        {isOpen ? <ChevronUp size={compact ? 12 : 13} /> : <ChevronDown size={compact ? 12 : 13} />}
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: '8px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '12px',
            color: '#e2e8f0',
            maxWidth: '340px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--accent-green)', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {option.providerName} {option.rideType} Fare Structure
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {/* Base Fare */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8' }}>Base Fare</span>
              <span style={{ fontWeight: 600 }}>₹{breakdown.baseFare.toFixed(0)}</span>
            </div>

            {/* Distance Charge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8' }}>
                Distance Charge ({breakdown.distanceKm.toFixed(1)} km × ₹{breakdown.perKmRate}/km)
              </span>
              <span style={{ fontWeight: 600 }}>₹{breakdown.distanceCharge}</span>
            </div>

            {/* Surge / Demand Adjustment */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: breakdown.surgeAdjustment > 0 ? 'var(--accent-yellow)' : '#94a3b8' }}>
                Surge Adjustment ({breakdown.surgeFactor}x)
              </span>
              <span style={{ fontWeight: 600, color: breakdown.surgeAdjustment > 0 ? 'var(--accent-yellow)' : '#94a3b8' }}>
                {breakdown.surgeAdjustment > 0 ? `+₹${breakdown.surgeAdjustment}` : '₹0 (Normal)'}
              </span>
            </div>

            {/* Minimum Fare Adjustment (if applicable) */}
            {breakdown.minFareAdjustment > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-cyan)' }}>
                  Min Fare Adjustment (Threshold ₹{breakdown.minFareThreshold})
                </span>
                <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                  +₹{breakdown.minFareAdjustment}
                </span>
              </div>
            )}

            {/* Calibration Adjustment (if non-zero) */}
            {breakdown.calibrationAdjustment !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8' }}>ML Calibration Adjustment</span>
                <span style={{ fontWeight: 600, color: breakdown.calibrationAdjustment > 0 ? '#94a3b8' : 'var(--accent-green)' }}>
                  {breakdown.calibrationAdjustment > 0 ? `+₹${breakdown.calibrationAdjustment}` : `-₹${Math.abs(breakdown.calibrationAdjustment)}`}
                </span>
              </div>
            )}

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', margin: '6px 0 4px 0' }} />

            {/* Final Estimated Fare */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ fontWeight: 700, color: '#ffffff' }}>Final Estimated Fare</span>
              <span style={{ fontWeight: 800, color: 'var(--accent-green)', fontSize: '15px' }}>
                ₹{breakdown.finalEstimatedFare}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
