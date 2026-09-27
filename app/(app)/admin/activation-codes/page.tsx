import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ActivationCodeAdmin, type ActivationCodeRow } from '@/components/billing/activation-code-admin';
import { getLocale } from '@/lib/i18n/get-locale';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function Page() {
  const t = getDictionary(await getLocale()).admin;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc('is_activation_admin');
  if (!isAdmin) redirect('/settings');
  const { data, error } = await supabase.rpc('list_pro_activation_codes');
  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t.kicker}</p>
        <h1 className="mt-1 text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
      </header>
      {error
        ? <p className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{t.migrationNeeded}</p>
        : <ActivationCodeAdmin codes={(data ?? []) as ActivationCodeRow[]} />}
    </div>
  );
}
