import { useState } from 'react';
import { Heart, Check, X, Loader2 } from 'lucide-react';
import { bookingsApi } from '../../api/api';
import { useTranslation } from 'react-i18next';

export default function PendingOfferBox({ post, onUpdateSuccess }) {
  const { t } = useTranslation(['guest/requests']);
  const [respondingAction, setRespondingAction] = useState(null); // null | 'matched' | 'rejected'

  const handleGuestRespond = async (statusChoice) => {
    if (!post.pending_match_id) {
      console.warn('No pending match id found on post');
      return;
    }
    try {
      setRespondingAction(statusChoice);
      await bookingsApi.respondToBooking(post.pending_match_id, statusChoice);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      console.error('Failed to respond to booking:', err);
      const detailMsg = err.response?.data?.detail || err.message;
      alert(t('guest/requests:pending_offer.error_respond', { error: detailMsg }));
    } finally {
      setRespondingAction(null);
    }
  };

  const isSubmitting = respondingAction !== null;

  return (
    <div className="pending-offer-box">
      <div className="pending-offer-title">
        <Heart size={18} color="#ef4444" fill="#ef4444" />
        <span>{t('guest/requests:pending_offer.title')}</span>
      </div>
      <p className="pending-offer-desc">
        {post.claimed_by_host_name ? t('guest/requests:pending_offer.host_name', { name: post.claimed_by_host_name }) : t('guest/requests:pending_offer.host_default')}
        {post.claimed_by_host_city ? t('guest/requests:pending_offer.host_city', { city: post.claimed_by_host_city }) : ''}
      </p>
      <div className="pending-offer-actions">
        <button
          onClick={() => handleGuestRespond('matched')}
          disabled={isSubmitting}
          className="pending-offer-accept-btn"
          style={{ opacity: isSubmitting && respondingAction !== 'matched' ? 0.6 : 1 }}
        >
          {respondingAction === 'matched' ? <Loader2 size={16} className="spin-icon" /> : <Check size={16} />}
          <span>{t('guest/requests:pending_offer.btn_accept')}</span>
        </button>
        <button
          onClick={() => handleGuestRespond('rejected')}
          disabled={isSubmitting}
          className="pending-offer-decline-btn"
          style={{ opacity: isSubmitting && respondingAction !== 'rejected' ? 0.6 : 1 }}
        >
          {respondingAction === 'rejected' ? <Loader2 size={16} className="spin-icon" /> : <X size={16} />}
          <span>{t('guest/requests:pending_offer.btn_decline')}</span>
        </button>
      </div>
    </div>
  );
}
