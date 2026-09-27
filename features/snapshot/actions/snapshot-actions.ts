'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const incomeSchema = z.object({ amount: z.coerce.number().finite().min(0).max(999999999), currency: z.string().regex(/^[A-Z]{3}$/), month: z.string().regex(/^\d{4}-\d{2}-01$/) });
const spendingSchema = z.object({ amount: z.coerce.number().finite().positive().max(999999999), currency: z.string().regex(/^[A-Z]{3}$/), category: z.enum(['food','gas','shopping','transport','health','entertainment','other']), spent_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(200).optional() });

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function saveMonthlyIncome(input: { amount: string; currency: string; month: string }) {
  const parsed = incomeSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Enter a valid monthly income.' };
  const context = await userClient();
  if (!context) return { success: false, message: 'Your session expired.' };
  const { error } = await context.supabase.from('monthly_income').upsert({ ...parsed.data, user_id: context.user.id }, { onConflict: 'user_id,month,currency' });
  if (error) {
    console.error('Monthly income save failed', { code: error.code, message: error.message, details: error.details, hint: error.hint });
    return { success: false, message: process.env.NODE_ENV === 'development' ? `We could not save your income: ${error.message}` : 'We could not save your income.' };
  }
  revalidatePath('/dashboard');
  revalidatePath('/snapshot');
  return { success: true };
}

export async function addSpendingEntry(input: { amount: string; currency: string; category: string; spent_at: string; note?: string }) {
  const parsed = spendingSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Enter valid spending details.' };
  const context = await userClient();
  if (!context) return { success: false, message: 'Your session expired.' };
  const { error } = await context.supabase.from('spending_entries').insert({ ...parsed.data, user_id: context.user.id });
  if (error) {
    console.error('Spending entry save failed', { code: error.code, message: error.message, details: error.details, hint: error.hint });
    return { success: false, message: process.env.NODE_ENV === 'development' ? `We could not save this spending entry: ${error.message}` : 'We could not save this spending entry.' };
  }
  revalidatePath('/dashboard');
  revalidatePath('/snapshot');
  return { success: true };
}
