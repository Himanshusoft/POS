/**
 * Country Phone Metadata and Utilities for ApexPOS
 * Provides international calling codes, ISO 3166-1 alpha-2 codes,
 * national number validation rules, formatting, and detection.
 */

export const COUNTRIES = [
  {
    iso2: 'IN',
    name: 'India',
    dialCode: '+91',
    flag: '🇮🇳',
    lengths: [10],
    pattern: /^[6-9]\d{9}$/,
    placeholder: '98765 43210',
    priority: 1,
    format: (d) => d.replace(/(\d{5})(\d{1,5})/, '$1 $2'),
  },
  {
    iso2: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    lengths: [10],
    pattern: /^[2-9]\d{9}$/,
    placeholder: '202 555 0199',
    priority: 2,
    format: (d) => d.replace(/(\d{3})(\d{3})?(\d{1,4})?/, (m, p1, p2, p3) => [p1, p2, p3].filter(Boolean).join(' ')),
  },
  {
    iso2: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '🇬🇧',
    lengths: [9, 10],
    pattern: /^[1-9]\d{8,9}$/,
    placeholder: '7911 123456',
    priority: 3,
    format: (d) => d.replace(/(\d{4})(\d{1,6})/, '$1 $2'),
  },
  {
    iso2: 'CA',
    name: 'Canada',
    dialCode: '+1',
    flag: '🇨🇦',
    lengths: [10],
    pattern: /^[2-9]\d{9}$/,
    placeholder: '416 555 0199',
    priority: 4,
    format: (d) => d.replace(/(\d{3})(\d{3})?(\d{1,4})?/, (m, p1, p2, p3) => [p1, p2, p3].filter(Boolean).join(' ')),
  },
  {
    iso2: 'AU',
    name: 'Australia',
    dialCode: '+61',
    flag: '🇦🇺',
    lengths: [9],
    pattern: /^(?:4\d{8}|[2378]\d{8})$/,
    placeholder: '412 345 678',
    priority: 5,
    format: (d) => d.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1 $2 $3'),
  },
  {
    iso2: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    flag: '🇦🇪',
    lengths: [9],
    pattern: /^(?:5[024568]\d{7}|[234679]\d{7})$/,
    placeholder: '50 123 4567',
    priority: 6,
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{1,4})/, '$1 $2 $3'),
  },
  {
    iso2: 'SA',
    name: 'Saudi Arabia',
    dialCode: '+966',
    flag: '🇸🇦',
    lengths: [9],
    pattern: /^(?:5\d{8}|1[1-3]\d{7})$/,
    placeholder: '51 234 5678',
    priority: 7,
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{1,4})/, '$1 $2 $3'),
  },
  {
    iso2: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    flag: '🇸🇬',
    lengths: [8],
    pattern: /^[689]\d{7}$/,
    placeholder: '8123 4567',
    priority: 8,
    format: (d) => d.replace(/(\d{4})(\d{1,4})/, '$1 $2'),
  },
  {
    iso2: 'DE',
    name: 'Germany',
    dialCode: '+49',
    flag: '🇩🇪',
    lengths: [10, 11],
    pattern: /^[1-9]\d{9,10}$/,
    placeholder: '151 23456789',
    priority: 9,
    format: (d) => d.replace(/(\d{3})(\d{1,8})/, '$1 $2'),
  },
  {
    iso2: 'FR',
    name: 'France',
    dialCode: '+33',
    flag: '🇫🇷',
    lengths: [9],
    pattern: /^[1-9]\d{8}$/,
    placeholder: '6 12 34 56 78',
    priority: 10,
    format: (d) => d.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5'),
  },
  {
    iso2: 'QA',
    name: 'Qatar',
    dialCode: '+974',
    flag: '🇶🇦',
    lengths: [8],
    pattern: /^[3567]\d{7}$/,
    placeholder: '3312 3456',
    format: (d) => d.replace(/(\d{4})(\d{1,4})/, '$1 $2'),
  },
  {
    iso2: 'KW',
    name: 'Kuwait',
    dialCode: '+965',
    flag: '🇰🇼',
    lengths: [8],
    pattern: /^[569]\d{7}$/,
    placeholder: '5123 4567',
    format: (d) => d.replace(/(\d{4})(\d{1,4})/, '$1 $2'),
  },
  {
    iso2: 'OM',
    name: 'Oman',
    dialCode: '+968',
    flag: '🇴🇲',
    lengths: [8],
    pattern: /^[79]\d{7}$/,
    placeholder: '9123 4567',
    format: (d) => d.replace(/(\d{4})(\d{1,4})/, '$1 $2'),
  },
  {
    iso2: 'BH',
    name: 'Bahrain',
    dialCode: '+973',
    flag: '🇧🇭',
    lengths: [8],
    pattern: /^[36]\d{7}$/,
    placeholder: '3600 1234',
    format: (d) => d.replace(/(\d{4})(\d{1,4})/, '$1 $2'),
  },
  {
    iso2: 'NZ',
    name: 'New Zealand',
    dialCode: '+64',
    flag: '🇳🇿',
    lengths: [8, 9, 10],
    pattern: /^[28]\d{7,9}$/,
    placeholder: '21 123 4567',
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{1,5})/, '$1 $2 $3'),
  },
  {
    iso2: 'ZA',
    name: 'South Africa',
    dialCode: '+27',
    flag: '🇿🇦',
    lengths: [9],
    pattern: /^[1-9]\d{8}$/,
    placeholder: '71 234 5678',
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{1,4})/, '$1 $2 $3'),
  },
  {
    iso2: 'MY',
    name: 'Malaysia',
    dialCode: '+60',
    flag: '🇲🇾',
    lengths: [9, 10],
    pattern: /^1[0-46-9]\d{7,8}$/,
    placeholder: '12 345 6789',
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{1,5})/, '$1 $2 $3'),
  },
  {
    iso2: 'JP',
    name: 'Japan',
    dialCode: '+81',
    flag: '🇯🇵',
    lengths: [10],
    pattern: /^[1-9]\d{9}$/,
    placeholder: '90 1234 5678',
    format: (d) => d.replace(/(\d{2})(\d{4})(\d{1,4})/, '$1 $2 $3'),
  },
  {
    iso2: 'CN',
    name: 'China',
    dialCode: '+86',
    flag: '🇨🇳',
    lengths: [11],
    pattern: /^1[3-9]\d{9}$/,
    placeholder: '138 0013 8000',
    format: (d) => d.replace(/(\d{3})(\d{4})(\d{1,4})/, '$1 $2 $3'),
  },
  {
    iso2: 'BR',
    name: 'Brazil',
    dialCode: '+55',
    flag: '🇧🇷',
    lengths: [10, 11],
    pattern: /^[1-9]{2}9?\d{8}$/,
    placeholder: '11 98765 4321',
    format: (d) => d.replace(/(\d{2})(\d{5})(\d{1,4})/, '$1 $2 $3'),
  },
  {
    iso2: 'MX',
    name: 'Mexico',
    dialCode: '+52',
    flag: '🇲🇽',
    lengths: [10],
    pattern: /^[1-9]\d{9}$/,
    placeholder: '55 1234 5678',
    format: (d) => d.replace(/(\d{2})(\d{4})(\d{1,4})/, '$1 $2 $3'),
  },
  {
    iso2: 'ES',
    name: 'Spain',
    dialCode: '+34',
    flag: '🇪🇸',
    lengths: [9],
    pattern: /^[6789]\d{8}$/,
    placeholder: '612 34 56 78',
    format: (d) => d.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
  },
  {
    iso2: 'IT',
    name: 'Italy',
    dialCode: '+39',
    flag: '🇮🇹',
    lengths: [9, 10],
    pattern: /^[03]\d{8,9}$/,
    leadingZeroAllowed: true,
    placeholder: '312 345 6789',
    format: (d) => d.replace(/(\d{3})(\d{3})(\d{1,4})/, '$1 $2 $3'),
  },
  {
    iso2: 'NL',
    name: 'Netherlands',
    dialCode: '+31',
    flag: '🇳🇱',
    lengths: [9],
    pattern: /^[1-9]\d{8}$/,
    placeholder: '6 12345678',
    format: (d) => d.replace(/(\d{1})(\d{8})/, '$1 $2'),
  },
  {
    iso2: 'IE',
    name: 'Ireland',
    dialCode: '+353',
    flag: '🇮🇪',
    lengths: [9],
    pattern: /^[1-9]\d{8}$/,
    placeholder: '85 123 4567',
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{1,4})/, '$1 $2 $3'),
  },
  {
    iso2: 'CH',
    name: 'Switzerland',
    dialCode: '+41',
    flag: '🇨🇭',
    lengths: [9],
    pattern: /^[1-9]\d{8}$/,
    placeholder: '78 123 45 67',
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
  },
  {
    iso2: 'SE',
    name: 'Sweden',
    dialCode: '+46',
    flag: '🇸🇪',
    lengths: [9],
    pattern: /^[1-9]\d{8}$/,
    placeholder: '70 123 45 67',
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
  },
  {
    iso2: 'NO',
    name: 'Norway',
    dialCode: '+47',
    flag: '🇳🇴',
    lengths: [8],
    pattern: /^[49]\d{7}$/,
    placeholder: '412 34 567',
    format: (d) => d.replace(/(\d{3})(\d{2})(\d{3})/, '$1 $2 $3'),
  },
  {
    iso2: 'DK',
    name: 'Denmark',
    dialCode: '+45',
    flag: '🇩🇰',
    lengths: [8],
    pattern: /^[2-9]\d{7}$/,
    placeholder: '20 12 34 56',
    format: (d) => d.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
  },
  {
    iso2: 'FI',
    name: 'Finland',
    dialCode: '+358',
    flag: '🇫🇮',
    lengths: [9, 10],
    pattern: /^[45]\d{8,9}$/,
    placeholder: '40 1234567',
    format: (d) => d.replace(/(\d{2})(\d{7,8})/, '$1 $2'),
  },
  {
    iso2: 'PL',
    name: 'Poland',
    dialCode: '+48',
    flag: '🇵🇱',
    lengths: [9],
    pattern: /^[4-9]\d{8}$/,
    placeholder: '512 345 678',
    format: (d) => d.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'),
  },
  {
    iso2: 'TR',
    name: 'Turkey',
    dialCode: '+90',
    flag: '🇹🇷',
    lengths: [10],
    pattern: /^5\d{9}$/,
    placeholder: '532 123 4567',
    format: (d) => d.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'),
  },
  {
    iso2: 'EG',
    name: 'Egypt',
    dialCode: '+20',
    flag: '🇪🇬',
    lengths: [10],
    pattern: /^1[0125]\d{8}$/,
    placeholder: '10 1234 5678',
    format: (d) => d.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3'),
  },
  {
    iso2: 'NG',
    name: 'Nigeria',
    dialCode: '+234',
    flag: '🇳🇬',
    lengths: [10],
    pattern: /^[789][01]\d{8}$/,
    placeholder: '802 345 6789',
    format: (d) => d.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'),
  },
  {
    iso2: 'KE',
    name: 'Kenya',
    dialCode: '+254',
    flag: '🇰🇪',
    lengths: [9],
    pattern: /^[71]\d{8}$/,
    placeholder: '712 345678',
    format: (d) => d.replace(/(\d{3})(\d{6})/, '$1 $2'),
  },
  {
    iso2: 'PH',
    name: 'Philippines',
    dialCode: '+63',
    flag: '🇵🇭',
    lengths: [10],
    pattern: /^9\d{9}$/,
    placeholder: '917 123 4567',
    format: (d) => d.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'),
  },
  {
    iso2: 'ID',
    name: 'Indonesia',
    dialCode: '+62',
    flag: '🇮🇩',
    lengths: [9, 10, 11, 12],
    pattern: /^8\d{8,11}$/,
    placeholder: '812 3456 7890',
    format: (d) => d.replace(/(\d{3})(\d{4})(\d{1,5})/, '$1 $2 $3'),
  },
  {
    iso2: 'TH',
    name: 'Thailand',
    dialCode: '+66',
    flag: '🇹🇭',
    lengths: [9],
    pattern: /^[689]\d{8}$/,
    placeholder: '81 234 5678',
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3'),
  },
  {
    iso2: 'VN',
    name: 'Vietnam',
    dialCode: '+84',
    flag: '🇻🇳',
    lengths: [9],
    pattern: /^[35789]\d{8}$/,
    placeholder: '91 234 5678',
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3'),
  },
  {
    iso2: 'BD',
    name: 'Bangladesh',
    dialCode: '+880',
    flag: '🇧🇩',
    lengths: [10],
    pattern: /^1[3-9]\d{8}$/,
    placeholder: '1712 345678',
    format: (d) => d.replace(/(\d{4})(\d{6})/, '$1 $2'),
  },
  {
    iso2: 'PK',
    name: 'Pakistan',
    dialCode: '+92',
    flag: '🇵🇰',
    lengths: [10],
    pattern: /^3\d{9}$/,
    placeholder: '300 1234567',
    format: (d) => d.replace(/(\d{3})(\d{7})/, '$1 $2'),
  },
  {
    iso2: 'LK',
    name: 'Sri Lanka',
    dialCode: '+94',
    flag: '🇱🇰',
    lengths: [9],
    pattern: /^7\d{8}$/,
    placeholder: '71 234 5678',
    format: (d) => d.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3'),
  },
  {
    iso2: 'NP',
    name: 'Nepal',
    dialCode: '+977',
    flag: '🇳🇵',
    lengths: [10],
    pattern: /^9[78]\d{8}$/,
    placeholder: '984 1234567',
    format: (d) => d.replace(/(\d{3})(\d{7})/, '$1 $2'),
  },
  {
    iso2: 'BE',
    name: 'Belgium',
    dialCode: '+32',
    flag: '🇧🇪',
    lengths: [9],
    pattern: /^[1-9]\d{8}$/,
    placeholder: '470 12 34 56',
  },
  {
    iso2: 'AT',
    name: 'Austria',
    dialCode: '+43',
    flag: '🇦🇹',
    lengths: [10, 11],
    pattern: /^[1-9]\d{9,10}$/,
    placeholder: '664 1234567',
  },
  {
    iso2: 'PT',
    name: 'Portugal',
    dialCode: '+351',
    flag: '🇵🇹',
    lengths: [9],
    pattern: /^9\d{8}$/,
    placeholder: '912 345 678',
  },
  {
    iso2: 'GR',
    name: 'Greece',
    dialCode: '+30',
    flag: '🇬🇷',
    lengths: [10],
    pattern: /^69\d{8}$/,
    placeholder: '691 234 5678',
  },
  {
    iso2: 'IL',
    name: 'Israel',
    dialCode: '+972',
    flag: '🇮🇱',
    lengths: [9],
    pattern: /^5\d{8}$/,
    placeholder: '50 123 4567',
  },
  {
    iso2: 'HK',
    name: 'Hong Kong',
    dialCode: '+852',
    flag: '🇭🇰',
    lengths: [8],
    pattern: /^[569]\d{7}$/,
    placeholder: '9123 4567',
  },
  {
    iso2: 'KR',
    name: 'South Korea',
    dialCode: '+82',
    flag: '🇰🇷',
    lengths: [9, 10],
    pattern: /^1[0-9]\d{7,8}$/,
    placeholder: '10 1234 5678',
  },
  {
    iso2: 'AR',
    name: 'Argentina',
    dialCode: '+54',
    flag: '🇦🇷',
    lengths: [10],
    pattern: /^9\d{9}$/,
    placeholder: '9 11 1234 5678',
  },
  {
    iso2: 'CL',
    name: 'Chile',
    dialCode: '+56',
    flag: '🇨🇱',
    lengths: [9],
    pattern: /^9\d{8}$/,
    placeholder: '9 1234 5678',
  },
  {
    iso2: 'CO',
    name: 'Colombia',
    dialCode: '+57',
    flag: '🇨🇴',
    lengths: [10],
    pattern: /^3\d{9}$/,
    placeholder: '300 123 4567',
  },
  {
    iso2: 'PE',
    name: 'Peru',
    dialCode: '+51',
    flag: '🇵🇪',
    lengths: [9],
    pattern: /^9\d{8}$/,
    placeholder: '912 345 678',
  },
  {
    iso2: 'MA',
    name: 'Morocco',
    dialCode: '+212',
    flag: '🇲🇦',
    lengths: [9],
    pattern: /^[67]\d{8}$/,
    placeholder: '612 345678',
  },
  {
    iso2: 'GH',
    name: 'Ghana',
    dialCode: '+233',
    flag: '🇬🇭',
    lengths: [9],
    pattern: /^[235]\d{8}$/,
    placeholder: '24 123 4567',
  },
];

// Sort: priority countries first, then alphabetical by country name
COUNTRIES.sort((a, b) => {
  if (a.priority && b.priority) return a.priority - b.priority;
  if (a.priority) return -1;
  if (b.priority) return 1;
  return a.name.localeCompare(b.name);
});

// Dial codes sorted by length descending so longer calling codes (e.g. +971, +880) match before +9 or +8
export const DIAL_CODES_BY_LENGTH = [...COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length
);

export const DEFAULT_COUNTRY = 'IN';

/**
 * Find country by ISO 3166-1 alpha-2 code
 */
export const getCountryByCode = (iso2) => {
  if (!iso2 || typeof iso2 !== 'string') return null;
  const upper = iso2.trim().toUpperCase();
  return COUNTRIES.find((c) => c.iso2 === upper) || null;
};

/**
 * Find country by dialing code (e.g. '+91' or '91')
 */
export const getCountryByDialCode = (dialCode) => {
  if (!dialCode || typeof dialCode !== 'string') return null;
  const formatted = dialCode.startsWith('+') ? dialCode.trim() : `+${dialCode.trim()}`;
  return COUNTRIES.find((c) => c.dialCode === formatted) || null;
};

/**
 * Maps a currency code to a sensible default country code
 */
export const guessCountryFromCurrency = (currencyCode) => {
  if (!currencyCode || typeof currencyCode !== 'string') return DEFAULT_COUNTRY;
  const code = currencyCode.trim().toUpperCase();
  const currencyMap = {
    INR: 'IN',
    '₹': 'IN',
    USD: 'US',
    '$': 'US',
    GBP: 'GB',
    '£': 'GB',
    EUR: 'DE',
    '€': 'DE',
    AED: 'AE',
    'د.إ': 'AE',
    SAR: 'SA',
    CAD: 'CA',
    AUD: 'AU',
    SGD: 'SG',
    MYR: 'MY',
    QAR: 'QA',
    KWD: 'KW',
    OMR: 'OM',
    BHD: 'BH',
    NZD: 'NZ',
    ZAR: 'ZA',
    JPY: 'JP',
    CNY: 'CN',
    BRL: 'BR',
    MXN: 'MX',
    BDT: 'BD',
    PKR: 'PK',
    LKR: 'LK',
    NPR: 'NP',
    PHP: 'PH',
    IDR: 'ID',
    THB: 'TH',
    VND: 'VN',
  };
  return currencyMap[code] || DEFAULT_COUNTRY;
};

/**
 * Extracts numeric digits only from input string
 */
export const sanitizePhoneDigits = (val) => {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
};

/**
 * Parses raw input into country, dialing code, and national number
 * Handles formats like:
 * - "+91 9876543210" -> { countryCode: 'IN', dialCode: '+91', nationalNumber: '9876543210' }
 * - "+1 (202) 555-0199" -> { countryCode: 'US', dialCode: '+1', nationalNumber: '2025550199' }
 * - "9876543210" -> { countryCode: defaultCountry, dialCode: '+91', nationalNumber: '9876543210' }
 */
export const parsePhoneNumber = (rawInput, defaultCountry = DEFAULT_COUNTRY) => {
  if (!rawInput || typeof rawInput !== 'string') {
    const fallback = getCountryByCode(defaultCountry) || getCountryByCode(DEFAULT_COUNTRY);
    return {
      countryCode: fallback.iso2,
      dialCode: fallback.dialCode,
      country: fallback,
      nationalNumber: '',
      fullNumber: '',
    };
  }

  const str = rawInput.trim();

  // If starts with '+', search matching dialing code
  if (str.startsWith('+')) {
    // Strip everything except digits and '+'
    const cleanWithPlus = '+' + str.slice(1).replace(/\D/g, '');
    for (const country of DIAL_CODES_BY_LENGTH) {
      if (cleanWithPlus.startsWith(country.dialCode)) {
        const national = cleanWithPlus.slice(country.dialCode.length);
        return {
          countryCode: country.iso2,
          dialCode: country.dialCode,
          country,
          nationalNumber: national,
          fullNumber: `${country.dialCode} ${national}`.trim(),
        };
      }
    }
  }

  // Not starting with '+': check if digits match Indian 10-digit mobile or defaultCountry
  const digits = str.replace(/\D/g, '');
  const fallback = getCountryByCode(defaultCountry) || getCountryByCode(DEFAULT_COUNTRY);

  // If starts with 91 and has 12 digits, might be Indian number without '+'
  if (digits.length === 12 && digits.startsWith('91')) {
    const inCountry = getCountryByCode('IN');
    return {
      countryCode: 'IN',
      dialCode: inCountry.dialCode,
      country: inCountry,
      nationalNumber: digits.slice(2),
      fullNumber: `${inCountry.dialCode} ${digits.slice(2)}`,
    };
  }

  return {
    countryCode: fallback.iso2,
    dialCode: fallback.dialCode,
    country: fallback,
    nationalNumber: digits,
    fullNumber: digits ? `${fallback.dialCode} ${digits}` : '',
  };
};

/**
 * Validates a national phone number according to country rules
 * Returns { isValid: boolean, error: string }
 */
export const validatePhoneNumber = (
  nationalNumber,
  countryCode = DEFAULT_COUNTRY,
  { required = false } = {}
) => {
  const digits = sanitizePhoneDigits(nationalNumber);

  if (!digits) {
    if (required) {
      return { isValid: false, error: 'Phone number is required' };
    }
    return { isValid: true, error: '' };
  }

  const country = getCountryByCode(countryCode) || getCountryByCode(DEFAULT_COUNTRY);

  // Check for invalid characters in original string if passed
  if (typeof nationalNumber === 'string' && /[a-zA-Z]/.test(nationalNumber)) {
    return { isValid: false, error: 'Phone number cannot contain alphabetic characters' };
  }

  // Enforce country-specific numbering contract
  if (country.iso2 === 'IN') {
    // Exactly 10 digits starting with 6, 7, 8, or 9
    if (digits.length !== 10) {
      return {
        isValid: false,
        error: 'Enter a valid 10-digit Indian mobile number (must be exactly 10 digits)',
      };
    }
    if (!/^[6-9]/.test(digits)) {
      return {
        isValid: false,
        error: 'Enter a valid Indian mobile number starting with 6-9 (e.g. 9876543210)',
      };
    }
    return { isValid: true, error: '' };
  }

  // Length check for other countries
  if (country.lengths && country.lengths.length > 0) {
    if (!country.lengths.includes(digits.length)) {
      const lenStr = country.lengths.join(' or ');
      return {
        isValid: false,
        error: `Enter a valid phone number for ${country.name} (${lenStr} digits required, got ${digits.length})`,
      };
    }
  } else {
    // ITU E.164 standard general fallback: 5 to 15 digits
    if (digits.length < 5 || digits.length > 15) {
      return {
        isValid: false,
        error: `Enter a valid phone number for ${country.name} (between 5 and 15 digits)`,
      };
    }
  }

  // Regex pattern check if defined
  if (country.pattern) {
    if (!country.pattern.test(digits)) {
      return {
        isValid: false,
        error: `Enter a valid phone number for ${country.name} (e.g. ${country.placeholder || 'format does not match'})`,
      };
    }
  }

  return { isValid: true, error: '' };
};

/**
 * Normalizes any phone input into consistent "+<dialCode> <nationalNumber>" format
 */
export const normalizePhoneNumber = (rawInput, defaultCountry = DEFAULT_COUNTRY) => {
  if (!rawInput || !String(rawInput).trim()) return null;
  const parsed = parsePhoneNumber(rawInput, defaultCountry);
  if (!parsed.nationalNumber) return null;
  return `${parsed.dialCode} ${parsed.nationalNumber}`.trim();
};

export default {
  COUNTRIES,
  DEFAULT_COUNTRY,
  getCountryByCode,
  getCountryByDialCode,
  guessCountryFromCurrency,
  sanitizePhoneDigits,
  parsePhoneNumber,
  validatePhoneNumber,
  normalizePhoneNumber,
};
