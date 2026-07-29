import React, { useState, useEffect } from 'react';
import { X, Star, Loader2 } from 'lucide-react';
import { reviewsApi } from '../../api/api';
import './Reviews.css';

const ReviewsListModal = ({ open, onClose, targetType, targetId, title }) => {
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
        setError('שגיאה בטעינת הביקורות.');
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
            <h3>{title || 'ביקורות'}</h3>
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
              <span>טוען ביקורות...</span>
            </div>
          ) : error ? (
            <div className="review-error">{error}</div>
          ) : reviews.length === 0 ? (
            <div className="no-reviews">אין עדיין ביקורות להצגה.</div>
          ) : (
            <div className="reviews-list">
              {reviews.map((review, idx) => (
                <div key={review.id || idx} className="review-item">
                  <div className="review-header">
                    <span className="reviewer-name">{review.reviewer_name || 'אנונימי'}</span>
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
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewsListModal;
