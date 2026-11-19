import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, MapPin, Plus, Pencil, Trash2, Home, Briefcase, 
  GraduationCap, Building2, Check, X, Loader2, Navigation, AlertCircle, ArrowRight, ArrowLeft
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LocationAutocomplete from '../components/LocationAutocomplete';
import { favouriteService } from '../services/api';

const PRESET_TAGS = [
  { label: 'Home', icon: Home, color: '#10b981' },
  { label: 'College', icon: GraduationCap, color: '#06b6d4' },
  { label: 'Hostel', icon: Building2, color: '#f59e0b' },
  { label: 'Office', icon: Briefcase, color: '#8b5cf6' },
];

function getIconForName(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('home')) return { Icon: Home, color: '#10b981' };
  if (lower.includes('college') || lower.includes('campus') || lower.includes('univ')) return { Icon: GraduationCap, color: '#06b6d4' };
  if (lower.includes('hostel') || lower.includes('dorm')) return { Icon: Building2, color: '#f59e0b' };
  if (lower.includes('office') || lower.includes('work')) return { Icon: Briefcase, color: '#8b5cf6' };
  return { Icon: Star, color: '#34d399' };
}

export default function FavouritesPage() {
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null if adding new
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 17.9836,
    longitude: 79.5312
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState(null);

  const fetchFavourites = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('jwt_token');
    if (!token || token === 'null' || token === 'undefined' || !token.trim()) {
      setError('You are not logged in or your session has expired. Please log in to view and manage your saved favourite locations.');
      setLoading(false);
      // Redirect to login after short delay
      setTimeout(() => navigate('/login'), 1800);
      return;
    }
    try {
      const res = await favouriteService.getFavourites();
      if (Array.isArray(res.data)) {
        setFavourites(res.data);
      } else {
        setFavourites([]);
      }
    } catch (err) {
      console.error('Could not fetch favourites from backend:', err);
      const status = err.response?.status;
      // 401/403 are handled globally by api.js interceptor (event dispatch + token clear)
      // but we still display the error message here
      const msg = err.response?.data?.message || err.message || 'Unable to load favourite locations from server.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // ── Redirect to login on 401/403 session expiry event from api.js interceptor ──
  useEffect(() => {
    const handleSessionExpired = (e) => {
      const msg = e?.detail?.message || 'Your session has expired. Please log in again.';
      setError(msg);
      setLoading(false);
      // Auto-redirect after a short delay so the user sees the message
      setTimeout(() => navigate('/login'), 1800);
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [navigate]);

  useEffect(() => {
    fetchFavourites();
  }, [fetchFavourites]);

  const showToast = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 3500);
  };

  const openAddModal = (presetName = '') => {
    setEditingItem(null);
    setFormData({
      name: presetName,
      address: '',
      latitude: 17.9836,
      longitude: 79.5312
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      address: item.address || '',
      latitude: item.latitude != null ? item.latitude : 17.9836,
      longitude: item.longitude != null ? item.longitude : 79.5312
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveFavourite = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please enter a location label (e.g. Home, College, Office).');
      return;
    }
    if (!formData.address.trim()) {
      setFormError('Please select or enter an address.');
      return;
    }
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setFormError('Please provide valid latitude and longitude coordinates.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      latitude: lat,
      longitude: lng
    };

    try {
      if (editingItem && editingItem.id) {
        // Update existing favourite in MySQL database
        const res = await favouriteService.updateFavourite(editingItem.id, payload);
        const updated = res.data;
        setFavourites((prev) => prev.map((fav) => (fav.id === editingItem.id ? updated : fav)));
        showToast(`Updated "${payload.name}" successfully!`);
      } else {
        // Save new favourite in MySQL database
        const res = await favouriteService.addFavourite(payload);
        const created = res.data;
        setFavourites((prev) => [created, ...prev]);
        showToast(`Saved "${payload.name}" to your favourites!`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save favourite error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save favourite location. Please ensure you are logged in and try again.';
      setFormError(errMsg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteFavourite = async (id, name) => {
    setDeletingId(id);
    try {
      await favouriteService.deleteFavourite(id);
      setFavourites((prev) => prev.filter((item) => item.id !== id));
      showToast(`Removed "${name}" from favourites.`);
    } catch (err) {
      console.error('Delete favourite error:', err);
      const errMsg = err.response?.data?.message || err.message || `Failed to delete "${name}".`;
      showToast(errMsg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectForComparison = (fav, isPickup) => {
    // Navigate to Dashboard and pre-populate the correct field via router state
    if (isPickup) {
      navigate('/dashboard', {
        state: { pendingPickup: { name: fav.name, latitude: fav.latitude, longitude: fav.longitude } }
      });
    } else {
      navigate('/dashboard', {
        state: { pendingDestination: { name: fav.name, latitude: fav.latitude, longitude: fav.longitude } }
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0f1d' }}>
      <Navbar />

      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          background: 'rgba(16, 185, 129, 0.95)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.4)',
          zIndex: 9999,
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <Check size={16} /> {actionSuccessMsg}
        </div>
      )}

      <main style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', padding: '40px 20px', flex: 1 }}>
        
        {/* Navigation Breadcrumb / Back button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0
            }}
          >
            <ArrowLeft size={15} /> Back to Dashboard
          </button>
        </div>

        {/* Header Banner */}
        <div className="glass-panel" style={{ padding: '28px 32px', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle glow */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Star size={26} color="var(--accent-green)" />
              </div>
              <div>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                  Favourite Locations
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '600px' }}>
                  Save frequently visited destinations like Home, College, or Office to compare rides in a single click.
                </p>
              </div>
            </div>

            <button
              onClick={() => openAddModal()}
              className="btn-primary"
              id="favourites-add-btn"
              style={{ padding: '12px 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={18} /> Add Favourite Location
            </button>
          </div>

          {/* Quick preset suggestions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '24px', paddingTop: '18px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Quick Add Presets:
            </span>
            {PRESET_TAGS.map(({ label, icon: Icon, color }) => (
              <button
                key={label}
                onClick={() => openAddModal(label)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '20px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                <Icon size={14} color={color} /> + {label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="glass-panel" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <Loader2 size={28} className="animate-spin" color="var(--accent-green)" />
            <span style={{ fontSize: '14px' }}>Loading your saved favourite locations from database...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div style={{
            padding: '18px 24px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            color: '#fca5a5',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 600 }}>{error}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(error.toLowerCase().includes('log in') || error.toLowerCase().includes('session') || error.toLowerCase().includes('authenticat') || error.toLowerCase().includes('401') || error.toLowerCase().includes('403')) && (
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  Log In
                </button>
              )}
              <button
                onClick={fetchFavourites}
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && favourites.length === 0 && (
          <div className="glass-panel" style={{
            padding: '50px 24px',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1.5px dashed rgba(255, 255, 255, 0.15)'
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <MapPin size={28} color="var(--accent-green)" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0' }}>
              No Favourite Locations Saved Yet
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
              Add places you regularly commute between (like Home, College, or Hostel). You'll be able to set them as your pickup or destination for instant multi-provider ride comparisons!
            </p>
            <button
              onClick={() => openAddModal('Home')}
              className="btn-primary"
              style={{ padding: '10px 24px', fontSize: '14px' }}
            >
              <Plus size={16} /> Add First Location (Home)
            </button>
          </div>
        )}

        {/* Favourites Grid */}
        {!loading && favourites.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Saved Places ({favourites.length})
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Click either button to compare rides immediately
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '18px'
            }}>
              {favourites.map((item) => {
                const { Icon, color } = getIconForName(item.name);

                return (
                  <div
                    key={item.id}
                    className="glass-panel"
                    style={{
                      borderRadius: '14px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px',
                      transition: 'transform 0.15s ease, border-color 0.15s ease',
                      border: '1px solid rgba(255, 255, 255, 0.09)'
                    }}
                  >
                    <div>
                      {/* Top card header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '10px',
                            background: `${color}20`, border: `1px solid ${color}45`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Icon size={18} color={color} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                              {item.name}
                            </h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saved Place</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => openEditModal(item)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Edit Favourite"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteFavourite(item.id, item.name)}
                            disabled={deletingId === item.id}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Delete Favourite"
                          >
                            {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Address */}
                      <p style={{
                        fontSize: '13px',
                        color: '#cbd5e1',
                        lineHeight: 1.45,
                        margin: '0 0 10px 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }} title={item.address}>
                        {item.address}
                      </p>

                      {/* Coordinates pill */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--accent-cyan)',
                          background: 'rgba(6, 182, 212, 0.1)',
                          border: '1px solid rgba(6, 182, 212, 0.25)',
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          📍 {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Use as Pickup or Destination in Ride Comparison */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <button
                        onClick={() => handleSelectForComparison(item, true)}
                        className="btn-secondary"
                        style={{
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          borderColor: 'rgba(16, 185, 129, 0.4)'
                        }}
                      >
                        <Navigation size={13} color="var(--accent-green)" />
                        Use as Pickup
                      </button>

                      <button
                        onClick={() => handleSelectForComparison(item, false)}
                        className="btn-secondary"
                        style={{
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          borderColor: 'rgba(6, 182, 212, 0.4)'
                        }}
                      >
                        <ArrowRight size={13} color="var(--accent-cyan)" />
                        Use as Dest
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Modal for Adding / Editing Favourite Location ── */}
        {isModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 15, 29, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div className="glass-panel" style={{
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={20} color="var(--accent-green)" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    {editingItem ? 'Edit Favourite Location' : 'Add Favourite Location'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '10px 14px', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              <form onSubmit={handleSaveFavourite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Location Name / Label (e.g. Home, College, Office, Hostel)
                  </label>
                  <input
                    id="favourite-name-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Home, College, Hostel, Office, Gym"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  {/* Preset quick pills */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    {['Home', 'College', 'Hostel', 'Office'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        id={`preset-pill-${tag.toLowerCase()}`}
                        onClick={() => setFormData({ ...formData, name: tag })}
                        style={{
                          background: formData.name === tag ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: formData.name === tag ? '1px solid var(--accent-green)' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: formData.name === tag ? 'var(--accent-green)' : '#9ca3af',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Search or Enter Full Address
                  </label>
                  <LocationAutocomplete
                    id="favourite-address-autocomplete"
                    label=""
                    placeholder="Search street, college, landmark or city..."
                    initialValue={formData.address}
                    onQueryChange={(text) => {
                      setFormData((prev) => ({ ...prev, address: text }));
                    }}
                    onSelectLocation={(loc) => {
                      setFormData({
                        ...formData,
                        address: loc.name,
                        latitude: loc.latitude,
                        longitude: loc.longitude
                      });
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Latitude
                    </label>
                    <input
                      id="favourite-lat-input"
                      type="number"
                      step="any"
                      className="form-input"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Longitude
                    </label>
                    <input
                      id="favourite-lng-input"
                      type="number"
                      step="any"
                      className="form-input"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button
                    id="favourite-modal-cancel-btn"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '12px' }}
                  >
                    Cancel
                  </button>
                  <button
                    id="favourite-save-submit-btn"
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <><Loader2 size={16} className="animate-spin" /> Saving...</>
                    ) : (
                      editingItem ? 'Update Location' : 'Save Favourite'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
