import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Utensils, Heart, MapPin } from 'lucide-react';
import { fetchCurrentUser, setCurrentUser } from '../../store/authSlice';
import { authApi } from '../../api/api';
import Loading from '../../components/Common/Loading/Loading';
import { useTranslation } from 'react-i18next';
import './ProfileQuestionnaire.css';

export default function ProfileQuestionnaire() {
  const { t } = useTranslation(['profile/profile', 'profile/questionnaire']);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const loadingAuth = useSelector((state) => state.auth.loading);
  const userType = user?.user_type; // wait for real user role instead of defaulting to guest

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Host Fields
    residential_address: '', max_guests: 1, neighborhood_type: '', kashrut_level: 'כשר',
    num_beds: 1, num_bedrooms: 1, pets_description: '', housing_type: '', accessibility_level: '',
    // Guest Fields
    service_type: 'סדיר', unit_description: '', release_date: '', is_anonymous: false,
    giving_to_host: false, food_allergies: '', food_preferences: '', religious_level: '',
    kosher_food: true, gender: '', guest_address: ''
  });

  // Prefill the form with any existing profile values so host can complete/update their profile
  useEffect(() => {
    if (user?.profile) {

      // Only copy keys that exist in formData to avoid adding unknown fields
      // Prefill all available profile values (including residential_address) so the user sees saved data
      const merged = { ...formData };
      Object.keys(merged).forEach((k) => {
        if (user.profile[k] !== undefined && user.profile[k] !== null) merged[k] = user.profile[k];
      });
      setFormData(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // פונקציית ולידציה לחסימת הכפתור: מחזירה אמת אם חסר שדה חובה
  const isFormInvalid = () => {
    if (userType === 'host') {
      return !formData.residential_address.trim(); // חובה כתובת למארח
    }
    if (userType === 'guest') {
      return !formData.guest_address.trim();
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFormInvalid()) {
      setError(t('profile/questionnaire:required_error'));
      return
    };

    setError('');
    setLoading(true);

    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== '' && v !== null)
    );

    // Ensure we persist the questionnaire flag on the backend
    cleanData.questionnaire_answered = true;

    try {
      if (userType === 'host') {
        await authApi.updateHostProfile(cleanData);
      } else {
        await authApi.updateGuestProfile(cleanData);
      }

      // Immediately mark answered locally so the overlay disappears without a page refresh
      const updatedUser = { ...(user || {}), profile: { ...(user?.profile || {}), questionnaire_answered: true } };
      dispatch(setCurrentUser(updatedUser));

      // Also persist local fallback flag
      const userId = user?.id || user?.user_id;
      if (userId) localStorage.setItem(`questionnaire_answered_${userId}`, 'true');

      // Refresh the current user from server to get the persisted flag (in background)
      dispatch(fetchCurrentUser());

      navigate('/', { replace: true });
    } catch (err) {
      console.error("Profile save error:", err);
      const detail = err.response?.data?.detail;
      const formatted = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg || JSON.stringify(d)).join(', ')
          : (detail && typeof detail === 'object' ? JSON.stringify(detail) : t('profile/questionnaire:save_error'));
      setError(formatted);
    } finally {
      setLoading(false);
    }
  };

  const SelectGroup = ({ label, name, options, icon }) => (
    <div className="pq-form-group">
      <label>{icon} {label}</label>
      <select name={name} value={formData[name]} onChange={handleChange}>
        {options.map(opt => typeof opt === 'object'
          ? <option key={opt.val} value={opt.val}>{opt.lbl}</option>
          : <option key={opt} value={opt}>{opt}</option>
        )}
      </select>
    </div>
  );

  const numberOptions = Array.from({ length: 15 }, (_, i) => i + 1);

  // ----------------------------------------
  // HOST QUESTIONNAIRE (שאלון מארח)
  // ----------------------------------------
  const renderHostForm = () => (
    <div className="pq-form-grid">
      <div className="pq-form-group full-width">
        <label><MapPin size={16} /> {t('profile/profile:fields.residential_address')}</label>
        <input
          type="text" name="residential_address" value={formData.residential_address}
          onChange={handleChange} required placeholder="הכנס כתובת מלאה"
        />
      </div>

      <SelectGroup label={`${t('profile/profile:fields.max_guests')} (1-15)`} name="max_guests" options={numberOptions} />

      <SelectGroup label={t('profile/profile:fields.neighborhood_type')} name="neighborhood_type" options={[
        { val: '', lbl: t('profile/questionnaire:select_neighborhood') }, { val: 'חילונית', lbl: t('profile/questionnaire:neighborhood_secular') }, { val: 'דתית', lbl: t('profile/questionnaire:neighborhood_religious') }, { val: 'חרדית', lbl: t('profile/questionnaire:neighborhood_haredi') }
      ]} />

      <SelectGroup label={t('profile/profile:fields.kashrut_level')} name="kashrut_level" icon={<Utensils size={16} />} options={[t('profile/questionnaire:kashrut_none'), t('profile/questionnaire:kashrut_basic'), t('profile/questionnaire:kashrut_kosher'), t('profile/questionnaire:kashrut_mehadrin')]} />
      <SelectGroup label={`${t('profile/profile:fields.num_beds')} (1-15)`} name="num_beds" options={numberOptions} />
      <SelectGroup label={`${t('profile/profile:fields.num_bedrooms')} (1-15)`} name="num_bedrooms" options={numberOptions} />

      <SelectGroup label={t('profile/profile:fields.accessibility_level')} name="accessibility_level" options={[
        { val: '', lbl: t('profile/questionnaire:select_accessibility') }, { val: 'מעלית', lbl: t('profile/questionnaire:accessibility_elevator') }, { val: 'מדרגות', lbl: t('profile/questionnaire:accessibility_stairs') }
      ]} />

      <SelectGroup label={t('profile/profile:fields.housing_type')} name="housing_type" options={[
        { val: '', lbl: t('profile/questionnaire:select_housing') }, { val: 'בניין', lbl: t('profile/questionnaire:housing_building') }, { val: 'בית פרטי', lbl: t('profile/questionnaire:housing_private') }
      ]} />

      <div className="pq-form-group full-width">
        <label>{t('profile/profile:fields.pets_description')}</label>
        <textarea
          name="pets_description" value={formData.pets_description} onChange={handleChange}
          placeholder={t('profile/questionnaire:pets_placeholder')} rows="2"
        />
      </div>
    </div>
  );

  // ----------------------------------------
  // GUEST QUESTIONNAIRE (שאלון אורח)
  // ----------------------------------------
  const renderGuestForm = () => (
    <div className="pq-form-grid">
      <SelectGroup label={t('profile/profile:fields.service_type')} name="service_type" icon={<Shield size={16} />} options={[t('profile/questionnaire:service_regular'), t('profile/questionnaire:service_career'), t('profile/questionnaire:service_reserve'), t('profile/questionnaire:service_national')]} />

      <SelectGroup label={t('profile/profile:fields.gender')} name="gender" options={[
        { val: '', lbl: t('profile/questionnaire:gender_select') }, { val: 'זכר', lbl: t('profile/questionnaire:gender_male') }, { val: 'נקבה', lbl: t('profile/questionnaire:gender_female') }, { val: 'אחר', lbl: t('profile/questionnaire:gender_other') }
      ]} />

      <div className="pq-form-group">
        <label>{t('profile/profile:fields.religious_level')}</label>
        <input type="text" name="religious_level" value={formData.religious_level} onChange={handleChange} placeholder={t('profile/questionnaire:religion_placeholder')} />
      </div>

      <div className="pq-form-group">
        <label>{t('profile/profile:fields.release_date')}</label>
        <input type="date" name="release_date" value={formData.release_date} onChange={handleChange} />
      </div>

      <div className="pq-form-group full-width">
        <label><MapPin size={16} /> {t('profile/profile:fields.guest_address')}</label>
        <input
          type="text" name="guest_address" value={formData.guest_address}
          onChange={handleChange} required placeholder={t('profile/profile:fields.guest_address')}
        />
      </div>

      <div className="pq-form-group full-width">
        <label>{t('profile/profile:fields.unit_description')}</label>
        <textarea name="unit_description" value={formData.unit_description} onChange={handleChange} placeholder={t('profile/questionnaire:unit_placeholder')} rows="2" />
      </div>

      <div className="pq-form-group full-width">
        <label><Heart size={16} /> {t('profile/profile:fields.food_allergies')}</label>
        <textarea name="food_allergies" value={formData.food_allergies} onChange={handleChange} placeholder={t('profile/questionnaire:allergies_placeholder')} rows="2" />
      </div>

      <div className="pq-form-group full-width">
        <label>{t('profile/profile:fields.food_preferences')}</label>
        <textarea name="food_preferences" value={formData.food_preferences} onChange={handleChange} placeholder={t('profile/questionnaire:preferences_placeholder')} rows="2" />
      </div>
      <SelectGroup label={t('profile/profile:fields.kashrut_level')} name="kashrut_level" icon={<Utensils size={16} />} options={[t('profile/questionnaire:kashrut_none'), t('profile/questionnaire:kashrut_basic'), t('profile/questionnaire:kashrut_kosher'), t('profile/questionnaire:kashrut_mehadrin')]} />
      <div className="pq-checkbox-group full-width">
        <label className="checkbox-label">
          <input type="checkbox" name="is_anonymous" checked={formData.is_anonymous} onChange={handleChange} /> <User size={16} /> {t('profile/questionnaire:anonymous_label')}
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="giving_to_host" checked={formData.giving_to_host} onChange={handleChange} /> {t('profile/questionnaire:giving_label')}
        </label>
      </div>
    </div>
  );

  if (loadingAuth && !user) {
    return <Loading />;
  }

  return (
    <div className="pq-overlay">
      <div className="pq-container" dir="rtl">
        <div className="pq-header">
          <h2>{userType === 'host' ? t('profile/questionnaire:title_host') : t('profile/questionnaire:title_guest')}</h2>
          <p>{t('profile/questionnaire:subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="pq-form">
          {userType === 'host' ? renderHostForm() : renderGuestForm()}

          {error !== "" && <div className="pq-error-msg">{error}</div>}

          <div className="pq-actions">
            <button type="submit" className="pq-submit-btn" disabled={loading}>
              {loading ? t('profile/questionnaire:saving') : t('profile/questionnaire:save_btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
