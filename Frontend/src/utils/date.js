/**
 * Formats a date string into Israeli locale date format (DD/MM/YYYY)
 * @param {string} dateString - ISO date string or similar date representation
 * @returns {string} Formatted date string or original input if invalid
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

/**
 * Formats a date string into a long Hebrew date format (e.g., "שישי, 18 ביולי 2025")
 * @param {string} dateString 
 * @returns {string}
 */
export const formatHebrewDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

/**
 * Returns a relative time string in Hebrew (e.g., "לפני שעתיים")
 * @param {string} dateString 
 * @returns {string}
 */
export const getRelativeTimeHebrew = (dateString) => {
  if (!dateString) return '';
  try {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 1) return 'ממש עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours === 1) return 'לפני שעה';
    if (diffHours === 2) return 'לפני שעתיים';
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    return `לפני ${diffDays} ימים`;
  } catch {
    return '';
  }
};

/**
 * Checks if a requested date is within the next 24 hours and post is unapproved
 * @param {string} requestedDateStr 
 * @returns {{ isUrgent: boolean, hoursLeft: number, isPast: boolean }}
 */
export const checkPostUrgency = (requestedDateStr) => {
  if (!requestedDateStr) return { isUrgent: false, hoursLeft: Infinity, isPast: false };
  try {
    const now = new Date();
    const eventDate = new Date(requestedDateStr);
    const diffMs = eventDate - now;
    const hoursLeft = diffMs / (1000 * 60 * 60);

    const isPast = hoursLeft < 0;
    const isUrgent = hoursLeft >= 0 && hoursLeft <= 24;

    return { isUrgent, hoursLeft: Math.max(0, Math.floor(hoursLeft)), isPast };
  } catch {
    return { isUrgent: false, hoursLeft: Infinity, isPast: false };
  }
};

/**
 * Formats a date string into a time string (HH:MM)
 * @param {string} dateString 
 * @returns {string}
 */
export const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

/**
 * Formats a date string into a short date string (DD/MM)
 * @param {string} dateString 
 * @returns {string}
 */
export const formatShortDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  } catch {
    return '';
  }
};
