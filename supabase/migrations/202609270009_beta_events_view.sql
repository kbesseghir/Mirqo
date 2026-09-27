-- Keep the existing analytics_events table as the single low-cost beta event store.
-- This view gives reporting a beta-specific name without duplicating sensitive data.
create or replace view public.beta_events as select id, user_id, event_name, created_at from public.analytics_events;
revoke all on public.beta_events from anon, authenticated;
