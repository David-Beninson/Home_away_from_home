import { useEffect, useMemo } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCurrentUser, logout } from '../store/authSlice'
import Layout from '../components/Common/Layout/Layout'
import HomeGuest from '../pages/Home/HomeGuest/HomeGuest'
import HomeHost from '../pages/Home/HomeHost/HomeHost'
import FindHost from '../pages/FindHost/FindHost'
import HostDetails from '../pages/HostDetails/HostDetails'
import MyRequests from '../pages/MyRequests/MyRequests'
import RequestsBoard from '../pages/RequestsBoard/RequestsBoard'
import ProfilePage from '../pages/Profile/Profile'
import ChatsPage from '../pages/Chats/Chats'
import NotFound from '../pages/NotFound/NotFound'
import ProfileQuestionnaire from "../pages/Profile/ProfileQuestionnaire";
import Banned from '../pages/Banned/Banned'

// Auth Views
import Login from '../pages/Login/Login'
import Register from '../pages/Register/Register'

// Admin Views
import AdminLayout from '../pages/Admin/Admin'
import AdminDashboard from '../components/Admin/AdminDashboard'
import AdminUsers from '../components/Admin/AdminUsers'
import AdminVerificationRequests from '../components/Admin/AdminVerificationRequests'
import AdminBookings from '../components/Admin/AdminBookings'
import AdminListings from '../components/Admin/AdminListings'
import AdminAlerts from '../components/Admin/AdminAlerts'

import ProtectedRoute from '../components/Common/ProtectedRoute'
import Loading from '../components/Common/Loading/Loading'

export function useAppLogic() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const loadingAuth = useSelector((state) => state.auth.loading);
  const userRole = user?.user_type || null;
  const isBanned = user?.account_status === 'Banned';

  // Determine whether the current user still needs to complete a core profile field
  // Requirement: only hosts must fill residential_address before using the app
  const needsProfile = Boolean(
    user && userRole === 'host' && (!user.profile || !user.profile.residential_address || user.profile.residential_address.trim() === '')
  );

  // hasProfile kept for backwards compatibility where needed (inverse of needsProfile for hosts)
  const hasProfile = user ? !needsProfile : false;

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    const handleLogout = () => {
      dispatch(logout());
    };
    const handleForbidden = () => {
      dispatch(fetchCurrentUser());
    };
    window.addEventListener('auth-logout', handleLogout);
    window.addEventListener('auth-forbidden', handleForbidden);
    return () => {
      window.removeEventListener('auth-logout', handleLogout);
      window.removeEventListener('auth-forbidden', handleForbidden);
    };
  }, [dispatch]);

  // Memoize router configuration to prevent unnecessary recreations
  const router = useMemo(() => {
    return createBrowserRouter([
      {
        path: '/banned',
        element: isBanned ? <Banned /> : <Navigate to="/" replace />
      },
      {
        path: '/',
        element: isBanned ? <Navigate to="/banned" replace /> : <Layout />,
        errorElement: <NotFound />,
        children: [
          {
            index: true,
            // If logged in but profile is missing, show questionnaire overlay for hosts
            element: userRole === 'admin'
              ? <Navigate to="/admin" replace />
              : (userRole === 'host' && needsProfile)
                ? <>
                  <HomeHost />
                  <ProfileQuestionnaire />
                </>
                : userRole === 'guest'
                  ? <HomeGuest />
                  : userRole === 'host'
                    ? <HomeHost />
                    : <NotFound />
          },
          {
            path: 'profile',
            element: (
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            )
          },
          {
            path: 'complete-profile',
            element: (
              <ProtectedRoute>
                {/* If profile is already complete, don't let them back in here */}
                {hasProfile ? <Navigate to="/" replace /> : <ProfileQuestionnaire />}
              </ProtectedRoute>
            )
          },
          // Guest Protected Routes
          {
            path: 'find-host',
            element: (
              <ProtectedRoute allowedRoles={['guest']}>
                <FindHost />
              </ProtectedRoute>
            )
          },
          {
            path: 'find-host/:id',
            element: (
              <ProtectedRoute allowedRoles={['guest']}>
                <HostDetails />
              </ProtectedRoute>
            )
          },
          {
            path: 'host/:id',
            element: (
              <ProtectedRoute allowedRoles={['guest']}>
                <HostDetails />
              </ProtectedRoute>
            )
          },
          {
            path: 'my-requests',
            element: (
              <ProtectedRoute allowedRoles={['guest']}>
                <MyRequests />
              </ProtectedRoute>
            )
          },
          // Host Protected Routes
          {
            path: 'requests-board',
            element: (
              <ProtectedRoute allowedRoles={['host']}>
                <RequestsBoard />
              </ProtectedRoute>
            )
          },
          // Shared Protected Routes
          {
            path: 'chats',
            element: (
              <ProtectedRoute allowedRoles={['guest', 'host']}>
                <ChatsPage />
              </ProtectedRoute>
            )
          },
          // Admin Protected Routes
          {
            path: 'admin',
            element: (
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <AdminDashboard /> },
              { path: 'users', element: <AdminUsers /> },
              { path: 'verifications', element: <AdminVerificationRequests /> },
              { path: 'bookings', element: <AdminBookings /> },
              { path: 'listings', element: <AdminListings /> },
              { path: 'alerts', element: <AdminAlerts /> }
            ]
          }
        ]
      },
      {
        path: '/login',
        element: loadingAuth ? (
          <Loading />
        ) : userRole ? (
          <Navigate to="/" replace />
        ) : (
          <Login />
        )
      },
      {
        path: '/register',
        element: loadingAuth ? (
          <Loading />
        ) : userRole ? (
          <Navigate to="/" replace />
        ) : (
          <Register />
        )
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]);
  }, [userRole, loadingAuth, hasProfile, isBanned]);

  return { router };
}