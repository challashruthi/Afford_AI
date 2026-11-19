import React, { useState, useEffect, useCallback } from 'react';
import { 
  Star, MapPin, Plus, Pencil, Trash2, Home, Briefcase, 
  GraduationCap, Building2, Check, X, Loader2, Navigation, AlertCircle, ArrowRight
} from 'lucide-react';
import { favouriteService } from '../services/api';
import LocationAutocomplete from './LocationAutocomplete';

// Pre-set location tag suggestions
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

export default function FavouriteLocationsSection({
  onSelectAsPickup,
  onSelectAsDestination,
  currentPickup,
  currentDestination
}) {
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
    try {
      const res = await favouriteService.getFavourites();
      if (Array.isArray(res.data)) {
        setFavourites(res.data);
      } else {
        setFavourites([]);
      }
    } catch (err) {
      console.error('Could not fetch favourites from backend:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to load favourite locations from server.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <section 
      id="favourite-locations" 
      className="glass-panel" 
      style={{ padding: '24px', marginBottom: '24px', position: 'relative' }}
    >
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '24px',
          background: 'rgba(16, 185, 129, 0.95)',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          zIndex: 10
        }}>
          <Check size={16} /> {actionSuccessMsg}
        </div>
      )}

      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Star size={18} color="var(--accent-green)" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Favourite Locations
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Save frequently visited destinations like Home, College, or Office for 1-click ride comparison.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => openAddModal()}
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          id="add-favourite-btn"
        >
          <Plus size={16} /> Add Location
        </button>
      </div>

      {/* Quick Preset Prompts if list is empty or small */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Quick Add:
        </span>
        {PRESET_TAGS.map(({ label, icon: Icon, color }) => (
          <button
            key={label}
            onClick={() => openAddModal(label)}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '4px 12px',
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
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
          >
            <Icon size={13} color={color} /> + {label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Loader2 size={20} className="animate-spin" color="var(--accent-green)" />
          <span>Loading saved favourites...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={fetchFavourites} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && favourites.length === 0 && (
        <div style={{
          padding: '36px 20px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          border: '1px dashed rgba(255, 255, 255, 0.12)'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
            <MapPin size={22} color="var(--accent-green)" />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0' }}>
            No Favourite Locations Saved Yet
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px auto' }}>
            Add places you travel to regularly (like Home, College, or Hostel). You'll be able to set them as your pickup or destination in a single click!
          </p>
          <button
            onClick={() => openAddModal('Home')}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            <Plus size={15} /> Add Home Location
          </button>
        </div>
      )}

      {/* Favourites Grid */}
      {!loading && favourites.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '14px'
        }}>
          {favourites.map((item) => {
            const { Icon, color } = getIconForName(item.name);
            const isPickup = currentPickup?.name === item.address || currentPickup?.name === item.name;
            const isDest = currentDestination?.name === item.address || currentDestination?.name === item.name;

            return (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: isPickup || isDest ? '1.5px solid var(--accent-green)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Top card header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: `${color}20`, border: `1px solid ${color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon size={16} color={color} />
                      </div>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                        {item.name}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => openEditModal(item)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        title="Edit Favourite"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteFavourite(item.id, item.name)}
                        disabled={deletingId === item.id}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Delete Favourite"
                      >
                        {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Address */}
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }} title={item.address}>
                    {item.address}
                  </p>

                  {/* Coordinates pill */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <span style={{
                      fontSize: '10px',
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

                {/* Selection Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <button
                    onClick={() => {
                      if (onSelectAsPickup) {
                        onSelectAsPickup({
                          name: `${item.name} (${item.address})`,
                          latitude: item.latitude,
                          longitude: item.longitude
                        });
                        showToast(`Set "${item.name}" as Pickup`);
                      }
                    }}
                    style={{
                      background: isPickup ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: isPickup ? '1px solid var(--accent-green)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isPickup ? 'var(--accent-green)' : '#cbd5e1',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Navigation size={12} color="var(--accent-green)" />
                    {isPickup ? 'Pickup Active' : 'Use as Pickup'}
                  </button>

                  <button
                    onClick={() => {
                      if (onSelectAsDestination) {
                        onSelectAsDestination({
                          name: `${item.name} (${item.address})`,
                          latitude: item.latitude,
                          longitude: item.longitude
                        });
                        showToast(`Set "${item.name}" as Destination`);
                      }
                    }}
                    style={{
                      background: isDest ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: isDest ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isDest ? 'var(--accent-cyan)' : '#cbd5e1',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ArrowRight size={12} color="var(--accent-cyan)" />
                    {isDest ? 'Dest Active' : 'Use as Dest'}
                  </button>
                </div>
              </div>
            );
          })}
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
                  {editingItem ? 'Edit Favourite Location' : 'Save Favourite Location'}
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
                  Location Label (e.g. Home, College, Hostel, Office)
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
    </section>
  );
}
