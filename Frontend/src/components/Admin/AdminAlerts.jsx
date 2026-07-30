import React, { useState, useEffect } from 'react';
import { reviewsApi } from '../../api/api';
import { AlertCircle, EyeOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminAlerts() {
  const { t } = useTranslation(['admin/alerts']);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await reviewsApi.getAlerts();
      setAlerts(res.data || []);
    } catch (err) {
      setError(t('admin/alerts:messages.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleHideReview = async (reviewId) => {
    if (!window.confirm(t('admin/alerts:messages.confirm_hide'))) return;
    try {
      await reviewsApi.updateStatus(reviewId, 'hidden');
      alert(t('admin/alerts:messages.success_hide'));
      fetchAlerts();
    } catch (err) {
      alert(t('admin/alerts:messages.error_hide'));
    }
  };

  if (loading) return <div className="admin-loading"><Loader2 className="spin-icon" size={32} /></div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-subpage">
      <h2>{t('admin/alerts:title')}</h2>
      {alerts.length === 0 ? (
        <p>{t('admin/alerts:empty_state')}</p>
      ) : (
        <div className="admin-list">
          {alerts.map(alert => (
            <div key={alert.id} className="admin-card alert-card">
              <div className="alert-header">
                <h3><AlertCircle size={18} className="text-red" style={{verticalAlign: 'middle', marginLeft: '8px'}} /> {t('admin/alerts:review_id')}: {alert.payload?.review_id}</h3>
                <span className="alert-date">{new Date(alert.created_at).toLocaleString('he-IL')}</span>
              </div>
              <div className="alert-details">
                <p><strong>{t('admin/alerts:reviewer')}:</strong> {alert.payload?.reviewer_name}</p>
                <p><strong>{t('admin/alerts:reviewee')}:</strong> {alert.payload?.reviewee_name}</p>
                <p><strong>{t('admin/alerts:rating')}:</strong> {alert.payload?.rating} {t('admin/alerts:stars')}</p>
                <p><strong>{t('admin/alerts:auto_flagged')}:</strong> {alert.payload?.auto_flagged ? t('admin/alerts:yes') : t('admin/alerts:no')}</p>
                <p><strong>{t('admin/alerts:user_flagged')}:</strong> {alert.payload?.user_flagged ? t('admin/alerts:yes') : t('admin/alerts:no')}</p>
                <div className="alert-review-content">
                  <strong>{t('admin/alerts:content')}</strong>
                  <p>{alert.payload?.content}</p>
                </div>
              </div>
              <div className="alert-actions">
                <button 
                  className="admin-btn admin-btn-danger" 
                  onClick={() => handleHideReview(alert.payload?.review_id)}
                >
                  <EyeOff size={16} /> {t('admin/alerts:hide_review')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
