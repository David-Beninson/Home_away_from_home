import { useState } from 'react';
import { Heart, Check, X, Loader2 } from 'lucide-react';
import { bookingsApi } from '../../api/api';

export default function PendingOfferBox({ post, onUpdateSuccess }) {
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
      alert('שגיאה בתגובה לבקשה: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRespondingAction(null);
    }
  };

  const isSubmitting = respondingAction !== null;

  return (
    <div className="pending-offer-box">
      <div className="pending-offer-title">
        <Heart size={18} color="#ef4444" fill="#ef4444" />
        <span>מארח הציע לארח אותך!</span>
      </div>
      <p className="pending-offer-desc">
        {post.claimed_by_host_name ? `מארח: ${post.claimed_by_host_name}` : 'מארח מקהילת האפליקציה'}
        {post.claimed_by_host_city ? ` מתגורר ב${post.claimed_by_host_city}` : ''}
      </p>
      <div className="pending-offer-actions">
        <button
          onClick={() => handleGuestRespond('matched')}
          disabled={isSubmitting}
          className="pending-offer-accept-btn"
          style={{ opacity: isSubmitting && respondingAction !== 'matched' ? 0.6 : 1 }}
        >
          {respondingAction === 'matched' ? <Loader2 size={16} className="spin-icon" /> : <Check size={16} />}
          <span>סבבה מעולה</span>
        </button>
        <button
          onClick={() => handleGuestRespond('rejected')}
          disabled={isSubmitting}
          className="pending-offer-decline-btn"
          style={{ opacity: isSubmitting && respondingAction !== 'rejected' ? 0.6 : 1 }}
        >
          {respondingAction === 'rejected' ? <Loader2 size={16} className="spin-icon" /> : <X size={16} />}
          <span>לא מתאים לי</span>
        </button>
      </div>
    </div>
  );
}
