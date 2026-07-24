import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { User, Home, Shield, Utensils, Heart, Info, MapPin } from 'lucide-react';
import { fetchCurrentUser } from '../../store/authSlice';
import { authApi } from '../../api/api';
import './ProfileQuestionnaire.css';

export default function ProfileQuestionnaire() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get the current user from Redux
  const user = useSelector((state) => state.auth.user);
  const userType = user?.user_type || 'guest';

  useEffect(() => {
    // This checks if the user actually typed a real string into a required field, 
    // ignoring FastAPI's default null keys.
    const isHostComplete = user?.profile?.city;
    const isGuestComplete = user?.profile?.origin_city || user?.profile?.service_type;
    
    if (user && (isHostComplete || isGuestComplete)) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // --- STATE VARIABLES ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state maps EXACTLY to FastAPI Pydantic schemas
  const [formData, setFormData] = useState({
    // --- Host Fields ---
    city: '',
    neighborhood: '',
    full_address: '',
    kashrut_level: 'kosher',
    religious_orientation: '',
    max_guests: 1,
    num_bedrooms: 0,
    has_pets: false,
    emergency_available: false,
    accessibility: '',
    free_text_notes: '',

    // --- Guest Fields ---
    is_soldier_or_national_service: false,
    service_type: '',
    origin_city: '',
    food_preferences_allergies: '',
    release_date: '',
    is_anonymous: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Filter out empty strings
    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== '' && v !== null)
    );

    try {
      // Use authApi based on user type
      if (userType === 'host') {
        await authApi.updateHostProfile(cleanData);
      } else {
        await authApi.updateGuestProfile(cleanData);
      }

      // Refresh user state in Redux
      await dispatch(fetchCurrentUser());

      // Navigate to homepage on success
      navigate('/', { replace: true });
      
    } catch (err) {
      console.error("Profile save error:", err);
      setError(err.response?.data?.detail || 'שגיאה בשמירת הפרופיל. נסו שוב.');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // HOST QUESTIONNAIRE
  // ----------------------------------------
  const renderHostForm = () => (
    <div className="pq-form-grid">
      <div className="pq-form-group">
        <label><MapPin size={16}/> עיר</label>
        <input type="text" name="city" value={formData.city} onChange={handleChange} required placeholder="לדוגמה: ירושלים" />
      </div>

      <div className="pq-form-group">
        <label>שכונה</label>
        <input type="text" name="neighborhood" value={formData.neighborhood} onChange={handleChange} placeholder="לדוגמה: רחביה" />
      </div>

      <div className="pq-form-group full-width">
        <label><Home size={16}/> כתובת מלאה</label>
        <input type="text" name="full_address" value={formData.full_address} onChange={handleChange} placeholder="רחוב ומספר בית" />
      </div>

      <div className="pq-form-group">
        <label><Utensils size={16}/> רמת כשרות</label>
        <select name="kashrut_level" value={formData.kashrut_level} onChange={handleChange}>
          <option value="none">ללא תעודה</option>
          <option value="basic">כשרות בסיסית</option>
          <option value="kosher">כשר</option>
          <option value="mehadrin">מהדרין</option>
          <option value="glatt_kosher">גלאט כשר</option>
        </select>
      </div>

      <div className="pq-form-group">
        <label>השתייכות דתית</label>
        <input type="text" name="religious_orientation" value={formData.religious_orientation} onChange={handleChange} placeholder="דתי לאומי, חרדי, מסורתי..." />
      </div>

      <div className="pq-form-group">
        <label>מקסימום אורחים</label>
        <input type="number" name="max_guests" min="1" value={formData.max_guests} onChange={handleChange} />
      </div>

      <div className="pq-form-group">
        <label>מספר חדרי שינה פנויים</label>
        <input type="number" name="num_bedrooms" min="0" value={formData.num_bedrooms} onChange={handleChange} />
      </div>

      <div className="pq-checkbox-group full-width">
        <label className="checkbox-label">
          <input type="checkbox" name="has_pets" checked={formData.has_pets} onChange={handleChange} />
          יש חיות מחמד בבית
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="emergency_available" checked={formData.emergency_available} onChange={handleChange} />
          זמינים לאירוח חירום / התראה קצרה
        </label>
      </div>

      <div className="pq-form-group full-width">
        <label><Info size={16}/> נגישות (אופציונלי)</label>
        <textarea name="accessibility" value={formData.accessibility} onChange={handleChange} placeholder="קומת קרקע, מעלית, פתחים רחבים..." rows="2" />
      </div>

      <div className="pq-form-group full-width">
        <label>הערות נוספות למתארחים</label>
        <textarea name="free_text_notes" value={formData.free_text_notes} onChange={handleChange} placeholder="ספרו קצת על המשפחה שלכם..." rows="3" />
      </div>
    </div>
  );

  // ----------------------------------------
  // GUEST QUESTIONNAIRE
  // ----------------------------------------
  const renderGuestForm = () => (
    <div className="pq-form-grid">
      <div className="pq-checkbox-group full-width">
        <label className="checkbox-label">
          <input type="checkbox" name="is_soldier_or_national_service" checked={formData.is_soldier_or_national_service} onChange={handleChange} />
          <Shield size={16}/> חייל/ת או משרת/ת שירות לאומי
        </label>
      </div>

      {formData.is_soldier_or_national_service && (
        <div className="pq-form-group">
          <label>סוג שירות</label>
          <input type="text" name="service_type" value={formData.service_type} onChange={handleChange} placeholder="לדוגמה: לוחם, עורפי, שירות לאומי" />
        </div>
      )}

      {formData.is_soldier_or_national_service && (
        <div className="pq-form-group">
          <label>תאריך שחרור (אופציונלי)</label>
          <input type="date" name="release_date" value={formData.release_date} onChange={handleChange} />
        </div>
      )}

      <div className="pq-form-group">
        <label><MapPin size={16}/> עיר מגורים (מקור)</label>
        <input type="text" name="origin_city" value={formData.origin_city} onChange={handleChange} placeholder="לדוגמה: חיפה" />
      </div>

      <div className="pq-form-group full-width">
        <label><Heart size={16}/> רגישויות, אלרגיות או העדפות מזון</label>
        <textarea name="food_preferences_allergies" value={formData.food_preferences_allergies} onChange={handleChange} placeholder="צמחוני, טבעוני, רגישות לגלוטן..." rows="2" />
      </div>

      <div className="pq-checkbox-group full-width">
        <label className="checkbox-label">
          <input type="checkbox" name="is_anonymous" checked={formData.is_anonymous} onChange={handleChange} />
          <User size={16}/> השאר את הפרופיל שלי אנונימי (מארחים לא יראו את שמך המלא עד לאישור הבקשה)
        </label>
      </div>
    </div>
  );

  return (
    <div className="pq-container" dir="rtl">
      <div className="pq-header">
        <h2>השלמת פרופיל {userType === 'host' ? 'מארח' : 'מתארח'}</h2>
        <p>אנא מלאו את הפרטים הבאים כדי שנוכל להתאים לכם את החוויה הטובה ביותר לשבת.</p>
      </div>

      <form onSubmit={handleSubmit} className="pq-form">
        {userType === 'host' ? renderHostForm() : renderGuestForm()}
        
        {error && (
          <div style={{ color: '#ef4444', textAlign: 'center', marginBottom: '1rem', fontWeight: '500' }}>
            {error}
          </div>
        )}

        <div className="pq-actions">
          <button type="submit" className="pq-submit-btn" disabled={loading}>
            {loading ? 'שומר נתונים...' : 'שמור פרופיל והמשך'}
          </button>
        </div>
      </form>
    </div>
  );
}