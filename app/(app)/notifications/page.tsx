import { createClient } from '@/lib/supabase/server';
import type { RenewalNotification } from '@/lib/notifications';
import { dueRenewalNotifications } from '@/lib/notifications';
import { NotificationsView } from '@/components/notifications/notifications-view';

export default async function Page() {
  const supabase = await createClient();
  const [{ data }, { data: reads }, { data: profile }] = await Promise.all([
    supabase.from('subscriptions').select('id,service_name,amount,currency,renewal_date,reminder_days_before,billing_cycle,billing_interval_months,commitment_type,status').order('renewal_date'),
    supabase.from('notification_reads').select('subscription_id,renewal_date,reminder_days_before'),
    supabase.from('profiles').select('payday_day').maybeSingle(),
  ]);

  const notifications = dueRenewalNotifications((data ?? []) as RenewalNotification[], new Date(), profile?.payday_day ?? null);
  const keys = (reads ?? []).map(
    (read) => read.subscription_id + '|' + read.renewal_date + '|' + read.reminder_days_before,
  );

  return <NotificationsView notifications={notifications} initialReadKeys={keys} />;
}
