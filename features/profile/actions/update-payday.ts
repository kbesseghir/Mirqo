'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const paydaySchema = z.coerce.number().int().min(1).max(31).nullable();

export async function updatePaydayDay(value: number | null): Promise<{ success: true } | { success: false; message: string }> {
  const parsed = paydaySchema.safeParse(value);
  if (!parsed.success) return { success: false, message: 'Choose a day between 1 and 31.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Your session expired.' };

  const { error } = await supabase.from('profiles').update({ payday_day: parsed.data }).eq('user_id', user.id);
  if (error) return { success: false, message: 'We could not save your payday.' };

  revalidatePath('/settings/preferences');
  revalidatePath('/notifications');
  return { success: true };
}
