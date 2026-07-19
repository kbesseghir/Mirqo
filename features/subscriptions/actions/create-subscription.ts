'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { FREE_SUBSCRIPTION_LIMIT } from '@/features/subscriptions/constants';
import { hasUnlimitedAccess } from '@/lib/plan';

const createSubscriptionSchema = z.object({
  service_name: z.string().trim().min(1, 'Enter a service name.').max(100, 'Service name must be 100 characters or fewer.'),
  amount: z.coerce.number().finite().min(0, 'Amount cannot be negative.').max(999999999, 'Amount is too large.'),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Enter a valid three-letter currency code.'),
  renewal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid renewal date.'),
  billing_cycle: z.enum(['monthly', 'yearly', 'trial']),
  status: z.enum(['active', 'trial', 'cancelled']),
  reminder_days_before: z.coerce.number().int().refine((value) => [1, 3, 7, 14].includes(value), 'Choose a valid reminder.'),
  notes: z.string().trim().max(1000, 'Notes must be 1,000 characters or fewer.'),
  source_type: z.enum(['manual', 'text', 'screenshot']).default('manual'),
});

export type CreateSubscriptionResult =
  | { success: true; id: string }
  | { success: false; message: string; code?: 'UNAUTHENTICATED' | 'PLAN_LIMIT' | 'VALIDATION_ERROR' | 'DATABASE_ERROR' };

export async function createSubscription(formData: FormData): Promise<CreateSubscriptionResult> {
  const parsed = createSubscriptionSchema.safeParse({
    service_name: formData.get('service_name'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    renewal_date: formData.get('renewal_date'),
    billing_cycle: formData.get('billing_cycle'),
    status: formData.get('status'),
    reminder_days_before: formData.get('reminder_days_before'),
    notes: formData.get('notes') ?? '',
    source_type: formData.get('source_type') ?? 'manual',
  });

  if (!parsed.success) {
    return { success: false, code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const renewalDate = new Date(`${parsed.data.renewal_date}T00:00:00Z`);
  if (Number.isNaN(renewalDate.getTime())) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Choose a valid renewal date.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, code: 'UNAUTHENTICATED', message: 'Your session expired. Please log in again.' };

  const { data: profile } = await supabase.from('profiles').select('plan,is_pro,trial_ends_at,activation_ends_at').eq('user_id', user.id).maybeSingle();
  if (!hasUnlimitedAccess(profile)) {
    const { count, error: countError } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    if (countError) return { success: false, code: 'DATABASE_ERROR', message: 'We could not verify your plan limit. Please try again.' };
    if ((count ?? 0) >= FREE_SUBSCRIPTION_LIMIT) {
      return { success: false, code: 'PLAN_LIMIT', message: `The free plan supports up to ${FREE_SUBSCRIPTION_LIMIT} subscriptions.` };
    }
  }

  const { data: created, error } = await supabase.from('subscriptions').insert({
    ...parsed.data,
    user_id: user.id,
  }).select('id').single();

  if (error || !created) {
    if (error?.message.includes('free_subscription_limit')) {
      return { success: false, code: 'PLAN_LIMIT', message: 'The free plan supports up to ' + FREE_SUBSCRIPTION_LIMIT + ' subscriptions.' };
    }
    return { success: false, code: 'DATABASE_ERROR', message: 'We could not save this subscription. Please try again.' };
  }
  return { success: true, id: created.id };
}
