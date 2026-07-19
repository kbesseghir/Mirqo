import type { Subscription } from '@/types/database';

export type RenewalNotification = Pick<
  Subscription,
  | 'id'
  | 'service_name'
  | 'amount'
  | 'currency'
  | 'renewal_date'
  | 'reminder_days_before'
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

export function dueRenewalNotifications(
  subscriptions: RenewalNotification[],
  now = new Date(),
): RenewalNotification[] {
  return subscriptions
    .filter(
      (subscription) =>
        subscription.status === 'active' || subscription.status === 'trial',
    )
    .filter((subscription) => {
      const days = daysUntilRenewal(subscription.renewal_date, now);
      return (
        Number.isFinite(days) &&
        days >= 0 &&
        days <= subscription.reminder_days_before
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