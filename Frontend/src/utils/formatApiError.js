export default function formatApiError(detail) {
  if (!detail) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === 'string' ? d : (d.msg || JSON.stringify(d))))
      .join(', ');
  }
  if (typeof detail === 'object') {
    // Try common fields
    if (detail.msg) return detail.msg;
    return JSON.stringify(detail);
  }
  return String(detail);
}
