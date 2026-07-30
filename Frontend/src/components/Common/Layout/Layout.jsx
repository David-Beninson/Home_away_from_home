import { Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../Navbar/Navbar';
import Loading from '../Loading/Loading';
import SuspendedOverlay from '../SuspendedOverlay/SuspendedOverlay';
import ProfileQuestionnaire from '../../../pages/Profile/ProfileQuestionnaire';
import { useGlobalWebSocket } from '../../../hooks/useGlobalWebSocket';
import { usePendingReviews } from '../../../hooks/usePendingReviews';
import PendingReviewModal from '../../Reviews/PendingReviewModal';
import './Layout.css';

export default function Layout() {
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);
  const userRole = user?.user_type || null;

  // Initialize the global WebSocket connection and fetch badge count
  useGlobalWebSocket(userRole);

  const { pendingReview, clearPendingReview } = usePendingReviews();

  // If authentication state is still loading, show loading indicator instead of redirecting prematurely
  if (loading) {
    return <Loading />;
  }

  // Guard clause: If auth check completed and there's no user logged in, send them to the login page
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  const isApproved = userRole === 'admin' || user?.verification_status === 'approved';
  const isAccountSuspended = user?.account_status && String(user.account_status).toLowerCase() === 'suspended';

  // Strict UI Lockout
  if (!isApproved || isAccountSuspended) {
    return <SuspendedOverlay />;
  }

  // Do not show the questionnaire to admins
  // Also respect a per-user localStorage fallback when backend hasn't persisted the flag yet
  const userId = user?.id || user?.user_id;
  const localAnswered = userId && localStorage.getItem(`questionnaire_answered_${userId}`) === 'true';
  // שולף את הערך גם אם הוא תחת profile וגם אם הוא ישירות על ה-user
  const profileFlag = user?.profile?.questionnaire_answered ?? user?.questionnaire_answered;

  // בודקים אם הוא מילא את השאלון (true). כל ערך אחר (false, null, undefined) אומר שהוא עדיין לא מילא.
  const isAnswered = profileFlag === true || profileFlag === 'true' || profileFlag === 1 || profileFlag === '1';

  const showQuestionnaire = Boolean(user && userRole !== 'admin' && !isAnswered && !localAnswered);
  // If questionnaire must be answered, render ONLY the questionnaire (no navbar, no content underneath)
  if (showQuestionnaire) {
    return (
      <div className="layout-container">
        <ProfileQuestionnaire />
      </div>
    );
  }

  return (
    <div className="layout-container">
      {/* The Navbar stays fixed at the top */}
      <header>
        <Navbar />
      </header>

      {/* Whichever child page is active gets rendered right here */}
      <main className="layout-content">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Global pending review modal */}
      {pendingReview && (
        <PendingReviewModal
          pendingReview={pendingReview}
          onClose={clearPendingReview}
          onSuccess={clearPendingReview}
        />
      )}
    </div>
  );
}
