import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { availabilityApi } from '../api/api';

// ─── Constants ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'host_availability_v1';

// ─── Default Rules ────────────────────────────────────────────────────────────
const DEFAULT_RULES = {
  weekendPattern: 'every',       // every | biweekly | monthly | never
  biweeklyParity: 0,             // 0=even, 1=odd ISO week
  monthlyOccurrence: 1,          // 1–4
  weekendDays: [5, 6],           // Fri=5, Sat=6 (Israeli)
  weekdayOpenDays: [],           // [] = closed on weekdays by default
  noticeCutoffHour: 14,          // same-day auto-close after 14:00
};

// ─── localStorage helpers ─────────────────────────────────────────────────────
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      rules: state.rules,
      overrides: state.overrides,
    }));
  } catch { /* silently ignore */ }
}

// ─── Serialisation: DB ↔ Redux ───────────────────────────────────────────────

/**
 * Convert a backend rule row → Redux rules object.
 * Backend stores arrays as comma-separated strings.
 */
function ruleFromDB(dbRule) {
  return {
    weekendPattern: dbRule.weekend_pattern,
    biweeklyParity: dbRule.biweekly_parity,
    monthlyOccurrence: dbRule.monthly_occurrence,
    weekendDays: dbRule.weekend_days
      ? dbRule.weekend_days.split(',').map(Number).filter((n) => !isNaN(n))
      : [5, 6],
    weekdayOpenDays: dbRule.weekday_open_days
      ? dbRule.weekday_open_days.split(',').map(Number).filter((n) => !isNaN(n))
      : [],
    noticeCutoffHour: dbRule.notice_cutoff_hour,
  };
}

/**
 * Convert Redux rules object → backend PUT /availability/rules payload.
 */
function ruleToDBPayload(rules) {
  return {
    weekend_pattern: rules.weekendPattern,
    biweekly_parity: rules.biweeklyParity,
    monthly_occurrence: rules.monthlyOccurrence,
    weekend_days: rules.weekendDays.join(','),
    weekday_open_days: rules.weekdayOpenDays.join(','),
    notice_cutoff_hour: rules.noticeCutoffHour,
  };
}

/**
 * Convert backend overrides list → Redux overrides map { 'YYYY-MM-DD': 'open'|'closed' }
 */
function overridesFromDB(dbOverrides) {
  return Object.fromEntries(dbOverrides.map((o) => [o.override_date, o.status]));
}

// ─── Pure helpers (exported for use in components) ────────────────────────────

function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getDayOccurrenceInMonth(date) {
  const dayOfWeek = date.getDay();
  let count = 0;
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  while (d <= date) {
    if (d.getDay() === dayOfWeek) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/**
 * Compute the display status for a date string 'YYYY-MM-DD'.
 * Returns: 'open' | 'closed' | 'booked' | 'past' | 'notice_closed'
 *
 * Priority (highest → lowest):
 *   1. Manual override  (ALWAYS wins — per spec)
 *   2. Booking present
 *   3. Recurring rule
 *   4. Past date
 */
export function computeDayStatus(dateStr, rules, overrides, bookings) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (date < today) return 'past';

  // 1. Manual override always wins
  if (overrides[dateStr]) return overrides[dateStr];

  // 2. Active booking
  if (bookings[dateStr]) return 'booked';

  const dayOfWeek = date.getDay();
  const isWeekend = rules.weekendDays.includes(dayOfWeek);

  if (isWeekend) {
    let ruleOpen = false;
    if (rules.weekendPattern === 'every') {
      ruleOpen = true;
    } else if (rules.weekendPattern === 'biweekly') {
      ruleOpen = getISOWeekNumber(date) % 2 === rules.biweeklyParity;
    } else if (rules.weekendPattern === 'monthly') {
      if (dayOfWeek === 6) {
        ruleOpen = getDayOccurrenceInMonth(date) === rules.monthlyOccurrence;
      } else {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        ruleOpen = getDayOccurrenceInMonth(nextDay) === rules.monthlyOccurrence;
      }
    }
    // 'never' → stays false
    if (!ruleOpen) return 'closed';
  } else {
    if (!rules.weekdayOpenDays.includes(dayOfWeek)) return 'closed';
  }

  // Rule says open — check notice period (ONLY for rule-generated days; overrides bypass this)
  if (date.getTime() === today.getTime()) {
    const now = new Date();
    if (now.getHours() >= rules.noticeCutoffHour) return 'notice_closed';
  }

  return 'open';
}

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * Load full availability state from backend on dashboard mount.
 */
export const fetchAvailability = createAsyncThunk(
  'availability/fetchAvailability',
  async (_, { rejectWithValue }) => {
    try {
      const res = await availabilityApi.getDashboard();
      return res.data; // { rule, overrides: [] }
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to load availability');
    }
  }
);

/**
 * Save recurring rules to backend (called from RulesSettingsModal on Save).
 */
const saveRules = createAsyncThunk(
  'availability/saveRules',
  async (rules, { rejectWithValue }) => {
    try {
      const payload = ruleToDBPayload(rules);
      const res = await availabilityApi.saveRules(payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to save rules');
    }
  }
);

/**
 * Set a single date override and persist it to backend.
 */
const saveOverride = createAsyncThunk(
  'availability/saveOverride',
  async ({ dateStr, status }, { rejectWithValue }) => {
    try {
      await availabilityApi.setOverride(dateStr, status);
      return { dateStr, status };
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to save override');
    }
  }
);

/**
 * Delete a single date override from backend.
 */
const removeOverride = createAsyncThunk(
  'availability/removeOverride',
  async ({ dateStr }, { rejectWithValue }) => {
    try {
      await availabilityApi.deleteOverride(dateStr);
      return { dateStr };
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to remove override');
    }
  }
);

// ─── Initial State ────────────────────────────────────────────────────────────
const persisted = loadFromStorage();

const initialState = {
  rules: persisted?.rules ?? DEFAULT_RULES,
  overrides: persisted?.overrides ?? {},
  bookings: {},

  // Loading / sync state
  loading: false,
  syncing: false,  // true while a save is in-flight
  error: null,

  // UI state
  selectedDate: null,
  viewMode: 'month',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  rulesModalOpen: false,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const availabilitySlice = createSlice({
  name: 'availability',
  initialState,
  reducers: {
    // UI: select / deselect a day
    selectDate: (state, action) => { state.selectedDate = action.payload; },
    deselectDate: (state) => { state.selectedDate = null; },

    // UI: month/week toggle
    setViewMode: (state, action) => { state.viewMode = action.payload; },

    // UI: calendar navigation
    navigateMonth: (state, action) => {
      let month = state.currentMonth + action.payload;
      let year = state.currentYear;
      if (month > 11) { month = 0; year++; }
      if (month < 0)  { month = 11; year--; }
      state.currentMonth = month;
      state.currentYear = year;
    },

    // UI: rules modal
    openRulesModal:  (state) => { state.rulesModalOpen = true; },
    closeRulesModal: (state) => { state.rulesModalOpen = false; },

    // Seed bookings from backend
    setBookings: (state, action) => { state.bookings = action.payload; },

    // Optimistic local override (used alongside saveOverride thunk)
    _setOverrideLocal: (state, action) => {
      const { dateStr, status } = action.payload;
      state.overrides[dateStr] = status;
      saveToStorage(state);
    },

    // Optimistic local clear (used alongside removeOverride thunk)
    _clearOverrideLocal: (state, action) => {
      delete state.overrides[action.payload.dateStr];
      saveToStorage(state);
    },

    // Apply rules locally (used alongside saveRules thunk)
    _setRulesLocal: (state, action) => {
      state.rules = { ...state.rules, ...action.payload };
      saveToStorage(state);
    },
  },

  extraReducers: (builder) => {
    // ── fetchAvailability ──
    builder
      .addCase(fetchAvailability.pending, (state) => {
        if (!state.rules) {
          state.loading = true;
        }
        state.syncing = true;
        state.error = null;
      })
      .addCase(fetchAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.syncing = false;
        const { rule, overrides } = action.payload;

        // Merge DB rule into Redux (DB wins over localStorage on load)
        if (rule) {
          state.rules = ruleFromDB(rule);
        }

        // Replace override map with DB data
        state.overrides = overridesFromDB(overrides);
        saveToStorage(state);
      })
      .addCase(fetchAvailability.rejected, (state, action) => {
        state.loading = false;
        state.syncing = false;
        state.error = action.payload;
        // Keep localStorage data as fallback — don't wipe it
      });

    // ── saveRules ──
    builder
      .addCase(saveRules.pending, (state) => { state.syncing = true; })
      .addCase(saveRules.fulfilled, (state, action) => {
        state.syncing = false;
        // Re-apply from confirmed DB response
        state.rules = ruleFromDB(action.payload);
        saveToStorage(state);
      })
      .addCase(saveRules.rejected, (state, action) => {
        state.syncing = false;
        state.error = action.payload;
      });

    // ── saveOverride ──
    builder
      .addCase(saveOverride.pending, (state) => { state.syncing = true; })
      .addCase(saveOverride.fulfilled, (state, action) => {
        state.syncing = false;
        // Confirm the optimistic update
        const { dateStr, status } = action.payload;
        state.overrides[dateStr] = status;
        saveToStorage(state);
      })
      .addCase(saveOverride.rejected, (state, action) => {
        state.syncing = false;
        state.error = action.payload;
      });

    // ── removeOverride ──
    builder
      .addCase(removeOverride.pending, (state) => { state.syncing = true; })
      .addCase(removeOverride.fulfilled, (state, action) => {
        state.syncing = false;
        delete state.overrides[action.payload.dateStr];
        saveToStorage(state);
      })
      .addCase(removeOverride.rejected, (state, action) => {
        state.syncing = false;
        state.error = action.payload;
      });
  },
});

export const {
  selectDate,
  deselectDate,
  setViewMode,
  navigateMonth,
  openRulesModal,
  closeRulesModal,
  setBookings,
  _setOverrideLocal,
  _clearOverrideLocal,
  _setRulesLocal,
} = availabilitySlice.actions;

// ─── Thunk action creators (optimistic + DB sync) ─────────────────────────────

/**
 * Toggle a day override: apply locally first (optimistic) then persist to DB.
 */
export const setOverride = ({ dateStr, status }) => (dispatch) => {
  dispatch(_setOverrideLocal({ dateStr, status }));
  dispatch(saveOverride({ dateStr, status }));
};

/**
 * Clear an override: apply locally first then delete from DB.
 */
export const clearOverride = ({ dateStr }) => (dispatch) => {
  dispatch(_clearOverrideLocal({ dateStr }));
  dispatch(removeOverride({ dateStr }));
};

/**
 * Save rules: apply locally first then persist to DB.
 */
export const setRules = (rules) => (dispatch) => {
  dispatch(_setRulesLocal(rules));
  dispatch(saveRules(rules));
};

export default availabilitySlice.reducer;
