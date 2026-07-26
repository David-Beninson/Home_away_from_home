
import { MessageSquare } from 'lucide-react';

export function ChatEmptyState() {
  return (
    <div className="chat-empty-state">
      <MessageSquare className="chat-empty-icon" />
      <p>בחר שיחה כדי להתחיל להודעות</p>
    </div>
  );
}
