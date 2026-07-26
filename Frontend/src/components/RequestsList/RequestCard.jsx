import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, Users, Heart, Edit3, Loader2, AlertCircle, Clock, Check, MessageSquare, ExternalLink } from 'lucide-react';
import { formatHebrewDate, getRelativeTimeHebrew, checkPostUrgency } from '../../utils/date';
import RequestInlineEdit from './RequestInlineEdit';
import PendingOfferBox from './PendingOfferBox';
import { HostingDetailsModal } from '../Common/HostingDetailsModal';

export default function RequestCard({ post, userRole, onAction, isClaiming, onUpdateSuccess }) {
  const navigate = useNavigate();
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Determine displayed name
  const isAnon = post.is_anonymous || post.guest_name === 'Soldier' || post.guest_name === 'Anonymous Guest' || post.guest_name === 'אנונימי' || post.guest_name === 'חייל אנונימי' || post.guest_name === 'אורח אנונימי';
  const displayName = isAnon ? 'אנונימי' : (post.guest_name || 'אורח');

  const unit = post.unit_name || post.service_type || 'חייל';
  const displayRegion = post.region || 'מרכז';
  const dateFormatted = formatHebrewDate(post.requested_date);
  const subtitle = `${unit} · ${displayRegion} · ${dateFormatted}`;

  // Time details
  const timeAgo = getRelativeTimeHebrew(post.created_at);

  // Status & Urgency mapping
  const isUnapproved = post.status !== 'matched' && post.status !== 'approved';
  const { isUrgent, hoursLeft } = checkPostUrgency(post.requested_date);
  const showUrgentNotice = isUnapproved && isUrgent;
  const isDirectRequest = Boolean(post.is_direct_request);

  let statusLabel = 'פתוח';
  if (post.status === 'matched' || post.status === 'approved') {
    statusLabel = 'אושר';
  } else if (post.status === 'pending') {
    if (isDirectRequest) {
      statusLabel = userRole === 'host' ? 'ממתין לאישורך' : 'ממתין לאישור המארח';
    } else {
      statusLabel = userRole === 'guest' ? 'ממתין לאישורך' : 'ממתין לתשובת החייל';
    }
  }

  if (isEditingInline) {
    return (
      <RequestInlineEdit
        post={post}
        onCancel={() => setIsEditingInline(false)}
        onSaveSuccess={() => {
          setIsEditingInline(false);
          if (onUpdateSuccess) onUpdateSuccess();
        }}
      />
    );
  }

  const matchId = post.match_id || post.id;
  const otherPartyName = userRole === 'guest' 
    ? (post.claimed_by_host_name || post.host_name || 'מארח')
    : displayName;
  const hostingDate = post.requested_date || post.start_date;

  const modalData = {
    ...post,
    other_party_name: otherPartyName,
    other_party_phone: post.guest_phone || post.phone || post.phone_number || post.host_phone,
    hosting_date: hostingDate
  };

  return (
    <>
      <div className={`request-card ${showUrgentNotice ? 'urgent-border-highlight' : ''}`}>
        <div className="card-header">
          <div className="status-badges-group">
            {showUrgentNotice && (
              <span className="status-badge urgent-badge">
                <AlertCircle size={13} />
                דחוף - בעוד {hoursLeft === 0 ? 'פחות משעה' : `${hoursLeft} שעות`}!
              </span>
            )}
            <span className={`status-badge ${post.status === 'matched' ? 'matched' : post.status === 'pending' ? 'pending' : ''}`}>
              {statusLabel}
            </span>
          </div>
          <div className="user-info-container">
            <div className="user-name-row">
              <h3>{displayName}</h3>
            </div>
            <p className="card-subtitle">{subtitle}</p>
          </div>
        </div>

        {(() => {
          const desc = post.description || '';
          const matchReturn = desc.match(/מביאים לאירוח:\s*([^\n]+)/);
          const inReturnVal = matchReturn ? matchReturn[1].trim() : null;
          const cleanDesc = desc.replace(/מביאים לאירוח:[^\n]+/, '').trim();

          return (
            <div className="card-description-wrapper">
              {inReturnVal && (
                <div className="card-bring-item">
                  <span>מביאים לאירוח: </span>
                  <span className="font-bold">{inReturnVal}</span>
                </div>
              )}
              {cleanDesc && (
                <p className="card-description">{cleanDesc}</p>
              )}
            </div>
          );
        })()}

        <div className="card-tags">
          <span className="card-tag tag-kashrut">
            <Utensils className="w-3 h-3" />
            {post.kashrut || 'כשר'}
          </span>
          <span className="card-tag tag-guests">
            <Users className="w-3 h-3" />
            {post.guests_count} אורחים
          </span>
          <span className="tag-time">{timeAgo}</span>
        </div>

        {/* Show PendingOfferBox only when a host offered on guest's public post */}
        {userRole === 'guest' && post.status === 'pending' && !isDirectRequest && (
          <PendingOfferBox
            post={post}
            onUpdateSuccess={onUpdateSuccess}
          />
        )}

        <div className="card-actions">
          {post.status === 'matched' || post.status === 'approved' ? (
            <div className="card-matched-banner">
              <div className="card-matched-links">
                <button 
                  onClick={() => {
                    navigate('/chats', {
                      state: {
                        matchId,
                        chatData: {
                          match_id: matchId,
                          other_party_name: otherPartyName,
                          hosting_date: hostingDate,
                          last_message: null,
                          last_message_time: null,
                          unread_count: 0
                        }
                      }
                    });
                  }} 
                  className="card-matched-btn"
                >
                  <MessageSquare size={16} />
                  צ'אט
                </button>
                <button 
                  className="card-matched-btn"
                  onClick={() => setShowDetailsModal(true)}
                >
                  <ExternalLink size={16} />
                  פרטי אירוח
                </button>
              </div>
              <p className="card-matched-status">האירוח אושר! ✓</p>
            </div>
          ) : userRole === 'host' ? (
            post.status === 'pending' ? (
              isDirectRequest ? (
                <button
                  className="action-button claim-button direct-approve-btn"
                  onClick={() => onAction && onAction(post)}
                  disabled={isClaiming}
                >
                  {isClaiming ? <Loader2 className="w-4 h-4 spin-icon" /> : <Check className="w-4 h-4" />}
                  <span>אישור בקשה</span>
                </button>
              ) : (
                <button
                  className="action-button claim-button waiting-guest-btn"
                  disabled={true}
                >
                  <Clock className="w-4 h-4" />
                  <span>ממתין לתשובת החייל...</span>
                </button>
              )
            ) : (
              <button
                className={`action-button claim-button ${showUrgentNotice ? 'urgent-claim-btn' : ''}`}
                onClick={() => onAction && onAction(post)}
                disabled={post.status === 'matched' || isClaiming}
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 spin-icon" />
                    <span>שולח למערכת...</span>
                  </>
                ) : showUrgentNotice ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>דרוש עכשיו</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4" />
                    <span>דרוש בקשה זו</span>
                  </>
                )}
              </button>
            )
          ) : (
            post.status === 'open' && (
              <button
                className="action-button edit-button"
                onClick={() => setIsEditingInline(true)}
              >
                <Edit3 className="w-4 h-4" />
                <span>עריכת בקשה</span>
              </button>
            )
          )}
        </div>
      </div>
      {showDetailsModal && (
        <HostingDetailsModal
          isOpen={showDetailsModal}
          data={modalData}
          userRole={userRole}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </>
  );
}

