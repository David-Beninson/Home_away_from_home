import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import RequestCard from './RequestCard';
import CreatePostModal from './CreatePostModal';
import { postsApi, bookingsApi } from '../../api/api';
import { checkPostUrgency } from '../../utils/date';
import { HistoryToggleSection } from '../Common/HistoryToggleSection';
import { FilterPillsGroup } from '../Common/FilterPillsGroup';
import { fetchPosts } from '../../store/requestsSlice';
import { isUpcomingOrActiveChat } from '../../utils/chatUtils';
import { useTranslation } from 'react-i18next';
import { parseApiError } from '../../utils/errorUtils';
import './RequestsList.css';


export default function RequestsList({ userRole: userRoleProp }) {
  const { t } = useTranslation(['guest/requests']);
  const dispatch = useDispatch();
  const { posts, loading, error } = useSelector((state) => state.requests);
  const user = useSelector((state) => state.auth.user);

  const currentRole = userRoleProp || user?.user_type;
  const currentGuestProfileId = user?.profile?.id || user?.guest_profile?.id;

  const [localPosts, setLocalPosts] = useState([]);
  const [claimingPostId, setClaimingPostId] = useState(null);
  const [activeFilter, setActiveFilter] = useState(currentRole === 'host' ? 'urgent' : 'all');
  const [hasInitializedFilter, setHasInitializedFilter] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Sync WebSocket posts to local state and calculate initial tab
  useEffect(() => {
    setLocalPosts(posts);

    if (!hasInitializedFilter && posts.length > 0) {
      if (currentRole === 'host') {
        const hasUrgent = posts.some((post) => {
          const isUnapproved = post.status !== 'matched' && post.status !== 'approved';
          return isUnapproved && checkPostUrgency(post.requested_date).isUrgent;
        });
        setActiveFilter(hasUrgent ? 'urgent' : 'pending');
      } else if (currentRole === 'guest') {
        const hasWaitingHost = posts.some((post) => post.status === 'pending' && Boolean(post.is_direct_request));
        const hasPendingApproval = posts.some((post) => post.status === 'pending' && !post.is_direct_request);

        if (hasWaitingHost) {
          setActiveFilter('waiting_host');
        } else if (hasPendingApproval) {
          setActiveFilter('pending');
        } else {
          setActiveFilter('all');
        }
      }
      setHasInitializedFilter(true);
    }
  }, [posts, currentRole, hasInitializedFilter]);

  // Base list of posts relevant to current user role
  const rolePosts = localPosts.filter(post => {
    if (currentRole === 'guest' && currentGuestProfileId && post.guest_profile_id && post.guest_profile_id !== currentGuestProfileId) {
      return false;
    }
    return true;
  });

  // Separate active/upcoming requests vs past requests for guest view
  const activePosts = rolePosts.filter(post => currentRole === 'guest' ? isUpcomingOrActiveChat(post) : true);
  const pastRequests = currentRole === 'guest' ? rolePosts.filter(post => !isUpcomingOrActiveChat(post)) : [];

  // Filter posts based on active filter tab
  const displayedPosts = activePosts.filter(post => {
    if (activeFilter === 'urgent') {
      const isUnapproved = post.status !== 'matched' && post.status !== 'approved';
      const { isUrgent } = checkPostUrgency(post.requested_date);
      return isUnapproved && isUrgent;
    }
    if (activeFilter === 'waiting_host') {
      return post.status === 'pending' && Boolean(post.is_direct_request);
    }
    if (activeFilter === 'pending') {
      return currentRole === 'guest'
        ? (post.status === 'pending' && !post.is_direct_request)
        : (post.status === 'open' || post.status === 'pending');
    }
    if (activeFilter === 'open') {
      return post.status === 'open';
    }
    if (activeFilter === 'approved') {
      return post.status === 'matched' || post.status === 'approved';
    }
    if (activeFilter === 'rejected') {
      return post.status === 'rejected' || post.status === 'declined' || post.status === 'cancelled' || post.status === 'CANCELLED';
    }

    return true;
  }).sort((a, b) => {
    // Priority: Urgent unapproved posts always come first for hosts
    const aUnapproved = a.status !== 'matched' && a.status !== 'approved';
    const bUnapproved = b.status !== 'matched' && b.status !== 'approved';
    const aUrgent = aUnapproved && checkPostUrgency(a.requested_date).isUrgent;
    const bUrgent = bUnapproved && checkPostUrgency(b.requested_date).isUrgent;

    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    return 0;
  });


  const [editingPost, setEditingPost] = useState(null);

  const handleAction = async (post) => {
    if (currentRole === 'host') {
      try {
        setClaimingPostId(post.id);
        if (post.pending_match_id) {
          await bookingsApi.respondToBooking(post.pending_match_id, 'matched');
        } else {
          await postsApi.claimPost(post.id);
        }
        dispatch(fetchPosts());
      } catch (err) {
        console.error('Failed to claim/approve post:', err);
        const errorMsg = parseApiError(err);
        alert(t('guest/requests:list.error_approve', { error: errorMsg }));
      } finally {
        setClaimingPostId(null);
      }
    } else {
      setEditingPost(post);
    }
  };

  const pendingForGuestCount = activePosts.filter(p => p.status === 'pending' && !p.is_direct_request).length;
  const waitingHostCount = activePosts.filter(p => p.status === 'pending' && Boolean(p.is_direct_request)).length;

  const filterTabs = currentRole === 'guest' ? [
    { id: 'waiting_host', label: waitingHostCount > 0 ? t('guest/requests:list.filter_waiting_host', { count: waitingHostCount }) : t('guest/requests:list.filter_waiting_host_zero') },
    { id: 'pending', label: pendingForGuestCount > 0 ? t('guest/requests:list.filter_pending_guest', { count: pendingForGuestCount }) : t('guest/requests:list.filter_pending_guest_zero') },
    { id: 'open', label: t('guest/requests:list.filter_open') },
    { id: 'all', label: t('guest/requests:list.filter_all') },
    { id: 'approved', label: t('guest/requests:list.filter_approved') },
  ] : [
    { id: 'urgent', label: t('guest/requests:list.filter_urgent') },
    { id: 'pending', label: t('guest/requests:list.filter_pending_host') },
    { id: 'all', label: t('guest/requests:list.filter_all') },
    { id: 'approved', label: t('guest/requests:list.filter_approved') },
    { id: 'rejected', label: t('guest/requests:list.filter_rejected') },
  ];


  return (
    <div className="requests-list-container">
      <FilterPillsGroup
        options={filterTabs}
        activeId={activeFilter}
        onChange={setActiveFilter}
        groupClassName=""
        containerClassName="requests-filter-nav"
        buttonClassName="requests-filter-btn"
        activeClassName="active"
      />

      {loading && displayedPosts.length === 0 ? (
        <div className="loading-container">
          <p>{t('guest/requests:list.loading')}</p>
        </div>
      ) : !loading && error && displayedPosts.length === 0 ? (
        <div className="empty-state">
          <p>{error}</p>
        </div>
      ) : displayedPosts.length === 0 ? (
        <div className="empty-state">
          <p>{t('guest/requests:list.empty_category')}</p>
        </div>
      ) : (
        displayedPosts.map((post) => (
          <RequestCard
            key={post.id}
            post={post}
            userRole={currentRole}
            onAction={handleAction}
            isClaiming={claimingPostId === post.id}
            onUpdateSuccess={() => dispatch(fetchPosts())}
          />
        ))
      )}

      {currentRole === 'guest' && pastRequests.length > 0 && (
        <HistoryToggleSection
          title={t('guest/requests:list.history_title', { count: pastRequests.length })}
          isOpen={isHistoryOpen}
          onToggle={() => setIsHistoryOpen(prev => !prev)}
          classNamePrefix="requests-history"
        >
          {pastRequests.map((post) => (
            <RequestCard
              key={post.id}
              post={post}
              userRole={currentRole}
              onAction={handleAction}
              isClaiming={claimingPostId === post.id}
              onUpdateSuccess={() => dispatch(fetchPosts())}
            />
          ))}
        </HistoryToggleSection>
      )}
    </div>
  );
}

