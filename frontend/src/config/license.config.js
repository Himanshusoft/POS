/**
 * Centralized License Duration & Pricing Configuration
 *
 * Base Basic Plan Price: ₹5,000 / year
 *
 * Configured multi-year license duration options with bundled pricing:
 * 1 Year  = ₹5,000  (₹5,000/year)
 * 2 Years = ₹9,000  (₹4,500/year)
 * 3 Years = ₹12,000 (₹4,000/year)
 * 5 Years = ₹20,000 (₹4,000/year) - Recommended / Best Value
 */

export const LICENSE_OPTIONS = [
  {
    years: 1,
    durationLabel: '1 Year',
    price: 5000,
    yearlyEquivalent: 5000,
    days: 365,
    recommended: false,
  },
  {
    years: 2,
    durationLabel: '2 Years',
    price: 9000,
    yearlyEquivalent: 4500,
    days: 730,
    recommended: false,
  },
  {
    years: 3,
    durationLabel: '3 Years',
    price: 12000,
    yearlyEquivalent: 4000,
    days: 1095,
    recommended: false,
  },
  {
    years: 5,
    durationLabel: '5 Years',
    price: 20000,
    yearlyEquivalent: 4000,
    days: 1825,
    recommended: true,
    badge: 'BEST VALUE',
  },
];

export const getLicenseOptionByYears = (years) => {
  const y = Number(years);
  return LICENSE_OPTIONS.find((opt) => opt.years === y) || LICENSE_OPTIONS[0];
};

export const calculateLicensePrice = (years) => {
  const opt = getLicenseOptionByYears(years);
  return opt ? opt.price : 5000;
};

export const calculateLicenseExpiry = (baseDate, years) => {
  const date = new Date(baseDate);
  date.setFullYear(date.getFullYear() + Number(years));
  return date;
};
