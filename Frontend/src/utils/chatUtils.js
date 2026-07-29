/**
 * Formats display name for a chat, disambiguating anonymous guests with hosting date (DD.MM).
 * Example: "אורח אנונימי (12.05)"
 */
export function getChatDisplayName(chat) {
  if (!chat) return '';

  const isAnon = chat.is_anonymous ||
    ['אנונימי', 'אורח אנונימי', 'חייל אנונימי', 'Soldier', 'Anonymous Guest'].includes(chat.other_party_name) ||
    chat.other_party_name?.includes('אנונימי');

  const hostingDateStr = chat.hosting_date || chat.shabbat_date || chat.requested_date;

  if (isAnon) {
    if (chat.other_party_name && /\(\d{2}\.\d{2}\)/.test(chat.other_party_name)) {
      return chat.other_party_name;
    }
    let dateFormatted = '';
    if (hostingDateStr) {
      const d = new Date(hostingDateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        dateFormatted = `${day}.${month}`;
      }
    }
    return dateFormatted ? `אורח אנונימי (${dateFormatted})` : (chat.other_party_name || 'אורח אנונימי');
  }

  return chat.other_party_name || 'צ׳אט';
}

/**
 * Checks if a date string is >= start of today.
 */
export function isUpcomingOrActiveDate(dateInput) {
  if (!dateInput) return true;
  const targetDate = new Date(dateInput);
  if (isNaN(targetDate.getTime())) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return targetDate.getTime() >= today.getTime();
}

/**
 * Checks if a chat or request item is active/upcoming based on hosting date >= start of today.
 * If date is missing or invalid, returns true to ensure no active items are hidden.
 */
export function isUpcomingOrActiveChat(item) {
  const dStr = item?.hosting_date || item?.shabbat_date || item?.requested_date || item?.start_date || item?.date;
  return isUpcomingOrActiveDate(dStr);
}
