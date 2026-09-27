'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/analytics';

const schema = z.object({ type: z.enum(['bug','idea','confusing','other']), message: z.string().trim().min(1).max(2000) });
export async function submitFeedback(input: { type: string; message: string }) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Choose a type and enter a message.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Your session expired.' };
  const { error } = await supabase.from('beta_feedback').insert({ user_id: user.id, feedback_type: parsed.data.type, message: parsed.data.message });
  if (error) return { success: false, message: 'We could not send your feedback yet.' };
  await logEvent(supabase, user.id, 'feedback_sent', { type: parsed.data.type });
  return { success: true };
}
