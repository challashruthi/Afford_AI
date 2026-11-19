import React from 'react';
import { Navigation, AlertTriangle, Users, Heart } from 'lucide-react';
import RideIcon from './RideIcon';
import FareBreakdown from './FareBreakdown';

export default function RideCard({
  option,
  isRecommended = false,
  categoryComparison = null,
  cheapestFare = null,
  cheapestProviderName = '',
  highestFare = null,
  highestProviderName = '',
}) {
  const isPinkBike = option.providerName?.toLowerCase().includes('pink') || option.rideType?.toLowerCase().includes('women');

  const getProviderLogo = (provider) => {
    switch (provider.toLowerCase()) {
      case 'uber':
        return { bg: '#000000', border: '#333333', color: '#ffffff' };
      case 'ola':
        return { bg: '#2b2b2b', border: '#84cc16', color: '#84cc16' };
      case 'rapido':
        return { bg: '#facc15', border: '#eab308', color: '#000000' };
      case 'pink bike':
      case 'pinkbike':
        return { bg: '#db2777', border: '#f43f5e', color: '#ffffff' };
      default:
        return { bg: '#374151', border: '#4b5563', color: '#ffffff' };
    }
  };

  const badgeStyle = getProviderLogo(option.providerName);

  const getCapacity = (type, capacityProp) => {
    if (capacityProp) return capacityProp;
    if (type.toLowerCase().includes('bike') || type.toLowerCase().includes('moto') || type.toLowerCase().includes('women')) return 1;
    if (type.toLowerCase().includes('auto')) return 3;
    return 4;
  };

  const passengerCapacity = getCapacity(option.rideType, option.capacity);
  const isAvailable = option.available ?? true;

  // Standard predicted fare
  const currentFare = option.estimatedFare != null
    ? option.estimatedFare
    : (option.comparableFare != null ? option.comparableFare : 0);

  // Category-specific comparison evaluation
  const hasCategoryComp = categoryComparison && categoryComparison.hasComparison;
  const isCheapestInCat = isAvailable && hasCategoryComp && Math.round(currentFare) === categoryComparison.cheapestFare;
  const diffFromCheapestInCat = isAvailable && hasCategoryComp ? Math.max(0, Math.round(currentFare) - categoryComparison.cheapestFare) : 0;
  const catSavings = hasCategoryComp ? categoryComparison.potentialSavings : 0;

  // Legacy fallback if categoryComparison not provided
  const isCheapest = isAvailable && cheapestFare !== null && Math.round(currentFare) === Math.round(cheapestFare);
  const fareDiff = (isAvailable && cheapestFare !== null) ? Math.round(currentFare - cheapestFare) : 0;
  const maxSavings = (isCheapest && highestFare !== null) ? Math.round(highestFare - cheapestFare) : 0;

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        border: isRecommended ? '2px solid var(--accent-green)' : (isPinkBike ? '1px solid #f43f5e' : '1px solid var(--border-color)'),
        boxShadow: isRecommended ? '0 0 20px rgba(16, 185, 129, 0.25)' : 'none',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
        borderRadius: 'var(--radius-lg)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {isRecommended && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          fontSize: '10px',
          fontWeight: 800,
          padding: '4px 12px',
          borderBottomLeftRadius: '8px',
          letterSpacing: '0.5px'
        }}>
          BEST PRICE AI RECOMMENDATION
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0, marginRight: '16px' }}>
        <div style={{ 
          width: '52px', 
          height: '52px', 
          borderRadius: '14px', 
          background: badgeStyle.bg, 
          border: `1px solid ${badgeStyle.border}`, 
          color: badgeStyle.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '14px',
          flexShrink: 0
        }}>
          <RideIcon rideType={option.rideType} size={24} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {option.providerName} <span style={{ fontWeight: 600, color: isPinkBike ? '#f43f5e' : 'var(--accent-cyan)' }}>{option.rideType}</span>
            </h4>

            {isPinkBike && (
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                background: 'rgba(219, 39, 119, 0.2)',
                border: '1px solid #db2777',
                color: '#f43f5e',
                padding: '2px 8px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Heart size={10} fill="#f43f5e" color="#f43f5e" /> FEMALE CAPTAIN RIDE
              </span>
            )}

            <span style={{ 
              fontSize: '11px', 
              background: 'rgba(255, 255, 255, 0.08)', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Users size={12} /> {passengerCapacity} {passengerCapacity === 1 ? 'passenger' : 'passengers'}
            </span>
          </div>

          {isPinkBike ? (
            <div style={{ fontSize: '12px', color: '#f472b6', fontWeight: 600, marginTop: '3px' }}>
              Bike ride driven by a female captain
            </div>
          ) : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {option.distanceKm != null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Navigation size={14} color="var(--accent-cyan)" /> {Number(option.distanceKm).toFixed(1)} km
              </span>
            )}
            <span style={{ color: option.surgeFactor > 1.0 ? 'var(--accent-yellow)' : 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
              <AlertTriangle size={13} /> {option.surgeFactor}x simulated surge
            </span>
          </div>

          <div style={{ fontSize: '11px', color: 'rgba(156, 163, 175, 0.7)', marginTop: '4px' }}>
            <span>{option.pricingNote || 'Estimated Fare – Demo Mode'}</span>
          </div>

          {/* Ride Category and Cheapest Recommendation Status section */}
          {isAvailable && (categoryComparison !== null ? (
            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {!hasCategoryComp ? (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Not enough providers to compare.
                </span>
              ) : isCheapestInCat ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: 'var(--accent-green)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    letterSpacing: '0.3px',
                  }}>
                    CHEAPEST IN {categoryComparison.categoryName.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600 }}>
                    Lowest estimated fare in this category
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {categoryComparison.categoryName} category option
                </span>
              )}
            </div>
          ) : cheapestFare !== null ? (
            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {isCheapest && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: 'var(--accent-green)',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  CHEAPEST ESTIMATED OPTION
                </span>
              )}
            </div>
          ) : null)}

          {/* Expandable Fare Breakdown */}
          <FareBreakdown option={option} compact={true} />
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: isRecommended ? 'var(--accent-green)' : '#ffffff' }}>
          ₹{Math.round(currentFare)}
        </div>
        <div style={{ fontSize: '12px', color: option.available ? 'var(--accent-green)' : '#ef4444', fontWeight: 600, marginTop: '3px' }}>
          {option.available ? 'Available Now' : 'Busy'}
        </div>
      </div>
    </div>
  );
}
