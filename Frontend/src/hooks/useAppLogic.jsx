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

// Auth Views
import Login from '../pages/Login/Login'
import Register from '../pages/Register/Register'

// Admin Views
import AdminLayout from '../pages/Admin/Admin'
import AdminDashboard from '../components/Admin/AdminDashboard'
import AdminUsers from '../components/Admin/AdminUsers'
import AdminBookings from '../components/Admin/AdminBookings'
import AdminListings from '../components/Admin/AdminListings'

import ProtectedRoute from '../components/Common/ProtectedRoute'
import Loading from '../components/Common/Loading/Loading'

export function useAppLogic() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const loadingAuth = useSelector((state) => state.auth.loading);
  const userRole = user?.user_type || null;

  // Check if the user has completed their profile data
  // Check if the user has actually filled out their core profile fields
  // Check if the user has actually filled out their core profile fields based on the NEW field names
  const hasProfile = Boolean(
    user?.profile && (
      (userRole === 'host' && user.profile.residential_address && user.profile.residential_address.trim() !== '') ||
      (userRole === 'guest' && user.profile.guest_address && user.profile.guest_address.trim() !== '')
    )
  );

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    const handleLogout = () => {
      dispatch(logout());
    };
    window.addEventListener('auth-logout', handleLogout);
    return () => {
      window.removeEventListener('auth-logout', handleLogout);
    };
  }, [dispatch]);

  // Memoize router configuration to prevent unnecessary recreations
  const router = useMemo(() => {
    return createBrowserRouter([
      {
        path: '/',
        element: <Layout />,
        errorElement: <NotFound />,
        children: [
          {
            index: true,
            // If logged in but profile is missing, force them to questionnaire!
            element: userRole === 'admin'
              ? <Navigate to="/admin" replace />
              : !hasProfile
                ? <Navigate to="/complete-profile" replace />
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
              { path: 'bookings', element: <AdminBookings /> },
              { path: 'listings', element: <AdminListings /> }
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
  }, [userRole, loadingAuth, hasProfile]);

  return { router };
}