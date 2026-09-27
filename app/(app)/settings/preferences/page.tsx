import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CurrencyPreferenceForm } from "@/components/profile/currency-preference-form";
import { PaydayForm } from "@/components/profile/payday-form";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function Page() {
  const t = getDictionary(await getLocale()).preferences;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("preferred_currency,payday_day").maybeSingle();
  return (
    <div className="mx-auto max-w-2xl">
      <header className="relative text-center">
        <Link href="/settings" aria-label={t.backToAccount} className="absolute start-0 top-1 grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><ArrowLeft size={21} className="rtl:rotate-180" /></Link>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
      </header>
      <CurrencyPreferenceForm initialCurrency={profile?.preferred_currency ?? "USD"} />
      <p className="mt-4 rounded-[18px] bg-blue-50 p-4 text-xs leading-5 text-blue-700">
        {t.noFakeRates}
      </p>
      <PaydayForm initialPayday={profile?.payday_day ?? null} />
    </div>
  );
}
