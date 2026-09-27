import { DetectedSubscription } from '@/features/subscriptions/types/detected-subscription';

const services = [
  'Netflix', 'Spotify', 'Adobe CC', 'Adobe Creative Cloud', 'Figma', 'Notion', 'GitHub',
  'iCloud', 'YouTube Premium', 'YouTube', 'Microsoft 365', 'Amazon Prime', 'Apple Music',
  'Google One', 'Dropbox', 'Canva', 'ChatGPT', 'Disney+', 'Hulu', 'HBO Max', 'Max',
  '1Password', 'Framer', 'Linear', 'Loom', 'Vercel',
  // MENA / Gulf / Algeria regional services
  'Shahid', 'Shahid VIP', 'OSN', 'OSN+', 'STARZPLAY', 'Anghami', 'Jawwy TV', 'beIN Connect',
  'beIN Sports', 'Djezzy', 'Ooredoo', 'Mobilis', 'STC', 'Jawwy', 'Careem', 'Talabat', 'Noon',
  'Jahez', 'Yassir', 'Virgin Mobile', 'Etisalat', 'du',
];

const currencySymbols: Record<string, string> = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
  EUR: 'EUR', GBP: 'GBP', QAR: 'QAR', AED: 'AED', SAR: 'SAR', CAD: 'CAD',
  AUD: 'AUD', JPY: 'JPY', DZD: 'DZD',
  // Arabic currency symbols / abbreviations
  'د.ج': 'DZD', 'دج': 'DZD',
  'ر.س': 'SAR',
  'ر.ق': 'QAR',
  'د.إ': 'AED', 'درهم': 'AED',
  'ريال': 'SAR', // ambiguous Gulf riyal, defaults to SAR
};

const monthNames = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec';

// Modern Standard Arabic month names
const arabicMonthsMsa = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
// Algerian / Maghreb (French-derived) month names
const arabicMonthsMaghreb = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const arabicMonthLookup = new Map<string, number>();
[arabicMonthsMsa, arabicMonthsMaghreb].forEach((list) => list.forEach((name, index) => arabicMonthLookup.set(name, index + 1)));

export function parseSubscriptionText(raw: string): DetectedSubscription {
  const text = normalizeArabicDigits(raw).replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  if (text.length < 10) throw new Error('Not enough readable text was found.');
  const warnings: string[] = [];
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  const service = findService(text, lines);
  if (!service.found) warnings.push('Service name was not recognized. Please check it.');

  const price = findPrice(lines);
  if (!price.found) warnings.push('Recurring amount was not recognized. Please enter it.');

  const billing = findBilling(text);
  const renewal = findRenewal(lines, billing);
  if (!renewal.found) warnings.push('Renewal date was not recognized. Please choose it.');
  if (renewal.inferred) warnings.push('The next renewal date was calculated from an older billing date.');

  const found = [service.found, price.found, renewal.found].filter(Boolean).length;
  return {
    service_name: service.value,
    amount: price.amount,
    currency: price.currency,
    renewal_date: renewal.value,
    billing_cycle: billing,
    confidence: Math.min(0.95, 0.35 + found * 0.18 + (services.some((name) => name === service.value) ? 0.06 : 0)),
    warnings,
  };
}

// OCR/keyboards sometimes emit Eastern Arabic-Indic digits (٠-٩); normalize to ASCII so
// the existing numeric regexes for price/date detection also work on Arabic-language receipts.
function normalizeArabicDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function findService(text: string, lines: string[]) {
  const known = services.find((name) => new RegExp('\\b' + escapeRegExp(name) + '\\b', 'i').test(text));
  if (known) return { value: known, found: true };
  const from = text.match(/^from:\s*(?:"?)([^<\n"]+)/im)?.[1]?.trim();
  if (from && from.length <= 100) return { value: cleanService(from), found: true };
  const candidate = lines.find((line) =>
    line.length >= 2 &&
    line.length <= 60 &&
    !/^(to|from|subject|date|invoice|receipt|order|payment|subscription|total|amount|renewal|thank|hello|hi)\b/i.test(line) &&
    !/@|https?:|www\.|\d{3,}/i.test(line),
  );
  return { value: candidate ? cleanService(candidate) : 'Unknown service', found: Boolean(candidate) };
}

function cleanService(value: string) {
  return value.replace(/\s+(billing|payments?|receipts?|support|team)$/i, '').trim().slice(0, 100);
}

function findPrice(lines: string[]) {
  const prioritized = [...lines.filter((line) => /(renew|recurring|subscription|plan|charged|charge|total|amount|price|payment)/i.test(line)), ...lines];
  for (const line of prioritized) {
    const match = line.match(
      /(?:\b(USD|EUR|GBP|QAR|AED|SAR|CAD|AUD|JPY|DZD)\b\s*([$€£¥]?)\s*([0-9]+(?:[.,][0-9]{1,2})?))|(?:(\$|€|£|¥|د\.ج|دج|ر\.س|ر\.ق|د\.إ|درهم|ريال)\s*([0-9]+(?:[.,][0-9]{1,2})?))|(?:([0-9]+(?:[.,][0-9]{1,2})?)\s*(USD|EUR|GBP|QAR|AED|SAR|CAD|AUD|JPY|DZD|د\.ج|دج|ر\.س|ر\.ق|د\.إ|درهم|ريال)\b)/i,
    );
    if (!match) continue;
    const code = (match[1] ?? match[7])?.toUpperCase();
    const symbol = match[2] || match[4] || match[7];
    const amount = Number((match[3] ?? match[5] ?? match[6]).replace(',', '.'));
    if (!Number.isFinite(amount)) continue;
    const currency = (code && currencySymbols[code] ? code : null) ?? currencySymbols[symbol ?? ''] ?? 'USD';
    return { amount, currency, found: true };
  }
  return { amount: 0, currency: 'USD', found: false };
}

function findBilling(text: string): DetectedSubscription['billing_cycle'] {
  if (/free trial|trial period|trial ends|فترة تجريبية/i.test(text)) return 'trial';
  if (/annual|annually|yearly|per year|\/\s*(yr|year)|every 12 months|سنوي(?:اً)?/i.test(text)) return 'yearly';
  return 'monthly';
}

function findRenewal(lines: string[], billing: DetectedSubscription['billing_cycle']) {
  const prioritized = [...lines.filter((line) => /(renew|next (payment|charge|billing)|due|trial ends|bill again|تجديد|استحقاق)/i.test(line)), ...lines];
  for (const line of prioritized) {
    const date = parseDate(line);
    if (!date) continue;
    let inferred = false;
    const today = startOfToday();
    if (date < today) {
      inferred = true;
      while (date < today) {
        if (billing === 'yearly') date.setFullYear(date.getFullYear() + 1);
        else date.setMonth(date.getMonth() + 1);
      }
    }
    return { value: formatDate(date), found: true, inferred };
  }
  return { value: formatDate(startOfToday()), found: false, inferred: false };
}

function parseDate(value: string) {
  const iso = value.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const named = value.match(new RegExp('\\b(' + monthNames + ')[ .-]+(\\d{1,2})(?:st|nd|rd|th)?[,]?[ .-]+(20\\d{2})\\b', 'i'));
  if (named) return validDate(Number(named[3]), monthNumber(named[1]), Number(named[2]));

  const arabicNamed = matchArabicDate(value);
  if (arabicNamed) return arabicNamed;

  const numeric = value.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](20\d{2})\b/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    return validDate(Number(numeric[3]), first > 12 ? second : first, first > 12 ? first : second);
  }
  return null;
}

// Arabic dates commonly appear as "12 يناير 2026" (day-month-year); handle that order for
// both MSA and Algerian/Maghreb month names.
function matchArabicDate(value: string) {
  const monthPattern = Array.from(arabicMonthLookup.keys()).map(escapeRegExp).join('|');
  const dayThenMonth = value.match(new RegExp('\\b(\\d{1,2})\\s+(' + monthPattern + ')\\s+(20\\d{2})\\b'));
  if (dayThenMonth) return validDate(Number(dayThenMonth[3]), arabicMonthLookup.get(dayThenMonth[2]) ?? 0, Number(dayThenMonth[1]));
  const monthThenDay = value.match(new RegExp('\\b(' + monthPattern + ')\\s+(\\d{1,2})\\s*,?\\s*(20\\d{2})\\b'));
  if (monthThenDay) return validDate(Number(monthThenDay[3]), arabicMonthLookup.get(monthThenDay[1]) ?? 0, Number(monthThenDay[2]));
  return null;
}

function validDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function monthNumber(value: string) {
  return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(value.toLowerCase().slice(0, 3)) + 1;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function escapeRegExp(value: string) {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
