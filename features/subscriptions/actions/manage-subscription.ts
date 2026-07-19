'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  calendarAccessToken,
  createEvent,
  deleteEvent,
  updateEvent,
} from '@/lib/google-calendar';
import type { Subscription } from '@/types/database';

const idSchema = z.string().uuid('Invalid subscription.');
const statusSchema = z.enum(['active', 'trial', 'cancelled', 'expired']);
const updateSchema = z.object({
  id: idSchema,
  service_name: z.string().trim().min(1, 'Enter a service name.').max(100),
  amount: z.coerce.number().finite().min(0, 'Amount cannot be negative.').max(999999999),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Choose a valid currency.'),
  renewal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid renewal date.'),
  billing_cycle: z.enum(['monthly', 'yearly', 'trial']),
  status: statusSchema,
  reminder_days_before: z.coerce.number().int().refine((value) => [1, 3, 7, 14].includes(value), 'Choose a valid reminder.'),
  notes: z.string().trim().max(1000, 'Notes must be 1,000 characters or fewer.'),
});

export type ManageResult =
  | { success: true; message?: string; needsConnection?: boolean }
  | { success: false; message: string };

async function authenticated() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateSubscription(id: string) {
  revalidatePath('/subscriptions');
  revalidatePath('/subscriptions/' + id);
  revalidatePath('/dashboard');
  revalidatePath('/analytics');
  revalidatePath('/calendar');
  revalidatePath('/notifications');
}

export async function updateSubscription(formData: FormData): Promise<ManageResult> {
  const parsed = updateSchema.safeParse({
    id: formData.get('id'),
    service_name: formData.get('service_name'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    renewal_date: formData.get('renewal_date'),
    billing_cycle: formData.get('billing_cycle'),
    status: formData.get('status'),
    reminder_days_before: formData.get('reminder_days_before'),
    notes: formData.get('notes') ?? '',
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Check the details and try again.' };

  const { supabase, user } = await authenticated();
  if (!user) return { success: false, message: 'Your session expired. Please sign in again.' };

  const { id, ...updates } = parsed.data;
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();

  if (error) return { success: false, message: 'We could not update this subscription. Please try again.' };
  if (!data) return { success: false, message: 'This subscription was not found.' };

  let message = 'Subscription updated.';
  const subscription = data as Subscription;
  if (subscription.calendar_event_id) {
    const token = await calendarAccessToken(user.id);
    if (token) {
      try {
        if (subscription.status === 'cancelled' || subscription.status === 'expired') {
          await deleteEvent(token, subscription.calendar_event_id);
          await supabase
            .from('subscriptions')
            .update({ calendar_event_id: null })
            .eq('id', id)
            .eq('user_id', user.id);
          message = 'Subscription updated and removed from Google Calendar.';
        } else {
          await updateEvent(token, subscription.calendar_event_id, subscription);
          message = 'Subscription and Google Calendar updated.';
        }
      } catch {
        message = 'Subscription updated, but Google Calendar could not be synchronized.';
      }
    } else {
      message = 'Subscription updated. Reconnect Google Calendar to synchronize it.';
    }
  }

  revalidateSubscription(id);
  return { success: true, message };
}

export async function setSubscriptionStatus(idValue: string, statusValue: string): Promise<ManageResult> {
  const parsed = z.object({ id: idSchema, status: statusSchema }).safeParse({ id: idValue, status: statusValue });
  if (!parsed.success) return { success: false, message: 'Invalid subscription status.' };

  const { supabase, user } = await authenticated();
  if (!user) return { success: false, message: 'Your session expired. Please sign in again.' };

  const { data: current } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!current) return { success: false, message: 'This subscription was not found.' };

  let calendarRemoved = false;
  let calendarRemovalFailed = false;
  if ((parsed.data.status === 'cancelled' || parsed.data.status === 'expired') && current.calendar_event_id) {
    const token = await calendarAccessToken(user.id);
    if (token) {
      try {
        await deleteEvent(token, current.calendar_event_id);
        calendarRemoved = true;
      } catch {
        calendarRemovalFailed = true;
        // Status changes must remain available if Google is temporarily unavailable.
      }
    }
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: parsed.data.status,
      ...(calendarRemoved ? { calendar_event_id: null } : {}),
    })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) return { success: false, message: 'We could not change the subscription status.' };
  if (!data) return { success: false, message: 'This subscription was not found.' };

  revalidateSubscription(parsed.data.id);
  return {
    success: true,
    message: calendarRemoved
      ? 'Status updated and the Google Calendar event was removed.'
      : calendarRemovalFailed
        ? 'Status updated in Mirqo, but the Google Calendar event could not be removed.'
        : 'Subscription status updated.',
  };
}

export async function syncSubscriptionCalendar(idValue: string): Promise<ManageResult> {
  const parsed = idSchema.safeParse(idValue);
  if (!parsed.success) return { success: false, message: 'Invalid subscription.' };

  const { supabase, user } = await authenticated();
  if (!user) return { success: false, message: 'Your session expired. Please sign in again.' };

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', parsed.data)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return { success: false, message: 'This subscription was not found.' };

  const subscription = data as Subscription;
  if (subscription.status === 'cancelled' || subscription.status === 'expired') {
    return { success: false, message: 'Reactivate this subscription before adding it to Google Calendar.' };
  }

  const token = await calendarAccessToken(user.id);
  if (!token) return { success: true, needsConnection: true };

  try {
    if (subscription.calendar_event_id) {
      await updateEvent(token, subscription.calendar_event_id, subscription);
    } else {
      const event = await createEvent(token, subscription);
      const { error } = await supabase
        .from('subscriptions')
        .update({ calendar_event_id: event.id })
        .eq('id', subscription.id)
        .eq('user_id', user.id);
      if (error) throw error;
    }
  } catch {
    return { success: false, message: 'Google Calendar could not be synchronized. Try reconnecting it.' };
  }

  revalidateSubscription(subscription.id);
  return { success: true, message: 'Google Calendar is synchronized.' };
}

export async function removeSubscriptionCalendar(idValue: string): Promise<ManageResult> {
  const parsed = idSchema.safeParse(idValue);
  if (!parsed.success) return { success: false, message: 'Invalid subscription.' };

  const { supabase, user } = await authenticated();
  if (!user) return { success: false, message: 'Your session expired. Please sign in again.' };

  const { data } = await supabase
    .from('subscriptions')
    .select('calendar_event_id')
    .eq('id', parsed.data)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return { success: false, message: 'This subscription was not found.' };
  if (!data.calendar_event_id) return { success: true, message: 'This subscription is not linked to Google Calendar.' };

  const token = await calendarAccessToken(user.id);
  if (!token) return { success: false, message: 'Reconnect Google Calendar before removing this event.' };

  try {
    await deleteEvent(token, data.calendar_event_id);
  } catch {
    return { success: false, message: 'The Google Calendar event could not be removed.' };
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({ calendar_event_id: null })
    .eq('id', parsed.data)
    .eq('user_id', user.id);
  if (error) return { success: false, message: 'The event was removed, but Mirqo could not update its sync status.' };

  revalidateSubscription(parsed.data);
  return { success: true, message: 'Removed from Google Calendar.' };
}

export async function deleteSubscription(idValue: string): Promise<ManageResult> {
  const parsed = idSchema.safeParse(idValue);
  if (!parsed.success) return { success: false, message: 'Invalid subscription.' };

  const { supabase, user } = await authenticated();
  if (!user) return { success: false, message: 'Your session expired. Please sign in again.' };

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', parsed.data)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!subscription) return { success: false, message: 'This subscription was not found.' };

  if (subscription.calendar_event_id) {
    const token = await calendarAccessToken(user.id);
    if (token) {
      try {
        await deleteEvent(token, subscription.calendar_event_id);
      } catch {
        // Do not trap the user's Mirqo data when Google is unavailable.
      }
    }
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', parsed.data)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) return { success: false, message: 'We could not delete this subscription.' };
  if (!data) return { success: false, message: 'This subscription was not found.' };

  revalidateSubscription(parsed.data);
  return { success: true };
}