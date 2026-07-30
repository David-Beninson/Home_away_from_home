import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import './DateRangePicker.css';

export default function DateRangePicker({
  startDate: propStartDate,
  endDate: propEndDate,
  onChange,
  disabledDates = [],
  minDate = new Date(),
  maxDate = null,
}) {
  const { t, i18n } = useTranslation(['common/date_picker']);
  // Start of today without timestamp
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const effectiveMinDate = useMemo(() => {
    if (!minDate) return today;
    const d = new Date(minDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [minDate, today]);

  // State for start & end date if un-controlled or controlled sync
  const [selectedStart, setSelectedStart] = useState(propStartDate ? new Date(propStartDate) : null);
  const [selectedEnd, setSelectedEnd] = useState(propEndDate ? new Date(propEndDate) : null);
  const [hoverDate, setHoverDate] = useState(null);

  // Month navigation: Left month is current display month
  const [leftMonthDate, setLeftMonthDate] = useState(() => {
    const base = propStartDate ? new Date(propStartDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Right month is left month + 1 month
  const rightMonthDate = useMemo(() => {
    return new Date(leftMonthDate.getFullYear(), leftMonthDate.getMonth() + 1, 1);
  }, [leftMonthDate]);

  // Sync props if controlled
  const activeStart = propStartDate !== undefined ? (propStartDate ? new Date(propStartDate) : null) : selectedStart;
  const activeEnd = propEndDate !== undefined ? (propEndDate ? new Date(propEndDate) : null) : selectedEnd;

  // Clear timestamp for comparison
  const normalize = (date) => {
    if (!date) return null;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const normStart = normalize(activeStart);
  const normEnd = normalize(activeEnd);
  const normHover = normalize(hoverDate);

  // Check if a date is disabled
  const isDateDisabled = (date) => {
    const norm = normalize(date);
    if (norm < effectiveMinDate) return true;
    if (maxDate && norm > normalize(maxDate)) return true;

    // Check custom disabled dates
    if (Array.isArray(disabledDates)) {
      return disabledDates.some((d) => {
        const disabledNorm = normalize(d);
        return disabledNorm && disabledNorm.getTime() === norm.getTime();
      });
    } else if (typeof disabledDates === 'function') {
      return disabledDates(norm);
    }
    return false;
  };

  // Check if date range contains any disabled date
  const rangeHasDisabled = (start, end) => {
    if (!start || !end) return false;
    const cur = new Date(start);
    cur.setDate(cur.getDate() + 1);
    while (cur < end) {
      if (isDateDisabled(cur)) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  };

  // Month Navigation
  const canGoPrev = useMemo(() => {
    const minMonth = new Date(effectiveMinDate.getFullYear(), effectiveMinDate.getMonth(), 1);
    return leftMonthDate > minMonth;
  }, [leftMonthDate, effectiveMinDate]);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    setLeftMonthDate(new Date(leftMonthDate.getFullYear(), leftMonthDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setLeftMonthDate(new Date(leftMonthDate.getFullYear(), leftMonthDate.getMonth() + 1, 1));
  };

  // Click day handler
  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;

    const clickedNorm = normalize(date);

    if (!normStart || (normStart && normEnd)) {
      // First click: Set Start Date
      setSelectedStart(clickedNorm);
      setSelectedEnd(null);
      setHoverDate(null);
      if (onChange) onChange({ startDate: clickedNorm, endDate: null, nightsCount: 0 });
    } else if (normStart && !normEnd) {
      // Second click: Set End Date or Reset Start Date if earlier/blocked
      if (clickedNorm < normStart || rangeHasDisabled(normStart, clickedNorm)) {
        // Reset to new start date
        setSelectedStart(clickedNorm);
        setSelectedEnd(null);
        setHoverDate(null);
        if (onChange) onChange({ startDate: clickedNorm, endDate: null, nightsCount: 0 });
      } else if (clickedNorm.getTime() === normStart.getTime()) {
        // Same date clicked: reset selection
        setSelectedStart(null);
        setSelectedEnd(null);
        setHoverDate(null);
        if (onChange) onChange({ startDate: null, endDate: null, nightsCount: 0 });
      } else {
        // Valid End Date selected
        setSelectedEnd(clickedNorm);
        setHoverDate(null);
        const nights = Math.round((clickedNorm - normStart) / (1000 * 60 * 60 * 24));
        if (onChange) onChange({ startDate: normStart, endDate: clickedNorm, nightsCount: nights });
      }
    }
  };

  // Mouse hover day handler
  const handleDateMouseEnter = (date) => {
    if (!normStart || normEnd) return;
    const hoveredNorm = normalize(date);
    if (hoveredNorm >= normStart && !rangeHasDisabled(normStart, hoveredNorm)) {
      setHoverDate(hoveredNorm);
    } else {
      setHoverDate(null);
    }
  };

  // Calculate active nights count
  const activeNightsCount = useMemo(() => {
    if (normStart && normEnd) {
      return Math.round((normEnd - normStart) / (1000 * 60 * 60 * 24));
    }
    if (normStart && normHover && normHover > normStart) {
      return Math.round((normHover - normStart) / (1000 * 60 * 60 * 24));
    }
    return 0;
  }, [normStart, normEnd, normHover]);

  // Generate grid for a given month
  const renderMonthGrid = (monthDate) => {
    const months = t('common/date_picker:months', { returnObjects: true });
    const weekdays = t('common/date_picker:weekdays', { returnObjects: true });
    
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 6 = Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Empty padding slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Day numbers
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }

    return (
      <div className="drp-month">
        <div className="drp-month-title">
          {months[month]} {year}
        </div>
        <div className="drp-weekdays-grid">
          {weekdays.map((dayName, idx) => (
            <span key={idx} className="drp-weekday">
              {dayName}
            </span>
          ))}
        </div>
        <div className="drp-days-grid">
          {days.map((dateObj, index) => {
            if (!dateObj) {
              return <div key={`empty-${index}`} className="drp-day-cell empty"></div>;
            }

            const cellNorm = normalize(dateObj);
            const disabled = isDateDisabled(dateObj);
            const isStart = normStart && cellNorm.getTime() === normStart.getTime();
            const isEnd = normEnd && cellNorm.getTime() === normEnd.getTime();
            const isHoverEnd = !normEnd && normHover && cellNorm.getTime() === normHover.getTime();

            let isInRange = false;
            let isHoverRange = false;

            if (normStart && normEnd) {
              isInRange = cellNorm > normStart && cellNorm < normEnd;
            } else if (normStart && normHover) {
              isHoverRange = cellNorm > normStart && cellNorm < normHover;
            }

            const classNames = [
              'drp-day-cell',
              disabled ? 'disabled' : '',
              isStart ? 'is-start' : '',
              isEnd ? 'is-end' : '',
              isHoverEnd ? 'is-hover-end' : '',
              isInRange ? 'is-in-range' : '',
              isHoverRange ? 'is-hover-range' : '',
            ].filter(Boolean).join(' ');

            return (
              <button
                key={dateObj.toISOString()}
                type="button"
                className={classNames}
                disabled={disabled}
                onClick={() => handleDateClick(dateObj)}
                onMouseEnter={() => handleDateMouseEnter(dateObj)}
              >
                <span>{dateObj.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="drp-container" dir={i18n.dir()}>
      {/* Header Info & Badge */}
      <div className="drp-header">
        <div className="drp-header-info">
          <CalendarIcon size={18} className="drp-icon" />
          <span>
            {normStart ? normStart.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US') : t('common/date_picker:placeholders.start_date')}
            {normStart ? ' - ' : ''}
            {normEnd
              ? normEnd.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US')
              : normHover
              ? normHover.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US')
              : normStart
              ? t('common/date_picker:placeholders.end_date')
              : ''}
          </span>
        </div>

        {activeNightsCount > 0 && (
          <div className="drp-duration-badge">
            {t('common/date_picker:nights', { count: activeNightsCount })}
          </div>
        )}
      </div>

      {/* Calendars wrapper with navigation */}
      <div className="drp-calendars-wrapper">
        <button
          type="button"
          className="drp-nav-btn prev"
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          aria-label={t('common/date_picker:aria.prev_month')}
        >
          <ChevronRight size={20} />
        </button>

        <div className="drp-calendars">
          {renderMonthGrid(leftMonthDate)}
          {renderMonthGrid(rightMonthDate)}
        </div>

        <button
          type="button"
          className="drp-nav-btn next"
          onClick={handleNextMonth}
          aria-label={t('common/date_picker:aria.next_month')}
        >
          <ChevronLeft size={20} />
        </button>
      </div>
    </div>
  );
}
