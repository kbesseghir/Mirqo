import { createClient } from '@/lib/supabase/server';
import type { RenewalNotification } from '@/lib/notifications';
import { dueRenewalNotifications } from '@/lib/notifications';
import { NotificationsView } from '@/components/notifications/notifications-view';

export default async function Page() {
  const supabase = await createClient();
  const [{ data }, { data: reads }] = await Promise.all([
    supabase.from('subscriptions').select('id,service_name,amount,currency,renewal_date,reminder_days_before,status').order('renewal_date'),
    supabase.from('notification_reads').select('subscription_id,renewal_date,reminder_days_before'),
  ]);

  const notifications = dueRenewalNotifications((data ?? []) as RenewalNotification[]);
  const keys = (reads ?? []).map(
    (read) => read.subscription_id + '|' + read.renewal_date + '|' + read.reminder_days_before,
  );

  return <NotificationsView notifications={notifications} initialReadKeys={keys} />;
}