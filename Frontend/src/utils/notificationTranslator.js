export const translateNotificationTitle = (title, t) => {
  if (!title) return '';
  
  if (title.includes('בקשת אימות חדשה להמתנה')) return t('common/notifications:backend.titles.new_verification');
  if (title.includes('הודעה חדשה מהנהלת המערכת')) return t('common/notifications:backend.titles.new_admin_message');
  if (title.includes('תשובה חדשה מהנהלת המערכת')) return t('common/notifications:backend.titles.admin_reply');
  if (title.includes('הודעת תמיכה מ-')) {
    const name = title.replace('הודעת תמיכה מ-', '').replace('💬', '').trim();
    return t('common/notifications:backend.titles.support_message_from', { name });
  }
  if (title.includes('חשבונך אושר בהצלחה')) return t('common/notifications:backend.titles.account_approved');
  if (title.includes('בקשת האימות נדחתה')) return t('common/notifications:backend.titles.account_rejected');
  if (title.includes('בקשת אירוח חדשה')) return t('common/notifications:backend.titles.new_guest_request');
  if (title.includes('הצעת אירוח חדשה')) return t('common/notifications:backend.titles.new_host_offer');
  if (title.includes('ביטול אירוח')) return t('common/notifications:backend.titles.booking_cancelled');
  if (title.includes('הודעה חדשה מ')) {
    const name = title.replace('הודעה חדשה מ', '').trim();
    return t('common/notifications:backend.titles.new_message_from', { name });
  }
  if (title.includes('האירוח אושר')) return t('common/notifications:backend.titles.booking_approved');
  if (title.includes('בקשת אירוח נדחתה')) return t('common/notifications:backend.titles.booking_rejected');
  
  return title; // Fallback to original
};

export const translateNotificationMessage = (message, t) => {
  if (!message) return '';

  if (message.includes('מחכה לאישור מנהל')) return t('common/notifications:backend.messages.pending_admin_approval');
  if (message.includes('שלח/ה לך הודעה בתמיכה')) {
    const name = message.split('שלח/ה')[0].trim();
    return t('common/notifications:backend.messages.sent_support_message', { name });
  }
  if (message.includes('כעת תוכל לגשת לכל האפשרויות') || message.includes('פרופיל המשתמש שלך אושר כראוי וכל חסמי הגישה הוסרו')) return t('common/notifications:backend.messages.account_approved_desc');
  if (message.includes('אנא פנה לתמיכה')) return t('common/notifications:backend.messages.account_rejected_desc');
  
  if (message.includes('העלה מסמכים לאימות')) {
    const match = message.match(/המשתמש (.*) העלה מסמכים לאימות \(ציון AI: (.*)%\)/);
    if (match) return t('common/notifications:backend.messages.uploaded_docs', { name: match[1], score: match[2] });
  }

  if (message.includes('סיבת הדחייה:')) {
    const reason = message.replace('סיבת הדחייה:', '').trim();
    return t('common/notifications:backend.messages.rejection_reason', { reason });
  }

  if (message.includes('קיבלת בקשת אירוח מ')) {
    const name = message.replace('קיבלת בקשת אירוח מ', '').trim();
    return t('common/notifications:backend.messages.received_hosting_request', { name });
  }

  if (message.includes('הציע לארח אותך לשבת')) {
    const match = message.match(/המארח (.*) הציע לארח אותך לשבת/);
    const name = match ? match[1].trim() : '';
    return t('common/notifications:backend.messages.host_offered', { name });
  }

  if (message.includes('ביטל את בקשת האירוח')) {
    const match = message.match(/האורח (.*) ביטל את בקשת האירוח/);
    const name = match ? match[1].trim() : '';
    return t('common/notifications:backend.messages.guest_cancelled', { name });
  }
  
  return message; // Fallback to original
};
