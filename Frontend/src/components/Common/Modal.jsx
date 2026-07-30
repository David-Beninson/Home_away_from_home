import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  icon: Icon, 
  iconColorClass = '',
  className = '', 
  children,
  footer,
  dir = 'rtl'
}) {
  const { t } = useTranslation(['common']);

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className={`chat-modal-card ${className}`} onClick={(e) => e.stopPropagation()} dir={dir}>
        <div className="chat-modal-header">
          <div className="chat-modal-title">
            {Icon && <Icon size={20} className={`chat-modal-icon ${iconColorClass}`} />}
            <h3>{title}</h3>
          </div>
          <button 
            type="button" 
            className="chat-modal-close" 
            onClick={onClose}
            aria-label={t('common:btn_close', { defaultValue: 'סגור' })}
          >
            <X size={18} />
          </button>
        </div>

        <div className="chat-modal-body">
          {children}
        </div>

        {footer && (
          <div className="chat-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
