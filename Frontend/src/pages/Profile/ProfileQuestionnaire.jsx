import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Utensils, Heart, MapPin } from 'lucide-react';
import { fetchCurrentUser, setCurrentUser } from '../../store/authSlice';
import { authApi } from '../../api/api';
import Loading from '../../components/Common/Loading/Loading';
import './ProfileQuestionnaire.css';

export default function ProfileQuestionnaire() {
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
      // For hosts, do NOT prefill residential_address (no default city)
      const merged = { ...formData };
      Object.keys(merged).forEach((k) => {
        if (k === 'residential_address' && user.user_type === 'host') return; // skip prefill for host address
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
      setError('אנא מלאו את כל שדות החובה (כתובת מגורים).');
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
          : (detail && typeof detail === 'object' ? JSON.stringify(detail) : 'שגיאה בשמירת הפרופיל. נסו שוב.');
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
        <label><MapPin size={16} /> כתובת מגורים</label>
        <input
          type="text" name="residential_address" value={formData.residential_address}
          onChange={handleChange} required placeholder="הכנס כתובת מלאה"
        />
      </div>

      <SelectGroup label="כמות אורחים (1-15)" name="max_guests" options={numberOptions} />

      <SelectGroup label="סוג שכונה" name="neighborhood_type" options={[
        { val: '', lbl: 'בחר סוג שכונה' }, { val: 'חילונית', lbl: 'חילונית' }, { val: 'דתית', lbl: 'דתית' }, { val: 'חרדית', lbl: 'חרדית' }
      ]} />

      <SelectGroup label="רמת כשרות" name="kashrut_level" icon={<Utensils size={16} />} options={['כלום', 'בסיסי', 'כשר', 'מהדרין']} />
      <SelectGroup label="כמות מיטות (1-15)" name="num_beds" options={numberOptions} />
      <SelectGroup label="כמות חדרי שינה (1-15)" name="num_bedrooms" options={numberOptions} />

      <SelectGroup label="רמת נגישות" name="accessibility_level" options={[
        { val: '', lbl: 'בחר נגישות' }, { val: 'מעלית', lbl: 'מעלית' }, { val: 'מדרגות', lbl: 'מדרגות' }
      ]} />

      <SelectGroup label="סוג מגורים" name="housing_type" options={[
        { val: '', lbl: 'בחר סוג מגורים' }, { val: 'בניין', lbl: 'בניין' }, { val: 'בית פרטי', lbl: 'בית פרטי' }
      ]} />

      <div className="pq-form-group full-width">
        <label>חיות מחמד בבית</label>
        <textarea
          name="pets_description" value={formData.pets_description} onChange={handleChange}
          placeholder="פרט האם יש חיות מחמד, אילו סוגים וכו'..." rows="2"
        />
      </div>
    </div>
  );

  // ----------------------------------------
  // GUEST QUESTIONNAIRE (שאלון אורח)
  // ----------------------------------------
  const renderGuestForm = () => (
    <div className="pq-form-grid">
      <SelectGroup label="סוג שירות" name="service_type" icon={<Shield size={16} />} options={['סדיר', 'קבע', 'מילואים', 'שירות לאומי']} />

      <SelectGroup label="מין" name="gender" options={[
        { val: '', lbl: 'בחר מין' }, { val: 'זכר', lbl: 'זכר' }, { val: 'נקבה', lbl: 'נקבה' }, { val: 'אחר', lbl: 'אחר' }
      ]} />

      <div className="pq-form-group">
        <label>השתייכות דתית</label>
        <input type="text" name="religious_level" value={formData.religious_level} onChange={handleChange} placeholder="דתי / חילוני..." />
      </div>

      <div className="pq-form-group">
        <label>תאריך סיום שירות</label>
        <input type="date" name="release_date" value={formData.release_date} onChange={handleChange} />
      </div>

      <div className="pq-form-group full-width">
        <label><MapPin size={16} /> כתובת מגורים</label>
        <input
          type="text" name="guest_address" value={formData.guest_address}
          onChange={handleChange} required placeholder="הכנס את כתובת המגורים שלך"
        />
      </div>

      <div className="pq-form-group full-width">
        <label>תיאור יחידה / תיאור שירות לאומי</label>
        <textarea name="unit_description" value={formData.unit_description} onChange={handleChange} placeholder="ספר בקצרה על היחידה או מסגרת השירות שלך..." rows="2" />
      </div>

      <div className="pq-form-group full-width">
        <label><Heart size={16} /> אלרגיות לאוכל</label>
        <textarea name="food_allergies" value={formData.food_allergies} onChange={handleChange} placeholder="רגישויות, אלרגיות מיוחדות..." rows="2" />
      </div>

      <div className="pq-form-group full-width">
        <label>העדפות לאוכל</label>
        <textarea name="food_preferences" value={formData.food_preferences} onChange={handleChange} placeholder="צמחוני, טבעוני, העדפות מיוחדות..." rows="2" />
      </div>
      <SelectGroup label="רמת כשרות" name="kashrut_level" icon={<Utensils size={16} />} options={['כלום', 'בסיסי', 'כשר', 'מהדרין']} />
      <div className="pq-checkbox-group full-width">
        <label className="checkbox-label">
          <input type="checkbox" name="is_anonymous" checked={formData.is_anonymous} onChange={handleChange} /> <User size={16} /> תמיד אנונימי (הסתרת פרטים אישיים עד לאישור)
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="giving_to_host" checked={formData.giving_to_host} onChange={handleChange} /> נתינה למארח (התנדבות / השתתפות)
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
          <h2>השלמת פרופיל {userType === 'host' ? 'מארח' : 'מתארח'}</h2>
          <p>אנא מלאו את הפרטים הבאים כדי להשלים את ההרשמה למערכת.</p>
        </div>

        <form onSubmit={handleSubmit} className="pq-form">
          {userType === 'host' ? renderHostForm() : renderGuestForm()}

          {error !== "" && <div className="pq-error-msg">{error}</div>}

          <div className="pq-actions">
            <button type="submit" className="pq-submit-btn" disabled={loading}>
              {loading ? 'שומר נתונים...' : 'שמור פרופיל והמשך'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
