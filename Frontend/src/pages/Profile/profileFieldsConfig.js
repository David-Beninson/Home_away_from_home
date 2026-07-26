export const HOST_FIELDS = {
  city: {
    label: 'עיר מגורים',
    type: 'text',
    required: true,
    icon: '📍',
    placeholder: 'למשל: ירושלים, תל אביב...'
  },
  neighborhood: {
    label: 'שכונה',
    type: 'text',
    icon: '🏡',
    placeholder: 'למשל: רחביה, נחלאות...'
  },
  full_address: {
    label: 'כתובת מלאה',
    type: 'text',
    icon: '🗺️',
    placeholder: 'רחוב ומספר בית (אופציונלי)'
  },
  max_guests: {
    label: 'כמות מתארחים מקסימלית',
    type: 'number',
    min: 1,
    required: true,
    icon: '👥'
  },
  available_spots: {
    label: 'מקומות פנויים לאירוח כעת',
    type: 'number',
    min: 0,
    icon: '✨'
  },
  num_bedrooms: {
    label: 'מספר חדרי שינה / אירוח',
    type: 'number',
    min: 0,
    icon: '🛏️'
  },
  kashrut_level: {
    label: 'רמת כשרות בבית',
    type: 'select',
    icon: '🍷',
    options: [
      { value: 'kosher', label: 'כשר' },
      { value: 'glatt_mehadrin', label: 'גלאט כשר / למהדרין' },
      { value: 'basic', label: 'כשר בסיסי' },
      { value: 'none', label: 'ללא תעודה / לא מקפידים' }
    ]
  },
  religious_orientation: {
    label: 'זיקה דתית / אורח חיים',
    type: 'text',
    icon: '📜',
    placeholder: 'למשל: דתי לאומי, חרדי, מסורתי, חילוני...'
  },
  availability_windows: {
    label: 'חלונות זמינות',
    type: 'text',
    icon: '📅',
    placeholder: 'למשל: כל שבת, שבת כן שבת לא, חגים בלבד...'
  },
  accessibility: {
    label: 'נגישות',
    type: 'text',
    icon: '♿',
    placeholder: 'למשל: מעלית, קומת קרקע, ללא מדרגות...'
  },
  emergency_available: {
    label: 'זמין לאירוח חירום (התראה קצרה)',
    type: 'boolean',
    icon: '🚨'
  },
  has_pets: {
    label: 'יש חיות מחמד בבית',
    type: 'boolean',
    icon: '🐾'
  },
  free_text_notes: {
    label: 'תאר את אווירת שולחן השבת שלך (AI Vibe)',
    type: 'textarea',
    rows: 3,
    fullWidth: true,
    icon: '🎭',
    placeholder: 'לדוגמה: שולחן תוסס עם שירים וניגונים, ארוחות שבת מושקעות עם אוכל עדתי ושיחות עומק אל תוך הלילה...'
  }
};

export const GUEST_FIELDS = {
  service_type: {
    label: 'סוג שירות',
    type: 'select',
    icon: '🎖️',
    options: [
      { value: 'REGULAR', label: 'סדיר' },
      { value: 'RESERVES', label: 'מילואים' },
      { value: 'NATIONAL_SERVICE', label: 'שירות לאומי' },
      { value: 'OTHER', label: 'אחר' }
    ]
  },
  release_date: {
    label: 'תאריך שחרור צפוי',
    type: 'date',
    icon: '📅'
  },
  is_anonymous: {
    label: 'פרופיל אנונימי (הסתרת פרטים מזהים)',
    type: 'boolean',
    icon: '🕵️'
  },
  skills_give_take: {
    label: 'קצת עלייך (תחביבים, כישורים ותחומי עניין)',
    type: 'textarea',
    rows: 3,
    fullWidth: true,
    icon: '🎸',
    placeholder: 'אוהב לנגן, שיחות עומק, משחקי קופסה...'
  }
};

export const USER_BASE_FIELDS = {
  biography: {
    label: 'אודות / ביוגרפיה קצרה',
    type: 'textarea',
    rows: 2,
    fullWidth: true,
    icon: '✍️',
    placeholder: 'רקע קצר על עצמך...'
  }
};

const SYSTEM_IGNORED_KEYS = [
  'id',
  'user_id',
  'created_at',
  'updated_at',
  'atmosphere_vector',
  'preference_vector',
  '_sa_instance_state'
];

/**
 * Dynamically builds complete field definitions by combining pre-configured metadata
 * with any new/unknown fields returned in profileData from backend.
 */
export function getProfileFieldDefinitions(userType, profileData = {}) {
  const basePresets = userType === 'host' ? HOST_FIELDS : GUEST_FIELDS;
  const knownKeys = new Set([...Object.keys(basePresets), ...Object.keys(USER_BASE_FIELDS)]);
  const dynamicFields = {};

  if (profileData && typeof profileData === 'object') {
    Object.keys(profileData).forEach((key) => {
      if (!SYSTEM_IGNORED_KEYS.includes(key) && !knownKeys.has(key)) {
        const val = profileData[key];

        let type = 'text';
        if (typeof val === 'boolean') {
          type = 'boolean';
        } else if (typeof val === 'number') {
          type = 'number';
        } else if (typeof val === 'string' && (val.length > 60 || val.includes('\n'))) {
          type = 'textarea';
        } else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
          type = 'date';
        }

        // Format snake_case key to human readable Hebrew/Title label
        const formattedLabel = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

        dynamicFields[key] = {
          label: formattedLabel,
          type,
          fullWidth: type === 'textarea',
          icon: '📌'
        };
      }
    });
  }

  return {
    ...basePresets,
    ...dynamicFields
  };
}

/**
 * Format a value for presentation in View mode
 */
export function formatFieldValue(value, fieldDef) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (fieldDef?.type === 'boolean') {
    return value ? 'כן' : 'לא';
  }

  if (fieldDef?.type === 'select' && fieldDef.options) {
    const valStr = String(value).toLowerCase();
    const opt = fieldDef.options.find((o) => String(o.value).toLowerCase() === valStr);
    return opt ? opt.label : value;
  }


  if (fieldDef?.type === 'date' && typeof value === 'string') {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('he-IL');
      }
    } catch {
      return value;
    }
  }

  return String(value);
}