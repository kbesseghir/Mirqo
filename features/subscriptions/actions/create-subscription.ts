'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { FREE_SUBSCRIPTION_LIMIT } from '@/features/subscriptions/constants';
import { hasUnlimitedAccess } from '@/lib/plan';
import { isValidDateOnly, optionalText } from '@/lib/validation';
import { logEvent } from '@/lib/analytics';

const createSubscriptionSchema = z.object({
  service_name: z.string().trim().min(1, 'Enter a service name.').max(100, 'Service name must be 100 characters or fewer.'),
  amount: z.coerce.number().finite().min(0, 'Amount cannot be negative.').max(999999999, 'Amount is too large.'),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Enter a valid three-letter currency code.'),
  renewal_date: z.string().refine(isValidDateOnly, 'Choose a valid renewal date.'),
  billing_cycle: z.enum(['monthly', 'yearly', 'trial']),
  billing_interval_months: z.coerce.number().int().min(1).max(120).default(1),
  status: z.enum(['active', 'trial', 'cancelled']),
  reminder_days_before: z.coerce.number().int().refine((value) => [1, 3, 7, 14].includes(value), 'Choose a valid reminder.'),
  notes: z.string().trim().max(1000, 'Notes must be 1,000 characters or fewer.'),
  source_type: z.enum(['manual', 'text', 'screenshot']).default('manual'),
  commitment_type: z.enum(['subscription', 'bnpl', 'membership', 'insurance', 'bill', 'debt', 'other']).default('subscription'),
  counterparty_name: optionalText(100),
  amount_is_variable: z.coerce.boolean().default(false),
  installment_count: z.coerce.number().int().min(1).max(600).optional(),
  installments_paid: z.coerce.number().int().min(0).max(600).optional(),
  debt_direction: z.enum(['i_owe', 'owed_to_me']).optional(),
  original_amount: z.coerce.number().finite().min(0).max(999999999).optional(),
  remaining_balance: z.coerce.number().finite().min(0).max(999999999).optional(),
}).superRefine((value, context) => {
  if (value.commitment_type === 'bnpl') {
    if (!value.installment_count) context.addIssue({ code: z.ZodIssueCode.custom, path: ['installment_count'], message: 'Enter the total number of installments.' });
    if ((value.installments_paid ?? 0) > (value.installment_count ?? 0)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['installments_paid'], message: 'Paid installments cannot exceed the total.' });
  }
  if (value.commitment_type === 'debt' && !value.original_amount) context.addIssue({ code: z.ZodIssueCode.custom, path: ['original_amount'], message: 'Enter the original debt amount.' });
});

const householdMemberIdsSchema = z.array(z.string().uuid()).max(20);

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
    billing_interval_months: formData.get('billing_interval_months') || 1,
    status: formData.get('status'),
    reminder_days_before: formData.get('reminder_days_before'),
    notes: formData.get('notes') ?? '',
    source_type: formData.get('source_type') ?? 'manual',
    commitment_type: formData.get('commitment_type') || 'subscription',
    counterparty_name: formData.get('counterparty_name'),
    amount_is_variable: formData.get('amount_is_variable') === 'true',
    installment_count: formData.get('installment_count') || undefined,
    installments_paid: formData.get('installments_paid') || undefined,
    debt_direction: formData.get('debt_direction') || undefined,
    original_amount: formData.get('original_amount') || undefined,
    remaining_balance: formData.get('remaining_balance') || formData.get('original_amount') || undefined,
  });

  if (!parsed.success) {
    return { success: false, code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const householdMemberIds = householdMemberIdsSchema.safeParse(formData.getAll('household_member_ids'));
  if (!householdMemberIds.success) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Invalid household member selection.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, code: 'UNAUTHENTICATED', message: 'Your session expired. Please log in again.' };

  const { data: profile } = await supabase.from('profiles').select('plan,is_pro,trial_ends_at,activation_ends_at').eq('user_id', user.id).maybeSingle();
  const { count: existingCount } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
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
    if (error) {
      console.error('Subscription insert failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    if (error?.message.includes('free_subscription_limit')) {
      return { success: false, code: 'PLAN_LIMIT', message: 'The free plan supports up to ' + FREE_SUBSCRIPTION_LIMIT + ' subscriptions.' };
    }
    return { success: false, code: 'DATABASE_ERROR', message: 'We could not save this subscription. Please try again.' };
  }
  if (householdMemberIds.data.length > 0) {
    await supabase.from('subscription_splits').insert(
      householdMemberIds.data.map((householdMemberId) => ({ subscription_id: created.id, household_member_id: householdMemberId })),
    );
  }
  await logEvent(supabase, user.id, 'subscription_added', {
    source_type: parsed.data.source_type,
    billing_cycle: parsed.data.billing_cycle,
    currency: parsed.data.currency,
  });
  if ((existingCount ?? 0) === 0) await logEvent(supabase, user.id, 'first_subscription_added');
  return { success: true, id: created.id };
}
