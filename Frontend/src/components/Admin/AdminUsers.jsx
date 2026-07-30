import { useState, useEffect } from 'react';
import { adminApi } from '../../api/api';
import { LockIcon, UnlockIcon, CheckCircleIcon, TrashIcon, ChevronLeftIcon } from '../Common/Icons';
import PageContainer from '../Common/PageContainer/PageContainer';
import Table from '../Common/Table/Table';
import { formatPhoneNumber } from '../../utils/phone';
import { AdminSupportChatModal } from './AdminSupportChatModal';
import '../../pages/Admin/Admin.css';

export default function AdminUsers() {
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
        setError('שגיאה בטעינת נתוני משתמשים מהשרת.');
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

      setSuccessMsg(`המשתמש עודכן לסטטוס: ${newStatus === 'active' ? 'פעיל' : newStatus === 'suspended' ? 'מושעה' : 'חסום לצמיתות'}`);
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('עדכון סטטוס המשתמש נכשל.');
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
      setSuccessMsg('המשתמש נמחק בהצלחה מהמערכת.');
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('מחיקת המשתמש נכשלה.');
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
      setSuccessMsg(targetState ? 'אימות חייל/שירות לאומי עודכן בהצלחה.' : 'ביטול אימות בוצע בהצלחה.');
    } catch (err) {
      console.error('Failed to verify guest:', err);
      setError('פעולת האימות נכשלה.');
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
              <h2 className="admin-page-title">ניהול משתמשים</h2>
              <p className="admin-page-subtitle">לחץ על שורה בטבלה לצפייה בתיק משתמש מפורט וביצוע פעולות ניהול</p>
            </div>

            {/* Quick Stat Chips */}
            <div className="admin-stats-chips">
              <span className="stat-chip">סה"כ: <strong>{users.length}</strong></span>
              <span className="stat-chip host">מארחים: <strong>{totalHostsCount}</strong></span>
              <span className="stat-chip guest">אורחים: <strong>{totalGuestsCount}</strong></span>
              <span className="stat-chip suspended" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>מושהים: <strong>{totalSuspendedCount}</strong></span>
              <span className="stat-chip banned" style={{ backgroundColor: '#f8d7da', color: '#721c24' }}>חסומים: <strong>{totalBannedCount}</strong></span>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="search-filter-bar">
            <input 
              type="text" 
              placeholder="חיפוש לפי שם, אימייל או טלפון..." 
              className="admin-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="admin-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">כל התפקידים</option>
              <option value="host">מארחים (Host)</option>
              <option value="guest">אורחים (Guest)</option>
              <option value="admin">מנהלים (Admin)</option>
            </select>
            <select 
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">כל הסטטוסים</option>
              <option value="active">פעילים</option>
              <option value="suspended">מושהים</option>
              <option value="banned">חסומים לצמיתות</option>
            </select>
          </div>

          {/* Interactive Modern Table */}
          <Table 
            headers={['משתמש', 'תפקיד', 'סטטוס', '']}
            dataLength={filteredUsers.length}
            fallbackText="לא נמצאו משתמשים העונים לסינון הנוכחי."
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
                    {user.user_type === 'host' ? 'מארח' : user.user_type === 'guest' ? 'אורח' : 'מנהל'}
                  </span>
                </td>

                {/* Status Column */}
                <td>
                  <span className={`badge ${user.account_status === 'active' ? 'active' : user.account_status === 'suspended' ? 'suspended' : 'danger'}`}>
                    {user.account_status === 'active' ? 'פעיל' : user.account_status === 'suspended' ? 'מושעה' : 'חסום'}
                  </span>
                </td>

                {/* Action Column with Hover Button & Arrow */}
                <td>
                  <div className="user-view-btn-wrapper">
                    <span className="btn-view-user">
                      <span>צפה בפרטים</span>
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
            ← חזרה לרשימת המשתמשים
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
                    {selectedUser.user_type === 'host' ? 'מארח' : selectedUser.user_type === 'guest' ? 'אורח' : 'מנהל'}
                  </span>
                  <span className={`badge ${selectedUser.account_status === 'active' ? 'active' : selectedUser.account_status === 'suspended' ? 'suspended' : 'danger'}`}>
                    {selectedUser.account_status === 'active' ? 'פעיל' : selectedUser.account_status === 'suspended' ? 'מושעה' : 'חסום'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Actions Bar */}
            <div className="admin-detail-actions">
              {/* Support Chat Button */}
              <button 
                onClick={() => setSupportChatUser(selectedUser)}
                className="btn-admin-action btn-activate"
                style={{ backgroundColor: '#17a2b8' }}
              >
                <span>💬</span>
                <span>צ'אט תמיכה</span>
              </button>

              {/* Activate Button */}
              {selectedUser.account_status !== 'active' && (
                <button 
                  onClick={() => handleStatusChangeClick(selectedUser, 'active')}
                  className="btn-admin-action btn-activate"
                >
                  <UnlockIcon />
                  <span>הפעל משתמש</span>
                </button>
              )}

              {/* Suspend Button */}
              {selectedUser.account_status !== 'suspended' && (
                <button 
                  onClick={() => handleStatusChangeClick(selectedUser, 'suspended')}
                  className="btn-admin-action btn-suspend"
                >
                  <LockIcon />
                  <span>השעה משתמש</span>
                </button>
              )}

              {/* Ban Button */}
              {selectedUser.account_status !== 'banned' && (
                <button 
                  onClick={() => handleStatusChangeClick(selectedUser, 'banned')}
                  className="btn-admin-action btn-delete"
                >
                  <LockIcon />
                  <span>חסום לצמיתות</span>
                </button>
              )}

              {/* Delete User Button */}
              <button 
                onClick={() => setConfirmModal({ isOpen: true, type: 'delete', user: selectedUser })}
                className="btn-admin-action btn-delete"
              >
                <TrashIcon />
                <span>מחק משתמש</span>
              </button>
            </div>
          </div>

          {/* Full User Details Grid */}
          <div className="admin-card margin-bottom-20">
            <div className="user-info-grid">
              <div className="info-item">
                <span className="info-label">כתובת אימייל:</span>
                <span className="info-value">{selectedUser.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">מספר טלפון:</span>
                <span className="info-value ltr-column">{formatPhoneNumber(selectedUser.phone_number)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">תאריך הרשמה:</span>
                <span className="info-value">
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('he-IL') : 'לא צוין'}
                </span>
              </div>
              {selectedUser.user_type === 'guest' && (
                <div className="info-item">
                  <span className="info-label">אימות חייל/שירות לאומי:</span>
                  <div className="flex-align-center">
                    <span className={`badge ${selectedUser.is_soldier_or_national_service ? 'verified' : 'pending'}`}>
                      {selectedUser.is_soldier_or_national_service ? 'חייל מאומת' : 'לא מאומת'}
                    </span>
                    <button 
                      onClick={() => handleVerifySoldier(selectedUser.id, selectedUser.is_soldier_or_national_service)}
                      className="btn-action verify-soldier margin-right-8"
                      title="שנה אימות"
                    >
                      <CheckCircleIcon />
                    </button>
                  </div>
                </div>
              )}
              {selectedUser.biography && (
                <div className="info-item full-width">
                  <span className="info-label">אודות / ביוגרפיה:</span>
                  <span className="info-value">{selectedUser.biography}</span>
                </div>
              )}
            </div>
          </div>

          {/* User Posts / Requests Table */}
          <div className="admin-card margin-bottom-20">
            <div className="admin-card-header">
              <h3 className="admin-card-title">פוסטים ובקשות של המשתמש</h3>
            </div>
            {userPosts.length > 0 ? (
              <Table 
                headers={['תאריך מבוקש', 'תיאור הבקשה', 'כמות אורחים', 'סטטוס']}
                dataLength={userPosts.length}
              >
                {userPosts.map(post => (
                  <tr key={post.id}>
                    <td>{new Date(post.requested_date).toLocaleDateString('he-IL')}</td>
                    <td className="truncate-cell">{post.description}</td>
                    <td>{post.guests_count}</td>
                    <td>
                      <span className={`badge ${post.status === 'open' ? 'active' : 'verified'}`}>
                        {post.status === 'open' ? 'פתוח' : 'הותאם'}
                      </span>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <div className="admin-table-fallback">אין פוסטים או בקשות פעילות למשתמש זה.</div>
            )}
          </div>

          {/* User Matches & Reviews Table */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">התאמות ואירוחים של המשתמש</h3>
            </div>
            {userMatches.length > 0 ? (
              <Table 
                headers={['אורח', 'מארח', 'תאריך', 'סטטוס']}
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
              <div className="admin-table-fallback">אין אירוחים או התאמות רשומות למשתמש זה.</div>
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
              {confirmModal.type === 'suspended' ? 'אישור השעיית משתמש' : 
               confirmModal.type === 'banned' ? 'אישור חסימת משתמש (Ban)' : 'אישור מחיקת משתמש'}
            </h3>
            <p className="modal-body">
              {confirmModal.type === 'suspended' ? (
                `האם אתה בטוח שברצונך להשעות את המשתמש "${confirmModal.user?.full_name}"? פעולה זו תנעל את המשתמש זמנית מהאפליקציה, אך תשאיר לו גישה לצ'אט תמיכה מול הנהלת המערכת.`
              ) : confirmModal.type === 'banned' ? (
                `האם אתה בטוח שברצונך לחסום לצמיתות את המשתמש "${confirmModal.user?.full_name}"? פעולה זו תנעל את המשתמש לחלוטין מכל חלקי האפליקציה והשירותים בה.`
              ) : (
                `האם אתה בטוח שברצונך למחוק לחלוטין את המשתמש "${confirmModal.user?.full_name}" מהמערכת? פעולה זו אינה ניתנת לביטול.`
              )}
            </p>

            {(confirmModal.type === 'suspended' || confirmModal.type === 'banned') && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>סיבת הפעולה:</label>
                <textarea
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '5px', border: '1px solid #ddd' }}
                  rows={3}
                  placeholder="אנא פרט את הסיבה לפעולה זו (תוצג למשתמש)..."
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
                {confirmModal.type === 'suspended' ? 'אישור השעיה' : confirmModal.type === 'banned' ? 'אישור חסימה' : 'אישור מחיקה'}
              </button>
              <button 
                className="btn-modal-cancel"
                onClick={() => setConfirmModal({ isOpen: false, type: '', user: null, reason: '' })}
              >
                ביטול
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
