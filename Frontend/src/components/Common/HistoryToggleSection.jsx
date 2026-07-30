import React from 'react';

export function HistoryToggleSection({ title, isOpen, onToggle, children, classNamePrefix = 'history' }) {
  return (
    <div className={`${classNamePrefix}-section`}>
      <button
        type="button"
        className={`${classNamePrefix}-toggle`}
        onClick={onToggle}
      >
        <span className={`${classNamePrefix}-title`}>
          {title}
        </span>
        <span className={`${classNamePrefix}-chevron ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className={`${classNamePrefix}-list`}>
          {children}
        </div>
      )}
    </div>
  );
}
