import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { reviewsApi } from '../api/api';

export function usePendingReviews() {
  const user = useSelector((state) => state.auth.user);
  const [pendingReview, setPendingReview] = useState(null);

  useEffect(() => {
    // Only fetch for authenticated non-admin users, and not suspended
    const accountStatus = user?.account_status?.toLowerCase();
    if (!user || user.user_type === 'admin' || accountStatus === 'suspended' || accountStatus === 'banned') return;

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
        if (!error.isForbidden) {
          console.error("Failed to fetch pending reviews", error);
        }
      }
    };

    checkPendingReviews();
  }, [user]);

  const clearPendingReview = () => {
    setPendingReview(null);
  };

  return { pendingReview, clearPendingReview };
}
