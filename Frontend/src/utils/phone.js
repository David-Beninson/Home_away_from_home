/**
 * Formats an Israeli phone number cleanly (e.g., "+972536216123" -> "053-621-6123").
 * @param {string} phoneStr
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phoneStr) {
  if (!phoneStr || typeof phoneStr !== 'string') return '';

  const digits = phoneStr.replace(/\D/g, '');
  if (!digits) return phoneStr;

  let local = digits;

  // Convert international prefix 972... to local 0...
  if (local.startsWith('972')) {
    local = '0' + local.slice(3);
  }

  // 10 digits mobile (05X-XXX-XXXX or 07X-XXX-XXXX)
  if (local.length === 10 && (local.startsWith('05') || local.startsWith('07'))) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }

  // 9 digits landline (02-, 03-, 04-, 08-, 09-)
  if (local.length === 9 && local.startsWith('0')) {
    return `${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`;
  }

  // Fallback for 10 digits other
  if (local.length === 10 && local.startsWith('0')) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }

  return phoneStr;
}
