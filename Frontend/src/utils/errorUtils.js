/**
 * Utility to parse error messages from API responses.
 * @param {Error} err - The error object caught in a try/catch block.
 * @param {string} fallbackMsg - Fallback message if detail cannot be parsed.
 * @returns {string} - The parsed error message.
 */
export function parseApiError(err, fallbackMsg = 'An error occurred') {
  const detail = err.response?.data?.detail;
  if (!detail) return err.message || fallbackMsg;
  
  if (typeof detail === 'string') {
    return detail;
  }
  
  if (Array.isArray(detail)) {
    return detail.map(e => e.msg || e.detail).join(', ');
  }
  
  if (typeof detail === 'object') {
    return JSON.stringify(detail);
  }
  
  return err.message || fallbackMsg;
}
