import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            margin: '20px 0',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.08)',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
            <AlertCircle size={22} color="#ef4444" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {this.props.title || 'Component Preview Temporarily Unavailable'}
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', maxWidth: '500px', margin: '0 auto 16px auto' }}>
            {this.props.message || 'An unexpected issue occurred while rendering this module. Other platform features and comparison data remain operational.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="btn-secondary"
            style={{ padding: '6px 16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} /> Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
