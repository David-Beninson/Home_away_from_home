import React, { useState, useEffect } from 'react';
import { reviewsApi } from '../../api/api';
import { AlertCircle, EyeOff, Loader2 } from 'lucide-react';

export default function AdminAlerts() {
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
      setError('שגיאה בטעינת התראות.');
    } finally {
      setLoading(false);
    }
  };

  const handleHideReview = async (reviewId) => {
    if (!window.confirm('האם אתה בטוח שברצונך להסתיר ביקורת זו?')) return;
    try {
      await reviewsApi.updateStatus(reviewId, 'hidden');
      alert('הביקורת הוסתרה בהצלחה.');
      fetchAlerts();
    } catch (err) {
      alert('שגיאה בהסתרת הביקורת.');
    }
  };

  if (loading) return <div className="admin-loading"><Loader2 className="spin-icon" size={32} /></div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-subpage">
      <h2>התראות מערכת (ביקורות חריגות)</h2>
      {alerts.length === 0 ? (
        <p>אין התראות חריגות כרגע.</p>
      ) : (
        <div className="admin-list">
          {alerts.map(alert => (
            <div key={alert.id} className="admin-card alert-card">
              <div className="alert-header">
                <h3><AlertCircle size={18} className="text-red" style={{verticalAlign: 'middle', marginLeft: '8px'}} /> מזהה ביקורת: {alert.payload?.review_id}</h3>
                <span className="alert-date">{new Date(alert.created_at).toLocaleString('he-IL')}</span>
              </div>
              <div className="alert-details">
                <p><strong>מאת (המבקר):</strong> {alert.payload?.reviewer_name}</p>
                <p><strong>אודות (המבוקר):</strong> {alert.payload?.reviewee_name}</p>
                <p><strong>דירוג:</strong> {alert.payload?.rating} כוכבים</p>
                <p><strong>דגל אוטומטי:</strong> {alert.payload?.auto_flagged ? 'כן' : 'לא'}</p>
                <p><strong>דגל משתמש:</strong> {alert.payload?.user_flagged ? 'כן' : 'לא'}</p>
                <div className="alert-review-content">
                  <strong>תוכן הביקורת:</strong>
                  <p>{alert.payload?.content}</p>
                </div>
              </div>
              <div className="alert-actions">
                <button 
                  className="admin-btn admin-btn-danger" 
                  onClick={() => handleHideReview(alert.payload?.review_id)}
                >
                  <EyeOff size={16} /> הסתר ביקורת זו
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
