import { useState, useCallback } from 'react';

/**
 * A custom hook to handle repetitive admin action states (loading, error, success messages).
 * Automatically wraps API calls in a try-catch block and manages state correctly.
 */
export function useAdminAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const executeAction = useCallback(async (actionFn, onSuccess, successMessage, errorMessage) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      const response = await actionFn();
      if (onSuccess) {
        onSuccess(response);
      }
      if (successMessage) {
        setSuccessMsg(successMessage);
      }
      return true;
    } catch (err) {
      console.error(err);
      setError(errorMessage || 'An error occurred during the operation.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMsg('');
  }, []);

  return { loading, error, successMsg, setError, setSuccessMsg, executeAction, clearMessages };
}
