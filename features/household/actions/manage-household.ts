'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const addSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(100, 'Name must be 100 characters or fewer.'),
  relation: z.string().trim().max(60, 'Relation must be 60 characters or fewer.').optional(),
});

export type HouseholdResult =
  | { success: true }
  | { success: false; message: string };

export async function addHouseholdMember(formData: FormData): Promise<HouseholdResult> {
  const parsed = addSchema.safeParse({
    name: formData.get('name'),
    relation: formData.get('relation') || undefined,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Your session expired.' };

  const { error } = await supabase.from('household_members').insert({
    user_id: user.id,
    name: parsed.data.name,
    relation: parsed.data.relation ?? null,
  });
  if (error) return { success: false, message: 'We could not add this member. Please try again.' };

  revalidatePath('/settings/household');
  revalidatePath('/subscriptions/new');
  revalidatePath('/subscriptions');
  return { success: true };
}

export async function removeHouseholdMember(id: string): Promise<HouseholdResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { success: false, message: 'Invalid member.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Your session expired.' };

  const { error } = await supabase.from('household_members').delete().eq('id', parsed.data).eq('user_id', user.id);
  if (error) return { success: false, message: 'We could not remove this member.' };

  revalidatePath('/settings/household');
  revalidatePath('/subscriptions/new');
  revalidatePath('/subscriptions');
  return { success: true };
}
