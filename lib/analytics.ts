import type { SupabaseClient } from '@supabase/supabase-js';

// Fire-and-forget usage event. Analytics must never break the primary user flow,
// so failures (e.g. offline, RLS mismatch) are swallowed rather than surfaced.
export async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  eventName: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.from('analytics_events').insert({ user_id: userId, event_name: eventName, metadata });
  } catch {
    // ignored on purpose
  }
}
