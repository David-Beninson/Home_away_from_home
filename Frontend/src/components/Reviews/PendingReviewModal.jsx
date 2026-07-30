import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { reviewsApi } from '../../api/api';
import { useTranslation } from 'react-i18next';
import './Reviews.css';

const PendingReviewModal = ({ pendingReview, onClose, onSuccess }) => {
  const { t } = useTranslation(['common/reviews']);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [isSevere, setIsSevere] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!pendingReview) return null;

  const handleSubmit = async () => {
    if (rating < 1) {
      setError(t('common/reviews:pending.error_rating'));
      return;
    }
    if (!content.trim()) {
      setError(t('common/reviews:pending.error_content'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await reviewsApi.createReview({
        match_id: pendingReview.match_id,
        reviewee_id: pendingReview.reviewee_id,
        rating,
        content,
        is_severe_flag: isSevere
      });
      onSuccess();
    } catch (err) {
      setError(t('common/reviews:pending.error_submit'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal-card review-modal-card" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="chat-modal-header">
          <div className="chat-modal-title">
            <Star size={20} className="chat-modal-icon text-amber" />
            <h3>{t('common/reviews:pending.title')}</h3>
          </div>
          <button 
            type="button" 
            className="chat-modal-close" 
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="chat-modal-body">
          <p className="review-intro">
            {t('common/reviews:pending.intro')}
          </p>
          
          {error && <div className="review-error">{error}</div>}

          <div className="review-form">
            <div className="review-rating-group">
              <label>{t('common/reviews:pending.rating_label')}</label>
              <div className="stars-container">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="star-btn"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star 
                      size={32} 
                      className={`star-icon-fill ${(hoverRating || rating) >= star ? 'filled' : ''}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="review-content-group">
              <label>{t('common/reviews:pending.content_label')}</label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('common/reviews:pending.content_placeholder')}
                required
              />
            </div>

            <label className="severe-flag-label">
              <input
                type="checkbox"
                checked={isSevere}
                onChange={(e) => setIsSevere(e.target.checked)}
              />
              <span className="text-red">{t('common/reviews:pending.severe_label')}</span>
            </label>
          </div>
        </div>

        <div className="chat-modal-footer">
          <button onClick={onClose} className="chat-modal-btn-close" disabled={loading}>
            {t('common/reviews:pending.btn_later')}
          </button>
          <button 
            onClick={handleSubmit} 
            className="review-submit-btn"
            disabled={loading}
          >
            {loading ? t('common/reviews:pending.btn_submitting') : t('common/reviews:pending.btn_submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingReviewModal;
