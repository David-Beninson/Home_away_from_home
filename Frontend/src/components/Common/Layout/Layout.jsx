import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../Navbar/Navbar';
import Loading from '../Loading/Loading';
import SuspendedOverlay from '../SuspendedOverlay/SuspendedOverlay';
import { useGlobalWebSocket } from '../../../hooks/useGlobalWebSocket';
import './Layout.css';

export default function Layout() {
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);
  const userRole = user?.user_type || null;

  // Initialize the global WebSocket connection and fetch badge count
  useGlobalWebSocket(userRole);

  // If authentication state is still loading, show loading indicator instead of redirecting prematurely
  if (loading) {
    return <Loading />;
  }

  // Guard clause: If auth check completed and there's no user logged in, send them to the login page
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  const isApproved = userRole === 'admin' || user?.verification_status === 'approved';

  return (
    <div className="layout-container">
      {/* If not approved, show the locked suspended/verification overlay */}
      {!isApproved && <SuspendedOverlay />}

      {/* The Navbar stays fixed at the top */}
      <header>
        <Navbar />
      </header>
      
      {/* Whichever child page is active gets rendered right here */}
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  );
}
