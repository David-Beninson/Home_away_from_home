import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { reviewsApi } from '../../api/api';
import './Reviews.css';

const PendingReviewModal = ({ pendingReview, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [isSevere, setIsSevere] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!pendingReview) return null;

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('נא לספק דירוג בין 1 ל-5 כוכבים.');
      return;
    }
    if (!content.trim()) {
      setError('נא לספק תוכן לביקורת.');
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
      setError('שגיאה בשליחת הביקורת, אנא נסה שנית.');
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
            <h3>שתף/י את החוויה שלך</h3>
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
            האירוח לשבת הסתיים. נשמח אם תשתפו את החוויה כדי לעזור לקהילה שלנו!
          </p>
          
          {error && <div className="review-error">{error}</div>}

          <div className="review-form">
            <div className="review-rating-group">
              <label>דירוג (חובה)</label>
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
              <label>איך היה האירוח?</label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="ספר/י לנו..."
                required
              />
            </div>

            <label className="severe-flag-label">
              <input
                type="checkbox"
                checked={isSevere}
                onChange={(e) => setIsSevere(e.target.checked)}
              />
              <span className="text-red">דווח על בעיית בטיחות או התנהגות חמורה (התרעה מיידית למנהלים)</span>
            </label>
          </div>
        </div>

        <div className="chat-modal-footer">
          <button onClick={onClose} className="chat-modal-btn-close" disabled={loading}>
            הזכר לי מאוחר יותר
          </button>
          <button 
            onClick={handleSubmit} 
            className="review-submit-btn"
            disabled={loading}
          >
            {loading ? 'שולח...' : 'שלח ביקורת'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingReviewModal;
