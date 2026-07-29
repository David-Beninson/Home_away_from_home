import { useState, useEffect } from 'react';
import { adminApi } from '../../api/api';
import { formatDate } from '../../utils/date';
import { TrashIcon } from '../Common/Icons';
import PageContainer from '../Common/PageContainer/PageContainer';
import Table from '../Common/Table/Table';
import '../../pages/Admin/Admin.css';
import { HostingDetailsModal } from '../Common/HostingDetailsModal';

export default function AdminBookings() {
  const [data, setData] = useState({ matches: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('posts'); // posts, matches
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    async function loadBookings() {
      try {
        setLoading(true);
        const response = await adminApi.getBookings();
        setData(response.data);
      } catch (err) {
        console.error('Failed to load bookings:', err);
        setError('שגיאה בטעינת נתוני בקשות.');
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  const handleDeletePost = async (postId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק בקשת אירוח זו לצמיתות?')) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      await adminApi.deletePost(postId);

      // Update local state cleanly
      setData(prevData => ({
        ...prevData,
        posts: prevData.posts.filter(p => p.id !== postId)
      }));
      setSuccessMsg('בקשת האירוח נמחקה בהצלחה.');
    } catch (err) {
      console.error('Failed to delete post:', err);
      setError('מחיקת בקשת אירוח נכשלה. אנא נסה שוב.');
    }
  };

  return (
    <PageContainer loading={loading} error={error} successMsg={successMsg}>
      <div className="admin-page-header">
        <h2 className="admin-page-title">בקשות ושידוכים במערכת</h2>
        <p className="admin-page-subtitle">ניהול ומודרציה של בקשות אירוח פתוחות והיסטוריית שידוכי שבת</p>
      </div>

      {/* Tabs */}
      <div className="admin-sub-tabs">
        <button
          onClick={() => setActiveTab('posts')}
          className={`admin-sub-tab ${activeTab === 'posts' ? 'active' : ''}`}
        >
          בקשות אירוח פתוחות ({data.posts.filter(p => p.status === 'open').length})
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`admin-sub-tab ${activeTab === 'matches' ? 'active' : ''}`}
        >
          שידוכים במערכת ({data.matches.length})
        </button>
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <Table
          headers={['שם האורח', 'תאריך מבוקש', 'מספר אורחים', 'תיאור / הערות', 'סטטוס בקשה', 'נוצר בתאריך', 'פעולות']}
          dataLength={data.posts.length}
          fallbackText="אין בקשות אירוח כרגע."
        >
          {data.posts.map(post => (
            <tr key={post.id}>
              <td className="text-semibold">{post.guest_name}</td>
              <td>
                <div className="flex-align-center">
                  <span>{formatDate(post.requested_date)}</span>
                  {post.is_urgent && <span className="badge urgent">דחוף!</span>}
                </div>
              </td>
              <td>{post.guests_count}</td>
              <td className="truncate-cell" title={post.description}>
                {post.description}
              </td>
              <td>
                <span className={`badge ${post.status === 'open' ? 'active' : 'host'}`}>
                  {post.status === 'open' ? 'פתוח למענה' : 'שודך'}
                </span>
              </td>
              <td>{formatDate(post.created_at)}</td>
              <td>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="btn-action delete-post"
                  title="מחק בקשה לצמיתות"
                >
                  <TrashIcon />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <Table
          headers={['שם האורח', 'שם המארח', 'תאריך האירוח', 'נוצר בתאריך', 'סטטוס שידוך', 'פרטים']}
          dataLength={data.matches.length}
          fallbackText="לא נמצאו שידוכים פעילים במערכת."
        >
          {data.matches.map(match => (
            <tr key={match.id}>
              <td className="text-semibold">{match.guest_name}</td>
              <td className="text-semibold">{match.host_name}</td>
              <td>{formatDate(match.requested_date)}</td>
              <td>{formatDate(match.created_at)}</td>
              <td>
                <span className={`badge ${match.status === 'matched' ? 'active' : match.status === 'pending' ? 'pending' : 'suspended'}`}>
                  {match.status === 'matched' ? 'מאושר' : match.status === 'pending' ? 'בהמתנה למארח' : 'נדחה/בוטל'}
                </span>
              </td>
              <td>
                <button
                  onClick={() => setSelectedMatch(match)}
                  className="btn-action"
                  style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: '4px', background: '#f3f4f6', cursor: 'pointer' }}
                >
                  👁️ צפה בפרטים
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {selectedMatch && (
        <HostingDetailsModal
          isOpen={Boolean(selectedMatch)}
          onClose={() => setSelectedMatch(null)}
          data={{
            ...selectedMatch,
            other_party_name: `מארח: ${selectedMatch.host_name} | אורח: ${selectedMatch.guest_name}`,
            hosting_date: selectedMatch.requested_date
          }}
          isHostOverride={true}
        />
      )}
    </PageContainer>
  );
}
