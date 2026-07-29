export function AdminRejectModal({
  rejectingId,
  rejectionReason,
  setRejectionReason,
  onSubmit,
  onClose,
  isProcessing
}) {
  if (!rejectingId) return null;

  return (
    <div className="admin-reject-modal-overlay">
      <div className="admin-reject-modal-box">
        <h3 className="admin-reject-title">דחיית בקשת אימות</h3>
        <p className="admin-reject-desc">
          אנא ציין את סיבת הדחייה שתופיע למשתמש במסך הנעילה (למשל: "התמונה מטושטשת", "תעודה לא קריאה"):
        </p>

        <form onSubmit={onSubmit}>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="רשום את נימוק הדחייה..."
            required
            className="admin-reject-textarea"
          />

          <div className="admin-reject-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="admin-reject-cancel-btn"
            >
              ביטול
            </button>

            <button
              type="submit"
              disabled={isProcessing}
              className="admin-reject-confirm-btn"
            >
              {isProcessing ? 'שולח דחייה... ⏳' : 'שלח דחייה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
