import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginUser } from '../../store/authSlice';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { AuthHeader } from '../../components/Common/AuthHeader';
import './Login.css';
export default function Login() {
  const { t } = useTranslation(['common/auth']);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const isLoginActive = location.pathname === '/login' || location.pathname === '/';

  const fieldsConfig = [
    { id: 'username', label: t('common/auth:fields.email_label'), type: 'email', placeholder: t('common/auth:fields.email_placeholder') },
    { id: 'password', label: t('common/auth:fields.password_label'), type: 'password', placeholder: t('common/auth:fields.password_placeholder') }
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
      const errorMsg = typeof err === 'string' ? err : t('common/auth:errors.invalid_credentials');
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
              aria-label={showPassword ? t('common/auth:aria.hide_password') : t('common/auth:aria.show_password')}
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
        <AuthHeader />

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {renderFields()}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? t('common/auth:buttons.logging_in') : t('common/auth:buttons.login')}
          </button>
        </form>

        <div className="login-footer">
          <span>{t('common/auth:footer.no_account')}</span>
          <span className="signup-link" onClick={() => navigate('/register')}>{t('common/auth:footer.signup_here')}</span>
        </div>
      </div>
    </div>
  );
}