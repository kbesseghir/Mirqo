import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DetectionFlow } from "@/components/subscriptions/detection-flow";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { createClient } from "@/lib/supabase/server";
import { hasUnlimitedAccess } from "@/lib/plan";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { HouseholdMember } from "@/types/database";

type Method = "scan" | "paste" | "manual";

export default async function Page({
  searchParams,
}: {
  searchParams: { method?: string };
}) {
  const t = getDictionary(await getLocale()).subscriptionsNew;
  const method: Method =
    searchParams.method === "manual"
      ? "manual"
      : searchParams.method === "paste"
        ? "paste"
        : "scan";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ count }, { data: profile }, { data: householdMembers }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select(
        "plan,is_pro,trial_ends_at,activation_ends_at,preferred_currency",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("household_members")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <header className="mb-8 flex items-start gap-3">
        <Link
          href="/subscriptions"
          aria-label={t.backAria}
          className="mt-0.5 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </Link>
        <div className="min-w-0">
          <p className="page-kicker">{t.kicker}</p>
          <h1 className="page-title mt-1">
            {t.title}
          </h1>
          <p className="page-description">
            {t.subtitle}
          </p>
        </div>
      </header>

      <nav
        aria-label={t.methodAria}
        className="mb-8 grid max-w-2xl grid-cols-3 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800"
      >
        <MethodTab method="scan" current={method} label={t.smartScan} />
        <MethodTab method="paste" current={method} label={t.paste} />
        <MethodTab method="manual" current={method} label={t.manual} />
      </nav>

      {method === "manual" ? (
        <SubscriptionForm
          subscriptionCount={count ?? 0}
          isPro={hasUnlimitedAccess(profile)}
          defaultCurrency={profile?.preferred_currency ?? "USD"}
          householdMembers={(householdMembers ?? []) as HouseholdMember[]}
          embedded
        />
      ) : (
        <DetectionFlow
          key={method}
          initialMethod={method === "scan" ? "screenshot" : "email"}
          embedded
        />
      )}
    </div>
  );
}

function MethodTab({
  method,
  current,
  label,
}: {
  method: Method;
  current: Method;
  label: string;
}) {
  const active = method === current;
  return (
    <Link
      href={`/subscriptions/new?method=${method}`}
      aria-current={active ? "page" : undefined}
      className={`rounded-xl px-3 py-3 text-center text-sm font-semibold transition ${
        active
          ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900"
          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
