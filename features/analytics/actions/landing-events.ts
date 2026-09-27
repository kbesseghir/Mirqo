'use server';
import { createClient } from '@/lib/supabase/server';
export async function logLandingEvent(eventName: string) {
  const allowed = ['landing_view','hero_start_free_clicked','navbar_start_free_clicked','hero_see_how_it_works_clicked','beta_join_clicked','final_cta_clicked','sign_in_clicked'];
  if (!allowed.includes(eventName)) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('analytics_events').insert({ user_id: user?.id ?? null, event_name: eventName, metadata: {} });
}
