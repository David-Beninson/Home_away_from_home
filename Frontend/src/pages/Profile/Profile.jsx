import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { authApi } from '../../api/api';
import { fetchCurrentUser, logout } from '../../store/authSlice';
import { LogOutIcon, SettingsIcon } from '../../components/Common/Icons';
import { getUserInitials } from '../../utils/user';
import { getProfileFieldDefinitions, formatFieldValue } from './profileFieldsConfig';
import { useTranslation } from 'react-i18next';
import './Profile.css';

export default function ProfilePage() {
  const { t } = useTranslation(['profile/profile']);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);

  const [profileData, setProfileData] = useState({});
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Controls View vs Edit modes
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user?.profile) {
      setProfileData({ ...user.profile });
    }
  }, [user]);

  // Dynamically compute all profile fields (preset + any extra backend fields)
  const fieldDefinitions = useMemo(() => {
    if (!user) return {};
    return getProfileFieldDefinitions(user.user_type, profileData);
  }, [user, profileData]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    let finalVal = value;
    if (type === 'checkbox') {
      finalVal = checked;
    } else if (type === 'number') {
      finalVal = value === '' ? '' : Number(value);
    }

    setProfileData((prev) => ({
      ...prev,
      [id]: finalVal
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    // Clean internal/system attributes before sending to endpoint
    const cleanedPayload = { ...profileData };
    const SYSTEM_KEYS = ['id', 'user_id', 'created_at', 'updated_at', 'atmosphere_vector', 'preference_vector', '_sa_instance_state'];
    SYSTEM_KEYS.forEach((key) => delete cleanedPayload[key]);

    if (cleanedPayload.release_date === '') {
      cleanedPayload.release_date = null;
    }

    try {
      if (user.user_type === 'host') {
        await authApi.updateHostProfile(cleanedPayload);
      } else {
        await authApi.updateGuestProfile(cleanedPayload);
      }

      // Refresh the current user profile in Redux store
      await dispatch(fetchCurrentUser()).unwrap();

      setMessage({ type: 'success', text: t('profile/profile:messages.success') });
      setIsEditing(false); // Switch back to read-only view on success
    } catch (err) {
      console.error('Failed to update profile:', err);
      const detail = err.response?.data?.detail;
      const errorText = Array.isArray(detail)
        ? detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
        : (detail || t('profile/profile:messages.error_default'));
      setMessage({ type: 'error', text: t('profile/profile:messages.error_prefix', { error: errorText }) });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (loading && !user) {
    return (
      <div className="profile-container">
        <div className="loading-screen">{t('profile/profile:loading')}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userInitial = getUserInitials(user);
  const locationSubtext =
    user.user_type === 'guest'
      ? profileData.unit_name || profileData.guest_address || t('profile/profile:location_unspecified_guest')
      : profileData.residential_address || t('profile/profile:location_unspecified_host');

  const getFieldLabel = (key, fallbackLabel) => {
    return t(`profile/profile:fields.${key}`, fallbackLabel);
  };

  return (
    <div className="profile-container" dir="rtl">
      <div className="profile-card">
        {!isEditing ? (
          /* ================= VIEW MODE ================= */
          <>
            <h1 className="page-title">{t('profile/profile:title')}</h1>

            <div className="profile-hero">
              <div className="hero-top">
                <div className="hero-avatar">{userInitial}</div>
                <div className="hero-info">
                  <h3>{user.full_name}</h3>
                  <p>{locationSubtext}</p>
                </div>
                <div className="hero-role">
                  {user.user_type === 'host' ? t('profile/profile:role_host') : t('profile/profile:role_guest')}
                </div>
              </div>

              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-value">0</span>
                  <span className="stat-label">{t('profile/profile:stats.hostings')}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">0</span>
                  <span className="stat-label">{t('profile/profile:stats.hosts')}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">0</span>
                  <span className="stat-label">{t('profile/profile:stats.nights')}</span>
                </div>
              </div>
            </div>

            <div className="details-card">


              {/* Base User Account Info */}
              <div className="detail-row">
                <span className="detail-label">{t('profile/profile:fields.email')}</span>
                <span className="detail-value">{user.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t('profile/profile:fields.phone')}</span>
                <span className="detail-value" dir="ltr">{user.phone_number}</span>
              </div>

              {/* Dynamically Rendered Profile Fields */}
              {Object.entries(fieldDefinitions).map(([key, fieldDef]) => {
                const rawValue = profileData[key];
                const formattedVal = formatFieldValue(rawValue, fieldDef);

                return (
                  <div className="detail-row" key={key}>
                    <span className="detail-label">
                      {fieldDef.icon && <span className="field-icon-space">{fieldDef.icon}</span>}
                      {getFieldLabel(key, fieldDef.label)}
                    </span>
                    <span className="detail-value">{formattedVal}</span>
                  </div>
                );
              })}
            </div>

            <div className="profile-footer-actions">
              <button className="btn-outline btn-logout" onClick={handleLogout}>
                <LogOutIcon />
                {t('profile/profile:buttons.logout')}
              </button>
              <button className="btn-outline" onClick={() => setIsEditing(true)}>
                <SettingsIcon />
                {t('profile/profile:buttons.edit_profile')}
              </button>
            </div>
          </>
        ) : (
          /* ================= EDIT MODE ================= */
          <>
            <div className="profile-header">
              <h2>{t('profile/profile:edit.title')}</h2>
              <p>{t('profile/profile:edit.subtitle')}</p>
            </div>

            {message.text && (
              <div
                className={`login-error ${message.type === 'success' ? 'profile-msg-success' : ''}`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="profile-form-grid">
                {Object.entries(fieldDefinitions).map(([key, fieldDef]) => {
                  const val = profileData[key] ?? '';
                  const isFullWidth = fieldDef.fullWidth || fieldDef.type === 'textarea';

                  return (
                    <div
                      key={key}
                      className={`form-group ${isFullWidth ? 'full-width' : ''} ${fieldDef.type === 'boolean' ? 'checkbox-group' : ''}`}
                    >
                      <label htmlFor={key}>
  {fieldDef.icon && <span className="field-icon-space">{fieldDef.icon}</span>}
  {getFieldLabel(key, fieldDef.label)}
                      </label >

  {
    fieldDef.type === 'textarea' ? (
      <textarea
        id={key}
        rows={fieldDef.rows || 3}
        placeholder={fieldDef.placeholder || ''}
        value={val}
        onChange={handleChange}
        required={fieldDef.required}
      />
    ) : fieldDef.type === 'select' ? (
      <select id={key} value={val} onChange={handleChange} required={fieldDef.required}>
        {fieldDef.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : fieldDef.type === 'boolean' ? (
      <div className="toggle-switch-container">
        <input
          type="checkbox"
          id={key}
          checked={Boolean(profileData[key])}
          onChange={handleChange}
        />
        <span className="checkbox-text">{profileData[key] ? t('profile/profile:edit.yes') : t('profile/profile:edit.no')}</span>
      </div>
    ) : (
      <input
        type={fieldDef.type || 'text'}
        id={key}
        min={fieldDef.min}
        placeholder={fieldDef.placeholder || ''}
        value={val}
        onChange={handleChange}
        required={fieldDef.required}
      />
    )
  }
                    </div >
                  );
})}
              </div >

  <div className="profile-actions">
    <button
      type="button"
      className="btn-outline btn-cancel-profile"
      onClick={() => setIsEditing(false)}
    >
      {t('profile/profile:buttons.cancel')}
    </button>
    <button type="submit" className="save-btn" disabled={saving}>
      {saving ? t('profile/profile:buttons.saving') : t('profile/profile:buttons.save')}
    </button>
  </div>
            </form >
          </>
        )}
      </div >
    </div >
  );
}