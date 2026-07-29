import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginUser } from '../../store/authSlice';
import { Shield, Eye, EyeOff } from 'lucide-react';
import './Login.css';
import { BRAND_TITLE, BRAND_SUBTITLE } from '../../config/brand';

export default function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const isLoginActive = location.pathname === '/login' || location.pathname === '/';

  const fieldsConfig = [
    { id: 'username', label: 'כתובת אימייל', type: 'email', placeholder: 'name@example.com' },
    { id: 'password', label: 'סיסמה', type: 'password', placeholder: '••••••••' }
  ];

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await dispatch(loginUser(formData)).unwrap();
      navigate('/');
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'שם משתמש או סיסמה שגויים';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  function renderFields() {
    return fieldsConfig.map((field) => (
      <div className="form-group" key={field.id}>
        <label htmlFor={field.id}>{field.label}</label>
        {field.id === 'password' ? (
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id={field.id}
              required
              placeholder={field.placeholder}
              value={formData[field.id]}
              onChange={handleChange}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        ) : (
          <input
            type={field.type}
            id={field.id}
            required
            placeholder={field.placeholder}
            value={formData[field.id]}
            onChange={handleChange}
          />
        )}
      </div>
    ));
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Navigation Switcher Pill (Without Arrows) */}
        <div className="auth-toggle-wrapper">
          <div className="auth-toggle-pill">
            <div className="toggle-options-container">
              <button
                type="button"
                className={`toggle-btn-option ${!isLoginActive ? 'active' : ''}`}
                onClick={() => navigate('/register')}
              >
                הרשמה
              </button>
              <button
                type="button"
                className={`toggle-btn-option ${isLoginActive ? 'active' : ''}`}
                onClick={() => navigate('/login')}
              >
                התחברות
              </button>
            </div>
          </div>
        </div>

        <div className="login-header">
          <Shield size={48} color="#2563eb" className="login-shield-icon" fill="#2563eb" />
          <h2>{BRAND_TITLE}</h2>
          <p>{BRAND_SUBTITLE}</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {renderFields()}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'מתחבר...' : 'התחברות'}
          </button>
        </form>

        <div className="login-footer">
          <span>אין לך חשבון עדיין?</span>
          <span className="signup-link" onClick={() => navigate('/register')}>הרשמה כאן</span>
        </div>
      </div>
    </div>
  );
}