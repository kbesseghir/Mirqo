'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function startProTrial() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Your session expired.' };

  const { data, error } = await supabase.rpc('start_pro_trial');
  if (error || typeof data !== 'string') {
    const reason = error?.message ?? '';
    if (reason.includes('trial_already_used')) return { success: false, message: 'The free trial has already been used.' };
    if (reason.includes('already_pro')) return { success: false, message: 'Your account is already Pro.' };
    return { success: false, message: 'We could not start your trial.' };
  }

  revalidatePath('/upgrade');
  revalidatePath('/profile');
  revalidatePath('/subscriptions/new');
  return { success: true };
}