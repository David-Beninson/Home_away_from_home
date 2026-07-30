import React from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';

const Banned = () => {
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1 style={{ color: '#dc3545', marginBottom: '1rem' }}>Access Denied</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        Your account has been permanently banned from the platform.
      </p>
      <button 
        onClick={handleLogout}
        style={{
          padding: '0.8rem 2rem',
          backgroundColor: '#0d6efd',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Banned;
