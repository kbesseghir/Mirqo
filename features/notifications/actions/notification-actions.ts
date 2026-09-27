'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { dueRenewalNotifications, notificationKey } from '@/lib/notifications';
import type { RenewalNotification } from '@/lib/notifications';

const itemSchema = z.object({
  subscription_id: z.string().uuid(),
  renewal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reminder_days_before: z.number().int().refine((value) => [1, 3, 7, 14].includes(value)),
});

export type NotificationItem = z.infer<typeof itemSchema>;
type ActionResult = { success: true } | { success: false; message: string };

function revalidateNotifications() {
  revalidatePath('/notifications');
  revalidatePath('/', 'layout');
}

function itemKey(value: NotificationItem) {
  return value.subscription_id + '|' + value.renewal_date + '|' + value.reminder_days_before;
}

export async function markNotificationRead(value: NotificationItem): Promise<ActionResult> {
  const parsed = itemSchema.safeParse(value);
  if (!parsed.success) return { success: false, message: 'Invalid notification.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Your session expired.' };

  const { data } = await supabase
    .from('subscriptions')
    .select('id,service_name,amount,currency,renewal_date,reminder_days_before,billing_cycle,billing_interval_months,commitment_type,status')
    .eq('id', parsed.data.subscription_id)
    .eq('user_id', user.id)
    .maybeSingle();

  const due = data ? dueRenewalNotifications([data as RenewalNotification]) : [];
  if (!due.length || notificationKey(due[0]) !== itemKey(parsed.data)) {
    return { success: false, message: 'This reminder is no longer active.' };
  }

  const { error } = await supabase.from('notification_reads').upsert(
    { ...parsed.data, user_id: user.id },
    { onConflict: 'user_id,subscription_id,renewal_date,reminder_days_before' },
  );
  if (error) return { success: false, message: 'We could not mark this reminder as read.' };

  revalidateNotifications();
  return { success: true };
}

export async function markAllNotificationsRead(values: NotificationItem[]): Promise<ActionResult> {
  const parsed = z.array(itemSchema).max(100).safeParse(values);
  if (!parsed.success) return { success: false, message: 'Invalid notifications.' };
  if (!parsed.data.length) return { success: true };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Your session expired.' };

  const ids = [...new Set(parsed.data.map((value) => value.subscription_id))];
  const { data } = await supabase
    .from('subscriptions')
    .select('id,service_name,amount,currency,renewal_date,reminder_days_before,billing_cycle,billing_interval_months,commitment_type,status')
    .eq('user_id', user.id)
    .in('id', ids);

  const due = dueRenewalNotifications((data ?? []) as RenewalNotification[]);
  const requested = new Set(parsed.data.map(itemKey));
  const rows = due
    .filter((notification) => requested.has(notificationKey(notification)))
    .map((notification) => ({
      user_id: user.id,
      subscription_id: notification.id,
      renewal_date: notification.renewal_date,
      reminder_days_before: notification.reminder_days_before,
    }));

  if (rows.length) {
    const { error } = await supabase.from('notification_reads').upsert(rows, {
      onConflict: 'user_id,subscription_id,renewal_date,reminder_days_before',
    });
    if (error) return { success: false, message: 'We could not mark all reminders as read.' };
  }

  revalidateNotifications();
  return { success: true };
}
