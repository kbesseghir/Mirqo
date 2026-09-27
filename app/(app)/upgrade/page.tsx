import Link from "next/link";
import { ArrowLeft, Check, Infinity as InfinityIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { activationDaysLeft, hasUnlimitedAccess, trialDaysLeft } from "@/lib/plan";
import { StartTrialButton } from "@/components/billing/start-trial-button";
import { ActivationCodeForm } from "@/components/billing/activation-code-form";
import { logEvent } from "@/lib/analytics";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { format } from "@/lib/i18n/format";

export default async function Page() {
  const t = getDictionary(await getLocale()).upgrade;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("plan,is_pro,trial_started_at,trial_ends_at,activation_ends_at").maybeSingle();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await logEvent(supabase, user.id, "upgrade_page_viewed");
  const unlimited = hasUnlimitedAccess(profile);
  const trialDays = trialDaysLeft(profile);
  const activationDays = activationDaysLeft(profile);
  const usedTrial = Boolean(profile?.trial_started_at);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="relative text-center">
        <Link href="/settings" aria-label={t.backToAccount} className="absolute start-0 top-1 grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><ArrowLeft size={21} className="rtl:rotate-180" /></Link>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
      </header>

      <section className="relative mt-7 overflow-hidden rounded-[22px] bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,.06)] ring-1 ring-slate-200/60 sm:p-8">
        <span className="absolute end-0 top-0 rounded-bl-2xl rtl:rounded-bl-none rtl:rounded-br-2xl bg-indigo-500 px-4 py-2 text-[10px] font-bold text-white">{t.trialBadge}</span>
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600"><InfinityIcon size={22} /></span>
          <h2 className="mt-4 text-xl font-bold">{t.mirqoPro}</h2>
          <p className="mt-2 text-3xl font-black">{t.free} <span className="text-sm font-medium text-slate-500">{t.duringBeta}</span></p>
        </div>
        <div className="my-6 border-t border-slate-100" />
        <ul className="space-y-4">
          {t.benefits.map((benefit) => <li key={benefit} className="flex gap-3 text-sm text-slate-700"><Check size={18} className="shrink-0 text-emerald-500" />{benefit}</li>)}
        </ul>
        <div className="mt-7">
          {profile?.is_pro
            ? <Status>{t.permanentActive}</Status>
            : activationDays > 0
              ? <Status>{activationDays === 1 ? t.activationDayOne : format(t.activationDaysMany, { days: activationDays })}</Status>
              : trialDays > 0
                ? <Status>{trialDays === 1 ? t.trialDayOne : format(t.trialDaysMany, { days: trialDays })}</Status>
                : !usedTrial ? <StartTrialButton /> : <Status>{t.trialEnded}</Status>}
        </div>
        {!profile?.is_pro && activationDays <= 0 && <ActivationCodeForm />}
      </section>

      {unlimited && <p className="mt-5 rounded-[18px] bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-700"><Check size={16} className="me-2 inline" />{t.unlimitedActive}</p>}
      <p className="mt-5 text-center text-xs leading-5 text-slate-500">{t.noPaymentsNote}</p>
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-blue-50 p-4 text-center text-sm font-semibold text-blue-700">{children}</p>;
}
