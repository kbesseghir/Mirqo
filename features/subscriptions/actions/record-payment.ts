'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { nextRenewalFromPaymentDate } from '@/lib/subscriptions';
import type { Subscription } from '@/types/database';

const schema = z.object({
  subscriptionId: z.string().uuid(),
  amount: z.coerce.number().finite().min(0).max(999999999),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function recordCommitmentPayment(formData: FormData) {
  const parsed = schema.safeParse({ subscriptionId: formData.get('subscription_id'), amount: formData.get('amount'), paidAt: formData.get('paid_at') });
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? 'Check the payment details.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: 'Your session expired. Please sign in again.' };
  const { data } = await supabase.from('subscriptions').select('*').eq('id', parsed.data.subscriptionId).eq('user_id', user.id).maybeSingle();
  if (!data) return { success: false as const, message: 'This commitment was not found.' };
  const subscription = data as Subscription;
  if (subscription.commitment_type === 'debt' && parsed.data.amount > Number(subscription.remaining_balance ?? subscription.original_amount ?? subscription.amount)) {
    return { success: false as const, message: 'The payment cannot be greater than the remaining debt balance.' };
  }
  const duePeriod = subscription.renewal_date;
  const { data: existingPayment, error: existingError } = await supabase.from('commitment_payments').select('id,amount').eq('subscription_id', subscription.id).eq('user_id', user.id).eq('due_date', duePeriod).maybeSingle();
  if (existingError) return { success: false as const, message: 'We could not verify this payment. Please try again.' };
  const { data: insertedPayment, error: paymentError } = existingPayment
    ? { data: existingPayment, error: null }
    : await supabase.from('commitment_payments').insert({ user_id: user.id, subscription_id: subscription.id, amount: parsed.data.amount, currency: subscription.currency, paid_at: parsed.data.paidAt, due_date: duePeriod }).select('id,amount').single();
  if (paymentError) {
    console.error('Payment insert failed', { code: paymentError.code, message: paymentError.message, details: paymentError.details, hint: paymentError.hint });
    if (paymentError.code === '42P01' || paymentError.code === 'PGRST205' || paymentError.message.toLowerCase().includes('commitment_payments')) {
      return { success: false as const, message: 'Payment history is not installed in Supabase yet. Apply migration 202609270003_payment_history.sql, then reload the app.' };
    }
    if (paymentError.code === '42501') return { success: false as const, message: 'Supabase denied access to payment history. Reapply the payment-history migration to install its RLS policy.' };
    if (paymentError.code === '23505') return { success: false as const, message: 'This due period is already paid.' };
    return { success: false as const, message: `We could not record this payment (${paymentError.code || 'database error'}).` };
  }
  const nextDate = nextRenewalFromPaymentDate(subscription.renewal_date, subscription.billing_cycle, subscription.billing_interval_months || 1);
  const nextPaid = subscription.commitment_type === 'bnpl' ? Math.min(subscription.installment_count ?? 0, (subscription.installments_paid ?? 0) + 1) : subscription.installments_paid;
  let nextDebtBalance: number | null = null;
  if (subscription.commitment_type === 'debt') {
    const { data: debtPayments, error: debtPaymentsError } = await supabase.from('commitment_payments').select('amount').eq('subscription_id', subscription.id).eq('user_id', user.id);
    if (debtPaymentsError) {
      if (!existingPayment) await supabase.from('commitment_payments').delete().eq('id', insertedPayment.id).eq('user_id', user.id);
      return { success: false as const, message: 'The debt balance could not be recalculated. Please try again.' };
    }
    const paidTotal = (debtPayments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
    nextDebtBalance = Math.max(0, Number(subscription.original_amount ?? subscription.amount) - paidTotal);
  }
  const complete = (subscription.commitment_type === 'bnpl' && Boolean(subscription.installment_count) && nextPaid === subscription.installment_count) || (subscription.commitment_type === 'debt' && nextDebtBalance === 0);
  const updates: Record<string, unknown> = { renewal_date: nextDate };
  if (subscription.commitment_type === 'bnpl') updates.installments_paid = nextPaid;
  if (subscription.commitment_type === 'debt') updates.remaining_balance = nextDebtBalance;
  if (complete) updates.status = 'expired';
  const { error: updateError } = await supabase.from('subscriptions').update(updates).eq('id', subscription.id).eq('user_id', user.id);
  if (updateError) {
    console.error('Payment follow-up update failed', { code: updateError.code, message: updateError.message, details: updateError.details, hint: updateError.hint });
    if (!existingPayment) await supabase.from('commitment_payments').delete().eq('id', insertedPayment.id).eq('user_id', user.id);
    if (subscription.commitment_type === 'debt' && (updateError.code === 'PGRST204' || updateError.message.includes('remaining_balance'))) return { success: false as const, message: 'Debt tracking is not installed yet. Apply migration 202609270006_debt_tracking.sql, then reload the app.' };
    return { success: false as const, message: 'The payment was not saved because the next due date could not be updated. Please try again.' };
  }
  revalidatePaymentPaths(subscription.id);
  return { success: true as const, paymentId: insertedPayment.id as string, message: existingPayment ? 'The earlier payment was recovered and the next due date is ready.' : complete ? (subscription.commitment_type === 'debt' ? 'Debt fully settled.' : 'Final installment paid — plan completed.') : 'Payment recorded and the next due date is ready.' };
}

const paymentMutationSchema = z.object({ paymentId: z.string().uuid(), subscriptionId: z.string().uuid() });

export async function updateCommitmentPayment(formData: FormData) {
  const base = paymentMutationSchema.safeParse({ paymentId: formData.get('payment_id'), subscriptionId: formData.get('subscription_id') });
  const details = z.object({ amount: z.coerce.number().finite().min(0).max(999999999), paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse({ amount: formData.get('amount'), paidAt: formData.get('paid_at') });
  if (!base.success || !details.success) return { success: false as const, message: 'Check the payment details.' };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: 'Your session expired.' };
  const { data, error } = await supabase.from('commitment_payments').update({ amount: details.data.amount, paid_at: details.data.paidAt }).eq('id', base.data.paymentId).eq('subscription_id', base.data.subscriptionId).eq('user_id', user.id).select('id').maybeSingle();
  if (error || !data) return { success: false as const, message: 'We could not update this payment.' };
  revalidatePaymentPaths(base.data.subscriptionId);
  return { success: true as const, message: 'Payment updated.' };
}

export async function deleteCommitmentPayment(paymentId: string, subscriptionId: string) {
  const parsed = paymentMutationSchema.safeParse({ paymentId, subscriptionId });
  if (!parsed.success) return { success: false as const, message: 'Invalid payment.' };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: 'Your session expired.' };
  const [{ data: payment }, { data: subscription }, { data: latest }] = await Promise.all([
    supabase.from('commitment_payments').select('*').eq('id', parsed.data.paymentId).eq('subscription_id', parsed.data.subscriptionId).eq('user_id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('id', parsed.data.subscriptionId).eq('user_id', user.id).maybeSingle(),
    supabase.from('commitment_payments').select('id').eq('subscription_id', parsed.data.subscriptionId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!payment || !subscription) return { success: false as const, message: 'Payment not found.' };
  const { error } = await supabase.from('commitment_payments').delete().eq('id', payment.id).eq('user_id', user.id);
  if (error) return { success: false as const, message: 'We could not delete this payment.' };
  const isInstallment = subscription.commitment_type === 'bnpl';
  const isDebt = subscription.commitment_type === 'debt';
  const updates: Record<string, unknown> = {};
  if (isInstallment) { updates.installments_paid = Math.max(0, Number(subscription.installments_paid ?? 0) - 1); if (subscription.status === 'expired') updates.status = 'active'; }
  if (isDebt) {
    const { data: remainingPayments } = await supabase.from('commitment_payments').select('amount').eq('subscription_id', subscription.id).eq('user_id', user.id);
    const remainingPaidTotal = (remainingPayments ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
    updates.remaining_balance = Math.max(0, Number(subscription.original_amount ?? subscription.amount) - remainingPaidTotal);
    if (subscription.status === 'expired') updates.status = 'active';
  }
  if (latest?.id === payment.id && payment.due_date) updates.renewal_date = payment.due_date;
  if (Object.keys(updates).length) await supabase.from('subscriptions').update(updates).eq('id', subscription.id).eq('user_id', user.id);
  revalidatePaymentPaths(subscription.id);
  return { success: true as const, message: 'Payment deleted and totals recalculated.' };
}

function revalidatePaymentPaths(subscriptionId: string) {
  for (const path of ['/dashboard', '/subscriptions', `/subscriptions/${subscriptionId}`, '/analytics', '/calendar', '/payments', '/snapshot']) revalidatePath(path);
}
