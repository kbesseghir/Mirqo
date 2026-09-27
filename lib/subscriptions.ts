import type { Subscription } from '@/types/database';
export function monthlyEquivalent(s:Subscription){if(s.status==='cancelled'||s.status==='expired')return 0;const months=s.billing_cycle==='trial'?1:(s.billing_interval_months||(s.billing_cycle==='yearly'?12:1));return Number(s.amount)/months}
export function formatMoney(amount:number,currency='USD'){return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:2}).format(amount)}
export function daysUntil(date:string){const today=new Date();today.setHours(0,0,0,0);const target=new Date(`${date}T00:00:00`);return Math.ceil((target.getTime()-today.getTime())/86400000)}

function dateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addMonthsClamped(date: Date, months: number) {
  const targetMonth = date.getMonth() + months;
  const lastDay = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();
  return new Date(date.getFullYear(), targetMonth, Math.min(date.getDate(), lastDay));
}

function addYearsClamped(date: Date, years: number) {
  const targetYear = date.getFullYear() + years;
  const lastDay = new Date(targetYear, date.getMonth() + 1, 0).getDate();
  return new Date(targetYear, date.getMonth(), Math.min(date.getDate(), lastDay));
}

/** Converts a payment date entered during manual setup into the next expected renewal date. */
export function nextRenewalFromPaymentDate(dateOnly: string, billingCycle: Subscription['billing_cycle'], intervalMonths = billingCycle === 'yearly' ? 12 : 1) {
  const date = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(date.getTime()) || billingCycle === 'trial') return dateOnly;
  return addMonthsClamped(date, intervalMonths)
    .toISOString()
    .slice(0, 10);
}

/**
 * Returns the next expected cycle date without changing the stored renewal date.
 * Trials and inactive subscriptions are intentionally never advanced.
 */
export function effectiveRenewalDate(
  subscription: Pick<Subscription, 'renewal_date' | 'billing_cycle' | 'billing_interval_months' | 'commitment_type' | 'status'>,
  now = new Date(),
) {
  if (
    subscription.status !== 'active' ||
    subscription.commitment_type === 'bill' ||
    subscription.commitment_type === 'bnpl' ||
    (subscription.billing_cycle !== 'monthly' && subscription.billing_cycle !== 'yearly')
  ) return subscription.renewal_date;

  const stored = new Date(`${subscription.renewal_date}T00:00:00`);
  if (Number.isNaN(stored.getTime())) return subscription.renewal_date;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (stored >= today) return subscription.renewal_date;

  let next = stored;
  if (subscription.billing_cycle === 'monthly') {
    const elapsedMonths = Math.max(
      1,
      (today.getFullYear() - stored.getFullYear()) * 12 + today.getMonth() - stored.getMonth(),
    );
    const interval = Math.max(1, subscription.billing_interval_months || 1);
    const cycles = Math.max(1, Math.floor(elapsedMonths / interval));
    next = addMonthsClamped(stored, cycles * interval);
    if (next < today) next = addMonthsClamped(stored, (cycles + 1) * interval);
  } else {
    const elapsedYears = Math.max(1, today.getFullYear() - stored.getFullYear());
    next = addYearsClamped(stored, elapsedYears);
    if (next < today) next = addYearsClamped(stored, elapsedYears + 1);
  }
  return dateOnly(next);
}

export function withEffectiveRenewalDate<T extends Subscription>(subscription: T, now = new Date()): T {
  return { ...subscription, renewal_date: effectiveRenewalDate(subscription, now) };
}

export type CurrencyTotal={currency:string;monthly:number;yearly:number};
export function totalsByCurrency(subscriptions:Subscription[]):CurrencyTotal[]{const values=new Map<string,number>();for(const subscription of subscriptions){const currency=subscription.currency.toUpperCase();values.set(currency,(values.get(currency)??0)+monthlyEquivalent(subscription))}return[...values.entries()].map(([currency,monthly])=>({currency,monthly,yearly:monthly*12})).sort((a,b)=>a.currency==='USD'?-1:b.currency==='USD'?1:a.currency.localeCompare(b.currency))}
export function preferredCurrency(totals:CurrencyTotal[],requested?:string){const normalized=requested?.toUpperCase();return totals.some(total=>total.currency===normalized)?normalized!:totals.find(total=>total.currency==='USD')?.currency??totals[0]?.currency??'USD'}
