import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook to navigate to the chat page with the required state for a specific match.
 */
export function useChatNavigation() {
  const navigate = useNavigate();

  const navigateToChat = useCallback((matchId, otherPartyName, hostingDate) => {
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
  }, [navigate]);

  return { navigateToChat };
}
