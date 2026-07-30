import React from 'react';

export function MetricCard({ title, value, colorClass, icon: Icon }) {
  return (
    <div className="admin-metric-card">
      <div className="admin-metric-card-info">
        <h4>{title}</h4>
        <p>{value}</p>
      </div>
      <div className={`admin-metric-icon-wrapper ${colorClass}`}>
        <Icon />
      </div>
    </div>
  );
}
