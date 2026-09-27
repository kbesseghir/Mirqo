import type { Subscription } from '@/types/database';
import { effectiveRenewalDate } from '@/lib/subscriptions';

export type RenewalNotification = Pick<
  Subscription,
  | 'id'
  | 'service_name'
  | 'amount'
  | 'currency'
  | 'renewal_date'
  | 'reminder_days_before'
  | 'billing_cycle'
  | 'billing_interval_months'
  | 'commitment_type'
  | 'status'
>;

export function notificationKey(
  value: Pick<Subscription, 'id' | 'renewal_date' | 'reminder_days_before'>,
) {
  return value.id + '|' + value.renewal_date + '|' + value.reminder_days_before;
}

export function daysUntilRenewal(date: string, now = new Date()) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return Number.NaN;
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(year, month - 1, day);
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

/**
 * The payday date that applies to a given renewal: the same-month payday,
 * clamped to the month's last day when paydayDay exceeds it (e.g. 31 in February).
 */
function paydayDateFor(renewal: Date, paydayDay: number) {
  const lastDay = new Date(renewal.getFullYear(), renewal.getMonth() + 1, 0).getDate();
  return new Date(renewal.getFullYear(), renewal.getMonth(), Math.min(paydayDay, lastDay));
}

/**
 * Delays a reminder until payday when the reminder window would otherwise start
 * before the user is paid this cycle, so they are not nudged about a charge before
 * they have funds for it. If payday falls on/after the renewal itself, it is ignored
 * (it would suppress the reminder past its own deadline).
 */
export function isSuppressedByPayday(renewalDate: string, paydayDay: number | null | undefined, now = new Date()) {
  if (!paydayDay) return false;
  const renewal = new Date(`${renewalDate}T00:00:00`);
  const payday = paydayDateFor(renewal, paydayDay);
  if (payday >= renewal) return false;
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const paydayUtc = Date.UTC(payday.getFullYear(), payday.getMonth(), payday.getDate());
  return todayUtc < paydayUtc;
}

export function dueRenewalNotifications(
  subscriptions: RenewalNotification[],
  now = new Date(),
  paydayDay: number | null = null,
): RenewalNotification[] {
  return subscriptions
    .filter(
      (subscription) =>
        subscription.status === 'active' || subscription.status === 'trial',
    )
    .map((subscription) => ({
      ...subscription,
      renewal_date: effectiveRenewalDate(subscription, now),
    }))
    .filter((subscription) => {
      const days = daysUntilRenewal(subscription.renewal_date, now);
      return (
        Number.isFinite(days) &&
        days >= 0 &&
        days <= subscription.reminder_days_before &&
        !isSuppressedByPayday(subscription.renewal_date, paydayDay, now)
      );
    })
    .sort((a, b) => {
      const dayDifference =
        daysUntilRenewal(a.renewal_date, now) -
        daysUntilRenewal(b.renewal_date, now);
      return dayDifference || a.service_name.localeCompare(b.service_name);
    });
}

export function unreadRenewalCount(
  notifications: RenewalNotification[],
  readKeys: Iterable<string>,
) {
  const read = new Set(readKeys);
  return notifications.reduce(
    (count, notification) =>
      count + (read.has(notificationKey(notification)) ? 0 : 1),
    0,
  );
}
