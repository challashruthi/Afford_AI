import React from 'react';
import { Bike, Car } from 'lucide-react';

/**
 * Auto-Rickshaw / Three-Wheeler SVG Icon
 */
export function AutoIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Chassis base */}
      <path d="M3 17h18" />
      {/* Front & Rear Wheels */}
      <circle cx="6.5" cy="17.5" r="2" />
      <circle cx="17.5" cy="17.5" r="2" />
      {/* Auto Rickshaw Roof & Cabin */}
      <path d="M4 15.5V10c0-1.1.9-2 2-2h7l4.5 4v3.5" />
      {/* Windshield line */}
      <path d="M13 8l3.5 3.5" />
      {/* Side partition / driver cabin divider */}
      <path d="M9 8v7.5" />
      <path d="M9 12h4" />
    </svg>
  );
}

/**
 * Centralized RideIcon component
 * Returns proper vehicle icon based on rideType (not provider):
 * - AUTO -> Auto-Rickshaw / Three-Wheeler Icon
 * - BIKE / MOTO / PINK_BIKE -> Bike Icon
 * - CAB / GO / MINI -> Car Icon
 */
export default function RideIcon({ rideType, size = 22, color = 'currentColor' }) {
  if (!rideType) return <Car size={size} color={color} />;
  const t = rideType.toLowerCase();

  if (t.includes('auto')) {
    return <AutoIcon size={size} color={color} />;
  }
  if (t.includes('bike') || t.includes('moto')) {
    return <Bike size={size} color={color} />;
  }
  return <Car size={size} color={color} />;
}
