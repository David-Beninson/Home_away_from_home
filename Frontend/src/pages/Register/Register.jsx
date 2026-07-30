import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuthCredentials, fetchCurrentUser } from '../../store/authSlice';
import { Eye, EyeOff } from 'lucide-react';
import { AuthHeader } from '../../components/Common/AuthHeader';
import { useTranslation } from 'react-i18next';
import './Register.css';

export default function Register() {
  const { t } = useTranslation(['common/auth']);
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
        setSuccess(t('common/auth:success.otp_resent'));
        setResendCountdown(30);
      }
    } catch (err) {
      setError(err.response?.data?.detail || t('common/auth:errors.resend_failed'));
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
        setError(t('common/auth:errors.passwords_mismatch'));
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
          setSuccess(t('common/auth:success.otp_sent'));
          setResendCountdown(30);
          setStep(2);
        }
      } catch (err) {
        setError(err.response?.data?.detail || t('common/auth:errors.register_failed'));
      } finally {
        setLoading(false);
      }
    } else {
      if (!otpCode || otpCode.length !== 6) {
        setError(t('common/auth:errors.invalid_otp_format'));
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
          setSuccess(t('common/auth:success.register_success'));
          localStorage.setItem('token', response.data.access_token);
          
          // 1. ADD 'async' right here vvv
          setTimeout(async () => {
            dispatch(setAuthCredentials({ token: response.data.access_token }));
            
            // 2. ADD 'await' right here vvv
            await dispatch(fetchCurrentUser());
            
            navigate('/');
          }, 1500);
        }
      } catch (err) {
        setError(err.response?.data?.detail || t('common/auth:errors.invalid_otp'));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <AuthHeader />

        {error && <div className="login-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {step === 1 ? (
            <>
              <div className="form-group">
                <label htmlFor="full_name">{t('common/auth:fields.full_name_label')}</label>
                <input
                  type="text"
                  id="full_name"
                  required
                  placeholder={t('common/auth:fields.full_name_placeholder')}
                  value={formData.full_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">{t('common/auth:fields.email_label')}</label>
                <input
                  type="email"
                  id="email"
                  required
                  placeholder={t('common/auth:fields.email_placeholder')}
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone_number">{t('common/auth:fields.phone_label')}</label>
                <input
                  type="tel"
                  id="phone_number"
                  required
                  placeholder={t('common/auth:fields.phone_placeholder')}
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">{t('common/auth:fields.password_label')}</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    placeholder={t('common/auth:fields.password_placeholder')}
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('common/auth:aria.hide_password') : t('common/auth:aria.show_password')}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">{t('common/auth:fields.confirm_password_label')}</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm_password"
                    required
                    placeholder={t('common/auth:fields.confirm_password_placeholder')}
                    value={formData.confirm_password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? t('common/auth:aria.hide_password') : t('common/auth:aria.show_password')}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Custom Pill Switcher for User Type */}
              <div className="form-group">
                <label>{t('common/auth:fields.role_label')}</label>
                <div className="auth-toggle-pill">
                  <div className="toggle-options-container">
                    <button
                      type="button"
                      className={`toggle-btn-option ${formData.user_type === 'guest' ? 'active' : ''}`}
                      onClick={() => setFormData((prev) => ({ ...prev, user_type: 'guest' }))}
                    >
                      {t('common/auth:fields.role_guest')}
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn-option ${formData.user_type === 'host' ? 'active' : ''}`}
                      onClick={() => setFormData((prev) => ({ ...prev, user_type: 'host' }))}
                    >
                      {t('common/auth:fields.role_host')}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? t('common/auth:buttons.register_step1_loading') : t('common/auth:buttons.register_step1')}
              </button>
            </>
          ) : (
            <>
              <div className="otp-banner">
                {t('common/auth:otp.banner', { email: formData.email })}
              </div>

              <div className="form-group">
                <label htmlFor="otpCode">{t('common/auth:fields.otp_label')}</label>
                <input
                  type="text"
                  id="otpCode"
                  maxLength="6"
                  required
                  placeholder={t('common/auth:fields.otp_placeholder')}
                  className="otp-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              {resendCountdown > 0 ? (
                <div className="otp-timer-note">
                  {t('common/auth:otp.timer_note', { seconds: resendCountdown })}
                </div>
              ) : (
                <div className="otp-resend-container">
                  <span>{t('common/auth:otp.did_not_receive')}</span>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="otp-resend-btn"
                  >
                    {t('common/auth:buttons.resend_otp')}
                  </button>
                </div>
              )}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? t('common/auth:buttons.register_step2_loading') : t('common/auth:buttons.register_step2')}
              </button>

              <button
                type="button"
                className="role-btn auth-secondary-btn"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                {t('common/auth:buttons.back_to_details')}
              </button>
            </>
          )}
        </form>

        <div className="login-footer">
          <span>{t('common/auth:footer.has_account')}</span>
          <span className="signup-link" onClick={() => navigate('/login')}>{t('common/auth:footer.login_here')}</span>
        </div>
      </div>
    </div>
  );
}
