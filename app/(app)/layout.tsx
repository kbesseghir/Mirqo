import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import { hasUnlimitedAccess } from '@/lib/plan';
import {
  dueRenewalNotifications,
  unreadRenewalCount,
} from '@/lib/notifications';
import type { RenewalNotification } from '@/lib/notifications';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: subscriptions }, { data: reads }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('plan,is_pro,trial_ends_at,activation_ends_at,payday_day')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('notification_reads')
        .select('subscription_id,renewal_date,reminder_days_before')
        .eq('user_id', user.id),
    ]);

  const notifications = dueRenewalNotifications(
    (subscriptions ?? []) as RenewalNotification[],
    new Date(),
    profile?.payday_day ?? null,
  );
  const readKeys = (reads ?? []).map(
    (read) =>
      read.subscription_id +
      '|' +
      read.renewal_date +
      '|' +
      read.reminder_days_before,
  );

  return (
    <AppShell
      email={user.email}
      isPro={hasUnlimitedAccess(profile)}
      unreadNotifications={unreadRenewalCount(notifications, readKeys)}
    >
      {children}
    </AppShell>
  );
}