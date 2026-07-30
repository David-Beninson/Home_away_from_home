import { useState, useEffect } from 'react';
import { adminApi } from '../../api/api';
import { formatDate } from '../../utils/date';
import { TrashIcon } from '../Common/Icons';
import PageContainer from '../Common/PageContainer/PageContainer';
import Table from '../Common/Table/Table';
import '../../pages/Admin/Admin.css';
import { HostingDetailsModal } from '../Common/HostingDetailsModal';
import { useTranslation } from 'react-i18next';

export default function AdminBookings() {
  const { t } = useTranslation(['admin/bookings']);
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
        setError(t('admin/bookings:messages.error_loading'));
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  const handleDeletePost = async (postId) => {
    if (!window.confirm(t('admin/bookings:posts.confirm_delete'))) {
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
      setSuccessMsg(t('admin/bookings:posts.success_delete'));
    } catch (err) {
      console.error('Failed to delete post:', err);
      setError(t('admin/bookings:posts.error_delete'));
    }
  };

  return (
    <PageContainer loading={loading} error={error} successMsg={successMsg}>
      <div className="admin-page-header">
        <h2 className="admin-page-title">{t('admin/bookings:title')}</h2>
        <p className="admin-page-subtitle">{t('admin/bookings:subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="admin-sub-tabs">
        <button
          onClick={() => setActiveTab('posts')}
          className={`admin-sub-tab ${activeTab === 'posts' ? 'active' : ''}`}
        >
          {t('admin/bookings:tabs.posts', { count: data.posts.filter(p => p.status === 'open').length })}
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`admin-sub-tab ${activeTab === 'matches' ? 'active' : ''}`}
        >
          {t('admin/bookings:tabs.matches', { count: data.matches.length })}
        </button>
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <Table
          headers={t('admin/bookings:posts.headers', { returnObjects: true })}
          dataLength={data.posts.length}
          fallbackText={t('admin/bookings:posts.fallback')}
        >
          {data.posts.map(post => (
            <tr key={post.id}>
              <td className="text-semibold">{post.guest_name}</td>
              <td>
                <div className="flex-align-center">
                  <span>{formatDate(post.requested_date)}</span>
                  {post.is_urgent && <span className="badge urgent">{t('admin/bookings:posts.urgent')}</span>}
                </div>
              </td>
              <td>{post.guests_count}</td>
              <td className="truncate-cell" title={post.description}>
                {post.description}
              </td>
              <td>
                <span className={`badge ${post.status === 'open' ? 'active' : 'host'}`}>
                  {post.status === 'open' ? t('admin/bookings:posts.status_open') : t('admin/bookings:posts.status_matched')}
                </span>
              </td>
              <td>{formatDate(post.created_at)}</td>
              <td>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="btn-action delete-post"
                  title={t('admin/bookings:posts.delete_tooltip')}
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
          headers={t('admin/bookings:matches.headers', { returnObjects: true })}
          dataLength={data.matches.length}
          fallbackText={t('admin/bookings:matches.fallback')}
        >
          {data.matches.map(match => (
            <tr key={match.id}>
              <td className="text-semibold">{match.guest_name}</td>
              <td className="text-semibold">{match.host_name}</td>
              <td>{formatDate(match.requested_date)}</td>
              <td>{formatDate(match.created_at)}</td>
              <td>
                <span className={`badge ${match.status === 'matched' ? 'active' : match.status === 'pending' ? 'pending' : 'suspended'}`}>
                  {match.status === 'matched' ? t('admin/bookings:matches.status_matched') : match.status === 'pending' ? t('admin/bookings:matches.status_pending') : t('admin/bookings:matches.status_suspended')}
                </span>
              </td>
              <td>
                <button
                  onClick={() => setSelectedMatch(match)}
                  className="btn-action"
                  style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: '4px', background: '#f3f4f6', cursor: 'pointer' }}
                >
                  {t('admin/bookings:matches.view_details')}
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
            other_party_name: t('admin/bookings:matches.override_details', { host: selectedMatch.host_name, guest: selectedMatch.guest_name }),
            hosting_date: selectedMatch.requested_date
          }}
          isHostOverride={true}
        />
      )}
    </PageContainer>
  );
}
