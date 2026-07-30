import React, { useState, useEffect } from 'react';
import { X, Star, Loader2 } from 'lucide-react';
import { reviewsApi } from '../../api/api';
import { useTranslation } from 'react-i18next';
import './Reviews.css';

const ReviewsListModal = ({ open, onClose, targetType, targetId, title }) => {
  const { t } = useTranslation(['common/reviews']);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!open || !targetId) return;
      setLoading(true);
      setError(null);
      try {
        let res;
        if (targetType === 'host') {
          res = await reviewsApi.getHostReviews(targetId);
        } else if (targetType === 'guest') {
          res = await reviewsApi.getGuestReviews(targetId);
        } else if (targetType === 'match') {
          res = await reviewsApi.getMatchReviews(targetId);
        }
        setReviews(res?.data || []);
      } catch (err) {
        setError(t('common/reviews:list.error_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [open, targetId, targetType]);

  if (!open) return null;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal-card review-list-modal-card" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="chat-modal-header">
          <div className="chat-modal-title">
            <Star size={20} className="chat-modal-icon text-amber" />
            <h3>{title || t('common/reviews:list.title_default')}</h3>
          </div>
          <button 
            type="button" 
            className="chat-modal-close" 
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="chat-modal-body reviews-list-container">
          {loading ? (
            <div className="reviews-loading">
              <Loader2 className="spin-icon" size={24} />
              <span>{t('common/reviews:list.loading')}</span>
            </div>
          ) : error ? (
            <div className="review-error">{error}</div>
          ) : reviews.length === 0 ? (
            <div className="no-reviews">{t('common/reviews:list.no_reviews')}</div>
          ) : (
            <div className="reviews-list">
              {reviews.map((review, idx) => (
                <div key={review.id || idx} className="review-item">
                  <div className="review-header">
                    <span className="reviewer-name">{review.reviewer_name || t('common/reviews:list.anon_name')}</span>
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={14} 
                          className={`star-icon-fill ${review.rating >= star ? 'filled' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="review-content">{review.content}</p>
                  <span className="review-date">
                    {new Date(review.created_at).toLocaleDateString('he-IL')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="chat-modal-footer">
          <button onClick={onClose} className="chat-modal-btn-close">
            {t('common/reviews:list.btn_close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewsListModal;
