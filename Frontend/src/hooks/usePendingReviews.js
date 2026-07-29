import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { reviewsApi } from '../api/api';

export function usePendingReviews() {
  const user = useSelector((state) => state.auth.user);
  const [pendingReview, setPendingReview] = useState(null);

  useEffect(() => {
    // Only fetch for authenticated non-admin users
    if (!user || user.user_type === 'admin') return;

    const checkPendingReviews = async () => {
      try {
        const response = await reviewsApi.getPending();
        if (response.data && response.data.length > 0) {
          // Just show the first pending review for simplicity
          setPendingReview(response.data[0]);
        } else {
          setPendingReview(null);
        }
      } catch (error) {
        console.error("Failed to fetch pending reviews", error);
      }
    };

    checkPendingReviews();
  }, [user]);

  const clearPendingReview = () => {
    setPendingReview(null);
  };

  return { pendingReview, clearPendingReview };
}
