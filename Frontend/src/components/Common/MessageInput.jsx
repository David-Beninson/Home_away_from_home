import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function MessageInput({
  value,
  onChange,
  onSendMessage,
  placeholder,
  buttonText,
  disabled = false,
  className = 'chat-input-container',
  formClassName = 'chat-input-form',
  inputClassName = 'chat-input',
  buttonClassName = 'chat-send-btn'
}) {
  const { t } = useTranslation(['common/auth']);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSendMessage();
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className={formClassName}>
        <input
          type="text"
          className={inputClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t('common/auth:support_chat.input_placeholder')}
          disabled={disabled}
        />
        <button
          type="submit"
          className={buttonClassName}
          disabled={!value.trim() || disabled}
        >
          {buttonText ? (
            <span>{buttonText}</span>
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>
    </div>
  );
}
