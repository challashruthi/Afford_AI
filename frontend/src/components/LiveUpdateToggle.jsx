import React from 'react';
import { Wifi, WifiOff, RefreshCw, Clock, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * wsStatus: 'connected' | 'reconnecting' | 'unavailable' | 'disconnected'
 */
export default function LiveUpdateToggle({ wsStatus, lastUpdateMsg, demandInfo, onConnectToggle }) {
  const isConnected = wsStatus === 'connected';
  const isReconnecting = wsStatus === 'reconnecting';
  const isUnavailable = wsStatus === 'unavailable';

  const getDemandBadge = () => {
    if (!demandInfo || !demandInfo.level) {
      return { text: '🟢 Off-Peak • 1.0x', color: 'var(--accent-green)' };
    }
    switch (demandInfo.level) {
      case 'HIGH_DEMAND':
        return { text: `🔴 ${demandInfo.status} • ${demandInfo.baseSurge}x`, color: '#ef4444' };
      case 'PEAK_TIME':
        return { text: `🟠 ${demandInfo.status} • ${demandInfo.baseSurge}x`, color: 'var(--accent-yellow)' };
      default:
        return { text: `🟢 ${demandInfo.status} • ${demandInfo.baseSurge}x`, color: 'var(--accent-green)' };
    }
  };

  const badge = getDemandBadge();

  const getStatusIndicator = () => {
    if (isConnected) {
      return {
        dot: 'var(--accent-green)',
        dotGlow: '0 0 8px var(--accent-green)',
        icon: <Wifi size={15} color="var(--accent-green)" />,
        label: '● Live updates connected',
        color: 'var(--accent-green)',
      };
    }
    if (isReconnecting) {
      return {
        dot: '#f59e0b',
        dotGlow: 'none',
        icon: <Loader2 size={15} color="#f59e0b" className="animate-spin" />,
        label: '○ Reconnecting…',
        color: '#f59e0b',
      };
    }
    if (isUnavailable) {
      return {
        dot: '#6b7280',
        dotGlow: 'none',
        icon: <AlertTriangle size={15} color="#6b7280" />,
        label: '⚠ Realtime unavailable — showing latest prediction',
        color: '#6b7280',
      };
    }
    // disconnected / default
    return {
      dot: '#374151',
      dotGlow: 'none',
      icon: <WifiOff size={15} color="#6b7280" />,
      label: 'Live updates off',
      color: '#6b7280',
    };
  };

  const status = getStatusIndicator();

  return (
    <div
      className="glass-panel"
      style={{
        padding: '13px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        background: 'rgba(17,24,39,0.85)',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* WS status pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{
            width: '9px', height: '9px', borderRadius: '50%',
            background: status.dot,
            boxShadow: status.dotGlow,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: status.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
            {status.icon}
            {status.label}
          </span>
        </div>

        {/* Demand / Surge badge */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 700,
          color: badge.color,
          border: `1px solid ${badge.color}40`,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Clock size={13} color={badge.color} />
          <span>Simulated Surge: {badge.text}</span>
        </div>

        {lastUpdateMsg && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lastUpdateMsg}
          </span>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onConnectToggle}
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          padding: '5px 13px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}
      >
        <RefreshCw size={11} />
        {isConnected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
