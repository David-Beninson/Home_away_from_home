import { useState, useEffect } from 'react';
import { adminApi } from '../../api/api';
import { LockIcon, UnlockIcon, CheckCircleIcon, TrashIcon, ChevronLeftIcon } from '../Common/Icons';
import PageContainer from '../Common/PageContainer/PageContainer';
import Table from '../Common/Table/Table';
import { formatPhoneNumber } from '../../utils/phone';
import { AdminSupportChatModal } from './AdminSupportChatModal';
import { useTranslation } from 'react-i18next';
import '../../pages/Admin/Admin.css';

export default function AdminUsers() {
  const { t } = useTranslation(['admin/users']);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookingsData, setUserBookingsData] = useState({ matches: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Support Chat State
  const [supportChatUser, setSupportChatUser] = useState(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', user: null, reason: '' });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [usersRes, bookingsRes] = await Promise.all([
          adminApi.getUsers(),
          adminApi.getBookings()
        ]);
        setUsers(usersRes.data);
        setUserBookingsData(bookingsRes.data || { matches: [], posts: [] });
      } catch (err) {
        console.error('Failed to fetch admin users data:', err);
        setError(t('admin/users:messages.error_loading'));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const executeUpdateStatus = async (userId, newStatus, reason = null) => {
    try {
      setError('');
      setSuccessMsg('');
      const response = await adminApi.updateUserStatus(userId, newStatus, reason);
      const updatedUser = response.data;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, account_status: updatedUser.account_status } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => ({ ...prev, account_status: updatedUser.account_status }));
      }

      const successStatus = newStatus === 'active' ? t('admin/users:messages.success_active') 
                          : newStatus === 'suspended' ? t('admin/users:messages.success_suspended') 
                          : t('admin/users:messages.success_banned');
      setSuccessMsg(successStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(t('admin/users:messages.error_status_update'));
    } finally {
      setConfirmModal({ isOpen: false, type: '', user: null, reason: '' });
    }
  };

  const handleStatusChangeClick = (user, newStatus) => {
    if (newStatus === 'active') {
      executeUpdateStatus(user.id, 'active');
    } else {
      setConfirmModal({ isOpen: true, type: newStatus, user, reason: '' });
    }
  };

  const executeDeleteUser = async (userId) => {
    try {
      setError('');
      setSuccessMsg('');
      await adminApi.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(null);
      }
      setSuccessMsg(t('admin/users:messages.success_delete'));
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(t('admin/users:messages.error_delete'));
    } finally {
      setConfirmModal({ isOpen: false, type: '', user: null });
    }
  };

  const handleVerifySoldier = async (userId, currentStatus) => {
    try {
      setError('');
      setSuccessMsg('');
      const targetState = !currentStatus;
      const response = await adminApi.verifyGuest(userId, targetState);
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_soldier_or_national_service: response.data.is_soldier_or_national_service } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => ({ ...prev, is_soldier_or_national_service: response.data.is_soldier_or_national_service }));
      }
      setSuccessMsg(targetState ? t('admin/users:messages.success_verify') : t('admin/users:messages.success_unverify'));
    } catch (err) {
      console.error('Failed to verify guest:', err);
      setError(t('admin/users:messages.error_verify'));
    }
  };

  // Helper for initial circle avatar
  const getUserInitial = (name) => {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
  };

  // Filter Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone_number?.includes(searchTerm);
    
    const matchesRole = roleFilter === 'all' || user.user_type === roleFilter;
    
    // Normalize user account status to handle uppercase "Suspended" from backend just in case
    const userStatus = user.account_status ? String(user.account_status).toLowerCase() : 'active';
    const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalHostsCount = users.filter(u => u.user_type === 'host').length;
  const totalGuestsCount = users.filter(u => u.user_type === 'guest').length;
  const totalSuspendedCount = users.filter(u => u.account_status && String(u.account_status).toLowerCase() === 'suspended').length;
  const totalBannedCount = users.filter(u => u.account_status && String(u.account_status).toLowerCase() === 'banned').length;

  const userPosts = selectedUser 
    ? userBookingsData.posts.filter(p => p.guest_name === selectedUser.full_name || p.guest_profile_id === selectedUser.id)
    : [];

  const userMatches = selectedUser
    ? userBookingsData.matches.filter(m => m.guest_name === selectedUser.full_name || m.host_name === selectedUser.full_name)
    : [];

  return (
    <PageContainer loading={loading} error={error} successMsg={successMsg}>
      {/* ---------------------------------------------------- */}
      {/* VIEW 1: ELEGANT MASTER USERS TABLE                   */}
      {/* ---------------------------------------------------- */}
      {!selectedUser ? (
        <>
          <div className="admin-page-header flex-between">
            <div>
              <h2 className="admin-page-title">{t('admin/users:title')}</h2>
              <p className="admin-page-subtitle">{t('admin/users:subtitle')}</p>
            </div>

            {/* Quick Stat Chips */}
            <div className="admin-stats-chips">
              <span className="stat-chip">{t('admin/users:stats.total')}: <strong>{users.length}</strong></span>
              <span className="stat-chip host">{t('admin/users:stats.hosts')}: <strong>{totalHostsCount}</strong></span>
              <span className="stat-chip guest">{t('admin/users:stats.guests')}: <strong>{totalGuestsCount}</strong></span>
              <span className="stat-chip suspended" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>{t('admin/users:stats.suspended')}: <strong>{totalSuspendedCount}</strong></span>
              <span className="stat-chip banned" style={{ backgroundColor: '#f8d7da', color: '#721c24' }}>{t('admin/users:stats.banned')}: <strong>{totalBannedCount}</strong></span>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="search-filter-bar">
            <input 
              type="text" 
              placeholder={t('admin/users:filters.search_placeholder')}
              className="admin-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="admin-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">{t('admin/users:filters.all_roles')}</option>
              <option value="host">{t('admin/users:filters.role_host')}</option>
              <option value="guest">{t('admin/users:filters.role_guest')}</option>
              <option value="admin">{t('admin/users:filters.role_admin')}</option>
            </select>
            <select 
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('admin/users:filters.all_statuses')}</option>
              <option value="active">{t('admin/users:filters.status_active')}</option>
              <option value="suspended">{t('admin/users:filters.status_suspended')}</option>
              <option value="banned">{t('admin/users:filters.status_banned')}</option>
            </select>
          </div>

          {/* Interactive Modern Table */}
          <Table 
            headers={t('admin/users:table.headers', { returnObjects: true })}
            dataLength={filteredUsers.length}
            fallbackText={t('admin/users:table.fallback')}
          >
            {filteredUsers.map(user => (
              <tr 
                key={user.id} 
                className="interactive-user-row" 
                onClick={() => setSelectedUser(user)}
              >
                {/* User Column with Avatar + Full Name + Email */}
                <td>
                  <div className="user-cell-wrapper">
                    <div className={`user-avatar-circle ${user.user_type}`}>
                      {getUserInitial(user.full_name)}
                    </div>
                    <div className="user-cell-info">
                      <span className="user-name-title">{user.full_name}</span>
                      <span className="user-email-subtitle">{user.email}</span>
                    </div>
                  </div>
                </td>

                {/* Role Column */}
                <td>
                  <span className={`badge ${user.user_type}`}>
                    {user.user_type === 'host' ? t('admin/users:roles.host') : user.user_type === 'guest' ? t('admin/users:roles.guest') : t('admin/users:roles.admin')}
                  </span>
                </td>

                {/* Status Column */}
                <td>
                  <span className={`badge ${user.account_status === 'active' ? 'active' : user.account_status === 'suspended' ? 'suspended' : 'danger'}`}>
                    {user.account_status === 'active' ? t('admin/users:statuses.active') : user.account_status === 'suspended' ? t('admin/users:statuses.suspended') : t('admin/users:statuses.banned')}
                  </span>
                </td>

                {/* Action Column with Hover Button & Arrow */}
                <td>
                  <div className="user-view-btn-wrapper">
                    <span className="btn-view-user">
                      <span>{t('admin/users:table.view_details')}</span>
                      <ChevronLeftIcon className="arrow-icon-animated" />
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </>
      ) : (
        /* ---------------------------------------------------- */
        /* VIEW 2: USER DETAILS & ADMIN ACTIONS                 */
        /* ---------------------------------------------------- */
        <div className="admin-user-detail-view">
          {/* Back Navigation Bar */}
          <button className="btn-back" onClick={() => setSelectedUser(null)}>
            ← {t('admin/users:details.back_to_list')}
          </button>

          {/* Header Card: User Name + Role + Top Action Buttons */}
          <div className="admin-user-detail-header">
            <div className="user-title-group">
              <div className={`user-avatar-circle large ${selectedUser.user_type}`}>
                {getUserInitial(selectedUser.full_name)}
              </div>
              <div>
                <h2 className="admin-user-name">{selectedUser.full_name}</h2>
                <div className="flex-align-center gap-8 margin-top-4">
                  <span className={`badge ${selectedUser.user_type}`}>
                    {selectedUser.user_type === 'host' ? t('admin/users:roles.host') : selectedUser.user_type === 'guest' ? t('admin/users:roles.guest') : t('admin/users:roles.admin')}
                  </span>
                  <span className={`badge ${selectedUser.account_status === 'active' ? 'active' : selectedUser.account_status === 'suspended' ? 'suspended' : 'danger'}`}>
                    {selectedUser.account_status === 'active' ? t('admin/users:statuses.active') : selectedUser.account_status === 'suspended' ? t('admin/users:statuses.suspended') : t('admin/users:statuses.banned')}
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-detail-actions">
              {/* Support Chat Button */}
              <button 
                onClick={() => setSupportChatUser(selectedUser)}
                className="btn-admin-action btn-activate"
                style={{ backgroundColor: '#17a2b8' }}
              >
                <span>💬</span>
                <span>{t('admin/users:details.actions.support_chat')}</span>
              </button>

              {/* Activate Button */}
              {selectedUser.account_status !== 'active' && (
                <button 
                  onClick={() => handleStatusChangeClick(selectedUser, 'active')}
                  className="btn-admin-action btn-activate"
                >
                  <UnlockIcon />
                  <span>{t('admin/users:details.actions.activate')}</span>
                </button>
              )}

              {/* Suspend Button */}
              {selectedUser.account_status !== 'suspended' && (
                <button 
                  onClick={() => handleStatusChangeClick(selectedUser, 'suspended')}
                  className="btn-admin-action btn-suspend"
                >
                  <LockIcon />
                  <span>{t('admin/users:details.actions.suspend')}</span>
                </button>
              )}

              {/* Ban Button */}
              {selectedUser.account_status !== 'banned' && (
                <button 
                  onClick={() => handleStatusChangeClick(selectedUser, 'banned')}
                  className="btn-admin-action btn-delete"
                >
                  <LockIcon />
                  <span>{t('admin/users:details.actions.ban')}</span>
                </button>
              )}

              {/* Delete User Button */}
              <button 
                onClick={() => setConfirmModal({ isOpen: true, type: 'delete', user: selectedUser })}
                className="btn-admin-action btn-delete"
              >
                <TrashIcon />
                <span>{t('admin/users:details.actions.delete')}</span>
              </button>
            </div>
          </div>

          {/* Full User Details Grid */}
          <div className="admin-card margin-bottom-20">
            <div className="user-info-grid">
              <div className="info-item">
                <span className="info-label">{t('admin/users:details.info.email')}</span>
                <span className="info-value">{selectedUser.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t('admin/users:details.info.phone')}</span>
                <span className="info-value ltr-column">{formatPhoneNumber(selectedUser.phone_number)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t('admin/users:details.info.registered')}</span>
                <span className="info-value">
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('he-IL') : t('admin/users:details.info.not_specified')}
                </span>
              </div>
              {selectedUser.user_type === 'guest' && (
                <div className="info-item">
                  <span className="info-label">{t('admin/users:details.info.soldier_verification')}</span>
                  <div className="flex-align-center">
                    <span className={`badge ${selectedUser.is_soldier_or_national_service ? 'verified' : 'pending'}`}>
                      {selectedUser.is_soldier_or_national_service ? t('admin/users:details.info.verified_soldier') : t('admin/users:details.info.not_verified')}
                    </span>
                    <button 
                      onClick={() => handleVerifySoldier(selectedUser.id, selectedUser.is_soldier_or_national_service)}
                      className="btn-action verify-soldier margin-right-8"
                      title={t('admin/users:details.info.change_verification')}
                    >
                      <CheckCircleIcon />
                    </button>
                  </div>
                </div>
              )}
              {selectedUser.biography && (
                <div className="info-item full-width">
                  <span className="info-label">{t('admin/users:details.info.biography')}</span>
                  <span className="info-value">{selectedUser.biography}</span>
                </div>
              )}
            </div>
          </div>

          {/* User Posts / Requests Table */}
          <div className="admin-card margin-bottom-20">
            <div className="admin-card-header">
              <h3 className="admin-card-title">{t('admin/users:details.posts.title')}</h3>
            </div>
            {userPosts.length > 0 ? (
              <Table 
                headers={t('admin/users:details.posts.headers', { returnObjects: true })}
                dataLength={userPosts.length}
              >
                {userPosts.map(post => (
                  <tr key={post.id}>
                    <td>{new Date(post.requested_date).toLocaleDateString('he-IL')}</td>
                    <td className="truncate-cell">{post.description}</td>
                    <td>{post.guests_count}</td>
                    <td>
                      <span className={`badge ${post.status === 'open' ? 'active' : 'verified'}`}>
                        {post.status === 'open' ? t('admin/users:details.posts.status_open') : t('admin/users:details.posts.status_matched')}
                      </span>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <div className="admin-table-fallback">{t('admin/users:details.posts.fallback')}</div>
            )}
          </div>

          {/* User Matches & Reviews Table */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">{t('admin/users:details.matches.title')}</h3>
            </div>
            {userMatches.length > 0 ? (
              <Table 
                headers={t('admin/users:details.matches.headers', { returnObjects: true })}
                dataLength={userMatches.length}
              >
                {userMatches.map(match => (
                  <tr key={match.id}>
                    <td>{match.guest_name}</td>
                    <td>{match.host_name}</td>
                    <td>{new Date(match.requested_date || match.created_at).toLocaleDateString('he-IL')}</td>
                    <td>
                      <span className="badge verified">{match.status}</span>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <div className="admin-table-fallback">{t('admin/users:details.matches.fallback')}</div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CONFIRMATION MODAL OVERLAY                           */}
      {/* ---------------------------------------------------- */}
      {confirmModal.isOpen && (
        <div className="modal-backdrop" onClick={() => setConfirmModal({ isOpen: false, type: '', user: null, reason: '' })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {confirmModal.type === 'suspended' ? t('admin/users:modals.suspend.title') : 
               confirmModal.type === 'banned' ? t('admin/users:modals.ban.title') : t('admin/users:modals.delete.title')}
            </h3>
            <p className="modal-body">
              {confirmModal.type === 'suspended' ? t('admin/users:modals.suspend.body', { name: confirmModal.user?.full_name })
              : confirmModal.type === 'banned' ? t('admin/users:modals.ban.body', { name: confirmModal.user?.full_name })
              : t('admin/users:modals.delete.body', { name: confirmModal.user?.full_name })}
            </p>

            {(confirmModal.type === 'suspended' || confirmModal.type === 'banned') && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>{t('admin/users:modals.reason_label')}</label>
                <textarea
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '5px', border: '1px solid #ddd' }}
                  rows={3}
                  placeholder={t('admin/users:modals.reason_placeholder')}
                  value={confirmModal.reason}
                  onChange={(e) => setConfirmModal({ ...confirmModal, reason: e.target.value })}
                />
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button 
                className={`btn-modal-confirm ${confirmModal.type === 'delete' || confirmModal.type === 'banned' ? 'danger' : 'warning'}`}
                onClick={() => {
                  if (confirmModal.type === 'suspended') {
                    executeUpdateStatus(confirmModal.user.id, 'suspended', confirmModal.reason);
                  } else if (confirmModal.type === 'banned') {
                    executeUpdateStatus(confirmModal.user.id, 'banned', confirmModal.reason);
                  } else {
                    executeDeleteUser(confirmModal.user.id);
                  }
                }}
                disabled={(confirmModal.type === 'suspended' || confirmModal.type === 'banned') && !confirmModal.reason.trim()}
              >
                {confirmModal.type === 'suspended' ? t('admin/users:modals.suspend.confirm') : confirmModal.type === 'banned' ? t('admin/users:modals.ban.confirm') : t('admin/users:modals.delete.confirm')}
              </button>
              <button 
                className="btn-modal-cancel"
                onClick={() => setConfirmModal({ isOpen: false, type: '', user: null, reason: '' })}
              >
                {t('admin/users:modals.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Chat Modal */}
      {supportChatUser && (
        <AdminSupportChatModal
          targetUserId={supportChatUser.id}
          targetUserName={supportChatUser.full_name}
          onClose={() => setSupportChatUser(null)}
        />
      )}
    </PageContainer>
  );
}
