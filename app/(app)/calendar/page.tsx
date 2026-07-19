import { createClient } from '@/lib/supabase/server';
import type { Subscription } from '@/types/database';
import { CalendarView } from '@/components/calendar/calendar-view';

export default async function Page() {
  const supabase = await createClient();
  const [{ data }, { data: connection }] = await Promise.all([
    supabase.from('subscriptions').select('*').order('renewal_date'),
    supabase.from('google_calendar_connections').select('user_id').maybeSingle(),
  ]);

  return (
    <CalendarView
      subscriptions={(data ?? []) as Subscription[]}
      calendarConnected={Boolean(connection)}
    />
  );
}