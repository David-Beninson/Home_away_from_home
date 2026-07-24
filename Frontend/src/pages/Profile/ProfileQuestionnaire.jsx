import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { User, Home, Shield, Utensils, Heart, Info, MapPin } from 'lucide-react';
import { fetchCurrentUser } from '../../store/authSlice';
import { authApi } from '../../api/api';
import './ProfileQuestionnaire.css';

export default function ProfileQuestionnaire() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const userType = user?.user_type || 'guest';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initial state matches the FastAPI schemas exactly
  const [formData, setFormData] = useState({
    // --- Host Fields ---
    residential_address: '',
    max_guests: 1,
    neighborhood_type: '',
    kashrut_level: 'כשר',
    num_beds: 1,
    num_bedrooms: 1,
    pets_description: '',
    housing_type: '',
    accessibility_level: '',

    // --- Guest Fields ---
    service_type: 'סדיר',
    unit_description: '',
    release_date: '',
    is_anonymous: false,
    giving_to_host: false,
    food_allergies: '',
    food_preferences: '',
    religious_level: '',
    kosher_food: true,
    gender: '',
    guest_address: ''
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
    
    // Filter out empty strings or null values, but keep 'false' for checkboxes
    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== '' && v !== null)
    );

    try {
      if (userType === 'host') {
        await authApi.updateHostProfile(cleanData);
      } else {
        await authApi.updateGuestProfile(cleanData);
      }

      await dispatch(fetchCurrentUser());
      navigate('/', { replace: true });
      
    } catch (err) {
      console.error("Profile save error:", err);
      setError(err.response?.data?.detail || 'שגיאה בשמירת הפרופיל. נסו שוב.');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // HOST QUESTIONNAIRE (שאלון מארח)
  // ----------------------------------------
  const renderHostForm = () => (
    <div className="pq-form-grid">
      <div className="pq-form-group full-width">
        <label><MapPin size={16}/> כתובת מגורים</label>
        <input 
          type="text" 
          name="residential_address" 
          value={formData.residential_address} 
          onChange={handleChange} 
          required 
          placeholder="הכנס כתובת מלאה" 
        />
      </div>

      <div className="pq-form-group">
        <label>כמות אורחים (1-15)</label>
        <select name="max_guests" value={formData.max_guests} onChange={handleChange}>
          {[...Array(15)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
      </div>

      <div className="pq-form-group">
        <label>סוג שכונה</label>
        <select name="neighborhood_type" value={formData.neighborhood_type} onChange={handleChange}>
          <option value="">בחר סוג שכונה</option>
          <option value="חילונית">חילונית</option>
          <option value="דתית">דתית</option>
          <option value="חרדית">חרדית</option>
        </select>
      </div>

      <div className="pq-form-group">
        <label><Utensils size={16}/> רמת כשרות</label>
        <select name="kashrut_level" value={formData.kashrut_level} onChange={handleChange}>
          <option value="כלום">כלום</option>
          <option value="בסיסי">בסיסי</option>
          <option value="כשר">כשר</option>
          <option value="מהדרין">מהדרין</option>
        </select>
      </div>

      <div className="pq-form-group">
        <label>כמות מיטות (1-15)</label>
        <select name="num_beds" value={formData.num_beds} onChange={handleChange}>
          {[...Array(15)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
      </div>

      <div className="pq-form-group">
        <label>כמות חדרי שינה (1-15)</label>
        <select name="num_bedrooms" value={formData.num_bedrooms} onChange={handleChange}>
          {[...Array(15)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
      </div>

      <div className="pq-form-group">
        <label>רמת נגישות</label>
        <select name="accessibility_level" value={formData.accessibility_level} onChange={handleChange}>
          <option value="">בחר נגישות</option>
          <option value="מעלית">מעלית</option>
          <option value="מדרגות">מדרגות</option>
        </select>
      </div>

      <div className="pq-form-group">
        <label>סוג מגורים</label>
        <select name="housing_type" value={formData.housing_type} onChange={handleChange}>
          <option value="">בחר סוג מגורים</option>
          <option value="בניין">בניין</option>
          <option value="בית פרטי">בית פרטי</option>
        </select>
      </div>

      <div className="pq-form-group full-width">
        <label>חיות מחמד בבית</label>
        <textarea 
          name="pets_description" 
          value={formData.pets_description} 
          onChange={handleChange} 
          placeholder="פרט האם יש חיות מחמד, אילו סוגים וכו'..." 
          rows="2" 
        />
      </div>
    </div>
  );

  // ----------------------------------------
  // GUEST QUESTIONNAIRE (שאלון אורח)
  // ----------------------------------------
  const renderGuestForm = () => (
    <div className="pq-form-grid">
      <div className="pq-form-group">
        <label><Shield size={16}/> סוג שירות</label>
        <select name="service_type" value={formData.service_type} onChange={handleChange}>
          <option value="סדיר">סדיר</option>
          <option value="קבע">קבע</option>
          <option value="מילואים">מילואים</option>
          <option value="שירות לאומי">שירות לאומי</option>
        </select>
      </div>

      <div className="pq-form-group">
        <label>מין</label>
        <select name="gender" value={formData.gender} onChange={handleChange}>
          <option value="">בחר מין</option>
          <option value="זכר">זכר</option>
          <option value="נקבה">נקבה</option>
          <option value="אחר">אחר</option>
        </select>
      </div>

      <div className="pq-form-group">
        <label>השתייכות דתית</label>
        <input 
          type="text" 
          name="religious_level" 
          value={formData.religious_level} 
          onChange={handleChange} 
          placeholder="דתי / חילוני..." 
        />
      </div>

      <div className="pq-form-group">
        <label>תאריך סיום שירות</label>
        <input 
          type="date" 
          name="release_date" 
          value={formData.release_date} 
          onChange={handleChange} 
        />
      </div>

      <div className="pq-form-group full-width">
        <label><MapPin size={16}/> כתובת מגורים</label>
        <input 
          type="text" 
          name="guest_address" 
          value={formData.guest_address} 
          onChange={handleChange} 
          placeholder="הכנס את כתובת המגורים שלך" 
        />
      </div>

      <div className="pq-form-group full-width">
        <label>תיאור יחידה / תיאור שירות לאומי</label>
        <textarea 
          name="unit_description" 
          value={formData.unit_description} 
          onChange={handleChange} 
          placeholder="ספר בקצרה על היחידה או מסגרת השירות שלך..." 
          rows="2" 
        />
      </div>

      <div className="pq-form-group full-width">
        <label><Heart size={16}/> אלרגיות לאוכל</label>
        <textarea 
          name="food_allergies" 
          value={formData.food_allergies} 
          onChange={handleChange} 
          placeholder="רגישויות, אלרגיות מיוחדות..." 
          rows="2" 
        />
      </div>

      <div className="pq-form-group full-width">
        <label>העדפות לאוכל</label>
        <textarea 
          name="food_preferences" 
          value={formData.food_preferences} 
          onChange={handleChange} 
          placeholder="צמחוני, טבעוני, העדפות מיוחדות..." 
          rows="2" 
        />
      </div>

      <div className="pq-checkbox-group full-width">
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            name="kosher_food" 
            checked={formData.kosher_food} 
            onChange={handleChange} 
          />
          אוכל כשר
        </label>
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            name="is_anonymous" 
            checked={formData.is_anonymous} 
            onChange={handleChange} 
          />
          <User size={16}/> תמיד אנונימי (הסתרת פרטים אישיים עד לאישור)
        </label>
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            name="giving_to_host" 
            checked={formData.giving_to_host} 
            onChange={handleChange} 
          />
          נתינה למארח (התנדבות / השתתפות)
        </label>
      </div>
    </div>
  );

  return (
    <div className="pq-container" dir="rtl">
      <div className="pq-header">
        <h2>השלמת פרופיל {userType === 'host' ? 'מארח' : 'מתארח'}</h2>
        <p>אנא מלאו את הפרטים הבאים כדי להשלים את ההרשמה למערכת.</p>
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