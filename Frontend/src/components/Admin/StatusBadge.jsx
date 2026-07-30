import React from 'react';

export function StatusBadge({ label, colorClass }) {
  return (
    <span className={`badge ${colorClass}`}>
      {label}
    </span>
  );
}
