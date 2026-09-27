import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, HandCoins, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { HouseholdMembersForm } from "@/components/household/household-members-form";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/subscriptions";
import type { HouseholdMember } from "@/types/database";

export default async function Page() {
  const t = getDictionary(await getLocale());
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: members }, { data: subscriptions }] = await Promise.all([
    supabase.from("household_members").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("subscriptions").select("id,amount,currency,status").eq("user_id", user.id).in("status", ["active", "trial"]),
  ]);
  const subscriptionIds = (subscriptions ?? []).map((subscription) => subscription.id);
  const { data: splits } = subscriptionIds.length
    ? await supabase.from("subscription_splits").select("*").in("subscription_id", subscriptionIds)
    : { data: [] };

  const totals: Record<string, Record<string, number>> = {};
  for (const subscription of subscriptions ?? []) {
    const subscriptionSplits = (splits ?? []).filter((split) => split.subscription_id === subscription.id);
    if (!subscriptionSplits.length) continue;
    const perPerson = Number(subscription.amount) / subscriptionSplits.length;
    for (const split of subscriptionSplits) {
      totals[split.household_member_id] ??= {};
      totals[split.household_member_id][subscription.currency] = (totals[split.household_member_id][subscription.currency] ?? 0) + perPerson;
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="relative text-center">
        <Link href="/settings" aria-label={t.preferences.backToAccount} className="absolute start-0 top-1 grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><ArrowLeft size={21} className="rtl:rotate-180" /></Link>
        <h1 className="text-2xl font-bold tracking-tight">{t.household.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.household.subtitle}</p>
      </header>
      <HouseholdMembersForm members={(members ?? []) as HouseholdMember[]} />
      <SettleUpSummary members={(members ?? []) as HouseholdMember[]} totals={totals} t={t.household} />
    </div>
  );
}

function SettleUpSummary({ members, totals, t }: { members: HouseholdMember[]; totals: Record<string, Record<string, number>>; t: Dictionary["household"] }) {
  const hasAnySplit = Object.keys(totals).length > 0;
  return (
    <section className="mt-5 overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)] ring-1 ring-slate-200/60">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><HandCoins size={16} /></span>
        <div>
          <h2 className="text-sm font-bold">{t.settleUpTitle}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t.settleUpDesc}</p>
        </div>
      </div>
      {!hasAnySplit ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <Users className="text-slate-300" size={28} />
          <p className="text-sm text-slate-500">{t.noSplitsYet}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {members.filter((member) => totals[member.id]).map((member) => (
            <div key={member.id} className="flex items-center gap-4 px-5 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white">
                {member.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{member.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t.owesTotal}</p>
              </div>
              <div className="shrink-0 text-end">
                {Object.entries(totals[member.id]).map(([currency, amount]) => (
                  <p key={currency} className="text-sm font-black">{formatMoney(amount, currency)}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
