import { MessageSquareOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ChatEmptyState() {
  const { t } = useTranslation(['chat/chats']);
  return (
    <div className="chat-empty-state">
      <div className="chat-empty-icon">
        <MessageSquareOff size={48} />
      </div>
      <h2>{t('chat/chats:empty_state.title')}</h2>
      <p>{t('chat/chats:empty_state.subtitle')}</p>
    </div>
  );
}
