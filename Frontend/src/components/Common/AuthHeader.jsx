import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { BRAND_TITLE, BRAND_SUBTITLE } from '../../config/brand';

export function AuthHeader() {
  const { t } = useTranslation(['common/auth']);
  const navigate = useNavigate();
  const location = useLocation();

  const isLoginActive = location.pathname === '/login' || location.pathname === '/';

  return (
    <>
      <div className="auth-toggle-wrapper">
        <div className="auth-toggle-pill">
          <div className="toggle-options-container">
            <button
              type="button"
              className={`toggle-btn-option ${!isLoginActive ? 'active' : ''}`}
              onClick={() => navigate('/register')}
            >
              {t('common/auth:tabs.register')}
            </button>
            <button
              type="button"
              className={`toggle-btn-option ${isLoginActive ? 'active' : ''}`}
              onClick={() => navigate('/login')}
            >
              {t('common/auth:tabs.login')}
            </button>
          </div>
        </div>
      </div>

      <div className="login-header">
        <Shield size={48} color="#2563eb" className="login-shield-icon" fill="#2563eb" />
        <h2>{BRAND_TITLE}</h2>
        <p>{BRAND_SUBTITLE}</p>
      </div>
    </>
  );
}
