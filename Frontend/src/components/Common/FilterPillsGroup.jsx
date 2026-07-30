import React from 'react';

export function FilterPillsGroup({
  label,
  options,
  activeId,
  onChange,
  groupClassName = 'filter-item-group',
  labelClassName = 'filter-group-label',
  containerClassName = 'filter-pills-container',
  buttonClassName = 'pill-btn',
  activeClassName = 'active-pill'
}) {
  return (
    <div className={groupClassName}>
      {label && <span className={labelClassName}>{label}</span>}
      <div className={containerClassName}>
        {options.map((opt) => {
          // Allow passing a custom isActive function, otherwise strictly compare IDs
          const isActive = typeof activeId === 'function' ? activeId(opt.id) : activeId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className={`${buttonClassName} ${isActive ? activeClassName : ''}`}
              onClick={() => onChange && onChange(opt.id)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
