import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuthCredentials, fetchCurrentUser } from '../../store/authSlice';
import { Shield, Eye, EyeOff } from 'lucide-react';
import './Register.css';

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
    user_type: 'guest'
  });

  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const isLoginActive = location.pathname === '/login';

  // Handle countdown for Resend OTP
  useEffect(() => {
    let timer;
    if (step === 2 && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCountdown]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleResendOTP = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    try {
      const payload = {
        phone_number: formData.phone_number,
        email: formData.email
      };
      const response = await axios.post(`${apiBaseUrl}/auth/register/request-otp`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.status === 200 || response.status === 201) {
        setSuccess('קוד אימות חדש נשלח למייל שלך.');
        setResendCountdown(30);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'בקשת קוד אימות חדש נכשלה.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    if (step === 1) {
      if (formData.password && formData.confirm_password && formData.password !== formData.confirm_password) {
        setError('הסיסמאות אינן תואמות.');
        return;
      }

      setLoading(true);

      try {
        const payload = {
          phone_number: formData.phone_number,
          email: formData.email
        };

        const response = await axios.post(`${apiBaseUrl}/auth/register/request-otp`, payload, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 200 || response.status === 201) {
          setSuccess('קוד אימות נשלח למייל שלך.');
          setResendCountdown(30);
          setStep(2);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'הרשמה נכשלה. אנא ודא שהפרטים אינם רשומים כבר במערכת.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!otpCode || otpCode.length !== 6) {
        setError('נא להזין קוד אימות תקין בעל 6 ספרות.');
        return;
      }

      setLoading(true);

      try {
        const payload = {
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          password: formData.password,
          user_type: formData.user_type,
          otp_code: otpCode
        };

        const response = await axios.post(`${apiBaseUrl}/auth/register/verify`, payload, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.access_token) {
          setSuccess('ההרשמה והאימות בוצעו בהצלחה!');
          localStorage.setItem('token', response.data.access_token);
          
          // 1. ADD 'async' right here vvv
          setTimeout(async () => {
            dispatch(setAuthCredentials({ token: response.data.access_token }));
            
            // 2. ADD 'await' right here vvv
            await dispatch(fetchCurrentUser());
            
            navigate('/complete-profile');
          }, 1500);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'קוד האימות אינו תקין או פג תוקף.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Navigation Switcher Pill */}
        <div className="auth-toggle-wrapper">
          <div className="auth-toggle-pill">
            <div className="toggle-options-container" style={{ width: '100%' }}>
              <button
                type="button"
                className={`toggle-btn-option ${!isLoginActive ? 'active' : ''}`}
                onClick={() => navigate('/register')}
                style={{ flex: 1, textAlign: 'center' }}
              >
                הרשמה
              </button>
              <button
                type="button"
                className={`toggle-btn-option ${isLoginActive ? 'active' : ''}`}
                onClick={() => navigate('/login')}
                style={{ flex: 1, textAlign: 'center' }}
              >
                התחברות
              </button>
            </div>
          </div>
        </div>

        <div className="login-header">
          <Shield size={48} color="#2563eb" className="login-shield-icon" fill="#2563eb" />
          <h2>יצירת חשבון חדש</h2>
          <p>הצטרף למערכת אירוח החיילים בסופי שבוע</p>
        </div>

        {error && <div className="login-error">{error}</div>}
        {success && (
          <div
            style={{
              color: '#4ade80',
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid rgba(74, 222, 128, 0.2)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center',
              fontSize: '14px'
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {step === 1 ? (
            <>
              <div className="form-group">
                <label htmlFor="full_name">שם מלא</label>
                <input
                  type="text"
                  id="full_name"
                  required
                  placeholder="ישראל ישראלי"
                  value={formData.full_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">כתובת אימייל</label>
                <input
                  type="email"
                  id="email"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone_number">מספר טלפון</label>
                <input
                  type="tel"
                  id="phone_number"
                  required
                  placeholder="0501234567"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">סיסמה</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
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
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">אימות סיסמה</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm_password"
                    required
                    placeholder="הקלד שוב את הסיסמה"
                    value={formData.confirm_password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Custom Pill Switcher for User Type */}
              <div className="form-group">
                <label>אני רוצה להרשם כ...</label>
                <div className="auth-toggle-pill" style={{ marginTop: '4px' }}>
                  <div className="toggle-options-container" style={{ width: '100%' }}>
                    <button
                      type="button"
                      className={`toggle-btn-option ${formData.user_type === 'guest' ? 'active' : ''}`}
                      onClick={() => setFormData((prev) => ({ ...prev, user_type: 'guest' }))}
                      style={{ flex: 1, textAlign: 'center' }}
                    >
                      צבא / שירות לאומי
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn-option ${formData.user_type === 'host' ? 'active' : ''}`}
                      onClick={() => setFormData((prev) => ({ ...prev, user_type: 'host' }))}
                      style={{ flex: 1, textAlign: 'center' }}
                    >
                      משפחה מארחת
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'שולח קוד אימות...' : 'המשך לקבלת קוד'}
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  color: '#1d4ed8',
                  backgroundColor: 'rgba(29, 78, 216, 0.05)',
                  border: '1px solid rgba(29, 78, 216, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                קוד אימות נשלח לכתובת המייל: {formData.email}
              </div>

              <div className="form-group">
                <label htmlFor="otpCode">קוד אימות (6 ספרות)</label>
                <input
                  type="text"
                  id="otpCode"
                  maxLength="6"
                  required
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    letterSpacing: '6px',
                    fontSize: '1.25rem',
                    textAlign: 'center',
                    fontWeight: '600'
                  }}
                />
              </div>

              {resendCountdown > 0 ? (
                <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', margin: '4px 0 12px 0' }}>
                  ניתן לשלוח קוד חדש בעוד {resendCountdown} שניות
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '0.85rem', margin: '4px 0 12px 0' }}>
                  <span>לא קיבלת את הקוד? </span>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1d4ed8',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '0',
                      textDecoration: 'underline'
                    }}
                  >
                    שלח שוב
                  </button>
                </div>
              )}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'מבצע הרשמה...' : 'השלם הרשמה'}
              </button>

              <button
                type="button"
                className="role-btn"
                onClick={() => setStep(1)}
                disabled={loading}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  textAlign: 'center',
                  border: '1px solid #cbd5e1',
                  color: '#475569'
                }}
              >
                חזור לפרטים אישיים
              </button>
            </>
          )}
        </form>

        <div className="login-footer">
          <span>כבר יש לך חשבון?</span>
          <span className="signup-link" onClick={() => navigate('/login')}>התחבר כאן</span>
        </div>
      </div>
    </div>
  );
}
