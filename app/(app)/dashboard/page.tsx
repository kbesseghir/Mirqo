import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  HandCoins,
  History,
  Plus,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, formatMoney, monthlyEquivalent, preferredCurrency, totalsByCurrency, withEffectiveRenewalDate } from "@/lib/subscriptions";
import type { Subscription } from "@/types/database";
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import { format } from "@/lib/i18n/format";
import { MonthlySnapshotCard } from "@/components/dashboard/monthly-snapshot-card";
import { PwaInstallPrompt } from "@/components/pwa/install-prompt";
import { logEvent } from "@/lib/analytics";

type TimelineGroup = { label: string; items: Subscription[] };
type T = Dictionary["dashboard"];

function renewalLabel(days: number, t: T) {
  if (days === 0) return t.today;
  if (days === 1) return t.tomorrow;
  return format(t.inDays, { days });
}

function renewalTone(days: number) {
  if (days <= 2) return "font-bold text-red-600";
  if (days <= 5) return "font-bold text-orange-600";
  return "font-semibold text-emerald-600";
}

function timelineGroups(subscriptions: Subscription[], t: T) {
  const active = subscriptions
    .filter((subscription) => subscription.status !== "cancelled" && subscription.status !== "expired" && daysUntil(subscription.renewal_date) >= 0)
    .sort((a, b) => daysUntil(a.renewal_date) - daysUntil(b.renewal_date));
  const groups: TimelineGroup[] = [
    { label: t.thisWeek, items: active.filter((subscription) => daysUntil(subscription.renewal_date) <= 7) },
    { label: t.nextWeek, items: active.filter((subscription) => daysUntil(subscription.renewal_date) >= 8 && daysUntil(subscription.renewal_date) <= 14) },
    { label: t.thisMonth, items: active.filter((subscription) => daysUntil(subscription.renewal_date) >= 15 && daysUntil(subscription.renewal_date) <= 31) },
  ];
  return groups.filter((group) => group.items.length > 0);
}

export default async function Dashboard() {
  const locale = await getLocale();
  const t = getDictionary(locale).dashboard;
  const supabase = await createClient();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
  const [{ data, error: subscriptionsError }, { data: { user } }, { data: profile }, { data: incomes, error: incomeError }, { data: spending, error: spendingError }, {data:paymentRows,error:paymentsError}] = await Promise.all([
    supabase.from("subscriptions").select("*").order("renewal_date"),
    supabase.auth.getUser(),
    supabase.from("profiles").select("preferred_currency,plan,is_pro,trial_ends_at,activation_ends_at").maybeSingle(),
    supabase.from("monthly_income").select("amount,currency").eq("month", month),
    supabase.from("spending_entries").select("amount,currency,category").gte("spent_at", month).lt("spent_at", monthEnd),
    supabase.from("commitment_payments").select("amount,currency,subscription_id").gte("paid_at",month).lt("paid_at",monthEnd),
  ]);
  if (user) { void logEvent(supabase, user.id, "dashboard_view"); void logEvent(supabase, user.id, "user_returned"); }
  const storedSubscriptions = (data ?? []) as Subscription[];
  const attentionItems = storedSubscriptions.filter((subscription) => (subscription.commitment_type === "bill" || subscription.commitment_type === "bnpl") && subscription.status === "active" && daysUntil(subscription.renewal_date) <= 3).sort((a,b)=>daysUntil(a.renewal_date)-daysUntil(b.renewal_date));
  const subscriptions = storedSubscriptions.map((subscription) =>
    withEffectiveRenewalDate(subscription),
  );
  const active = subscriptions.filter((subscription) => subscription.status === "active" || subscription.status === "trial");
  const spendable = active.filter((subscription) => subscription.commitment_type !== "debt" || subscription.debt_direction !== "owed_to_me");
  const debts = active.filter((subscription) => subscription.commitment_type === "debt");
  const upcoming = active.filter((subscription) => daysUntil(subscription.renewal_date) >= 0).sort((a, b) => daysUntil(a.renewal_date) - daysUntil(b.renewal_date));
  const next = upcoming[0];
  const totals = totalsByCurrency(spendable);
  const currency = preferredCurrency(totals, profile?.preferred_currency);
  const primary = totals.find((total) => total.currency === currency) ?? { currency, monthly: 0, yearly: 0 };
  const snapshotCurrency = profile?.preferred_currency ?? "USD";
  const snapshotIncome = incomes?.find(item => item.currency === snapshotCurrency);
  const outgoingCommitments = active.filter(item => item.commitment_type !== "debt" || item.debt_direction !== "owed_to_me");
  const snapshotRecurring = outgoingCommitments.filter(item => item.currency === snapshotCurrency).reduce((sum, item) => sum + monthlyEquivalent(item), 0);
  const snapshotPaid = (paymentRows??[]).filter(item=>item.currency===snapshotCurrency && storedSubscriptions.find(subscription=>subscription.id===item.subscription_id)?.debt_direction!=="owed_to_me").reduce((sum,item)=>sum+Number(item.amount),0);
  const snapshot = <MonthlySnapshotCard compact locale={locale} currency={snapshotCurrency} selectedMonth={month.slice(0, 7)} income={Number(snapshotIncome?.amount ?? 0)} recurring={snapshotRecurring} actualPaid={snapshotPaid} spending={(spending ?? []) as { amount: number; category: string; currency: string }[]} loadError={incomeError || spendingError || paymentsError || subscriptionsError ? "Snapshot unavailable" : undefined} />;
  if (!subscriptions.length) return <div className="space-y-6"><div className="max-w-xl">{snapshot}</div><EmptyDashboard t={t} /></div>;
  const trials = active.filter((subscription) => subscription.status === "trial").length;
  const dueThisWeek = upcoming.filter((subscription) => daysUntil(subscription.renewal_date) <= 7).length;
  const recent = [...subscriptions]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4);
  const renewalGroups = timelineGroups(subscriptions, t);
  const mobileUpcoming = renewalGroups.flatMap((group) => group.items);
  const name = user?.user_metadata.full_name?.toString() || user?.email?.split("@")[0] || "there";
  const billingLabels = getDictionary(locale).common;

  return (
    <div className="mobile-dashboard mx-auto max-w-[1480px]">
      <header className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="page-kicker">{t.yourSpace}</p>
          <h1 className="page-title capitalize">{t.hello}, {name}</h1>
          <p className="page-description">{t.everythingClear}</p>
        </div>
      </header>
      <div className="beta-banner mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-800">
        <span>MYRQO Beta — All Pro features are unlocked during early access.</span>
        <PwaInstallPrompt />
      </div>

      {attentionItems.length > 0 && <NeedsAttention items={attentionItems} locale={locale} commitmentTypes={getDictionary(locale).commitmentTypes} />}

      <div className="metric-strip mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard primary label={t.monthlyRecurring} value={formatMoney(primary.monthly, currency)} detail={`${currency} · ${active.length} ${t.active}`} href={`/analytics?currency=${currency}`} />
        <SummaryCard label={t.annualProjected} value={formatMoney(primary.yearly, currency)} detail={t.basedOnCurrentPlans} href={`/analytics?currency=${currency}`} />
        <SummaryCard label={t.activeSubscriptions} value={String(active.length)} detail={`${subscriptions.length} ${t.trackedTotal}`} href="/subscriptions" />
        <SummaryCard label={t.nextPayment} value={next ? formatMoney(Number(next.amount), next.currency) : "—"} detail={next ? `${next.service_name} · ${renewalLabel(daysUntil(next.renewal_date), t)}` : t.noUpcomingRenewal} href={next ? `/subscriptions/${next.id}` : "/calendar"} />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,.72fr)]">
        <section className="workspace-section overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
            <div><h2 className="text-base font-bold">{locale === "ar" ? "المدفوعات القادمة" : "Upcoming payments"}</h2><p className="mt-1 text-xs text-slate-500">{locale === "ar" ? "الاشتراكات والفواتير والأقساط القادمة." : "Subscriptions, bills and installments coming up."}</p></div>
            <Link href="/calendar" className="inline-flex min-h-10 items-center gap-1 rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-600">{t.calendarView} <ChevronRight size={13} className="rtl:rotate-180" /></Link>
          </div>
          <div className="p-4 sm:p-6">
            <div className="hidden space-y-6 sm:block">{renewalGroups.map((group) => <Timeline key={group.label} group={group} t={t} billingLabels={billingLabels} commitmentTypes={getDictionary(locale).commitmentTypes} />)}</div>
            <div className="space-y-2 sm:hidden">
              {mobileUpcoming.slice(0, 4).map((subscription) => <UpcomingMobileRow key={subscription.id} subscription={subscription} t={t} billingLabels={billingLabels} />)}
              {mobileUpcoming.length > 4 && <details className="mobile-upcoming-details">
                <summary><span>{locale === "ar" ? "عرض القائمة كاملة" : "See full list"}</span><ChevronDown size={16} /></summary>
                <div className="mt-2 space-y-2">{mobileUpcoming.slice(4).map((subscription) => <UpcomingMobileRow key={subscription.id} subscription={subscription} t={t} billingLabels={billingLabels} />)}</div>
              </details>}
            </div>
            {!renewalGroups.length && <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center"><p className="text-sm font-semibold">{t.noRenewals31}</p><p className="mt-1 text-xs text-slate-500">{t.laterRenewals}</p></div>}
          </div>
        </section>

        <div className="grid gap-4">
           {snapshot}
           <Insights dueThisWeek={dueThisWeek} trials={trials} t={t} />
           {debts.length > 0 && <DebtsCard debts={debts} t={t} />}
          <RecentActivity subscriptions={recent} t={t} locale={locale} />
        </div>
      </div>
    </div>
  );
}

function NeedsAttention({ items, locale, commitmentTypes }: { items: Subscription[]; locale: Locale; commitmentTypes: Dictionary["commitmentTypes"] }) {
  const ar = locale === "ar";
  return <section className="mt-4 overflow-hidden rounded-[24px] border border-amber-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,.04)]"><div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50/60 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle size={17}/></span><div><h2 className="text-sm font-bold">{ar ? "يحتاج انتباهك" : "Needs attention"}</h2><p className="mt-0.5 text-xs text-slate-500">{ar ? "مدفوعات مستحقة أو قريبة جدًا" : "Due or overdue payments that need a quick check"}</p></div></div><div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">{items.slice(0,6).map(item=>{const days=daysUntil(item.renewal_date);return <Link key={item.id} href={`/subscriptions/${item.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-amber-200 hover:bg-amber-50/40"><ServiceLogo name={item.service_name} className="h-10 w-10 rounded-xl"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.service_name}</span><span className="mt-0.5 block text-[11px] text-slate-500">{commitmentTypes[item.commitment_type]}</span></span><span className="text-end"><strong className="block text-sm">{formatMoney(Number(item.amount),item.currency)}</strong><small className={days<0?"font-bold text-red-600":"font-bold text-amber-600"}>{days<0?(ar?"متأخر":"Overdue"):days===0?(ar?"اليوم":"Today"):`${days}d`}</small></span></Link>})}</div></section>;
}

function SummaryCard({
  label,
  value,
  detail,
  href,
  primary = false,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group min-h-32 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 sm:p-5 ${
        primary
          ? "text-slate-950"
          : "text-slate-950"
      }`}
    >
      <span className={`text-xs font-semibold ${primary ? "text-blue-700" : "text-slate-500"}`}>{label}</span>
      <span className="mt-4 block truncate text-2xl font-black tracking-tight sm:text-3xl">{value}</span>
      <span className={`mt-2 block truncate text-xs ${primary ? "text-slate-500" : "text-slate-400"}`}>{detail}</span>
    </Link>
  );
}

function Insights({
  dueThisWeek,
  trials,
  t,
}: {
  dueThisWeek: number;
  trials: number;
  t: T;
}) {
  return (
    <section className="dashboard-secondary workspace-section overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <h2 className="text-base font-bold">{t.insights}</h2>
        <p className="mt-1 text-xs text-slate-500">{t.insightsDesc}</p>
      </div>
      <div className="divide-y divide-slate-100 px-5 sm:px-6">
        <InsightRow
          icon={dueThisWeek > 1 ? AlertTriangle : CalendarDays}
          tone={dueThisWeek > 1 ? "amber" : "blue"}
          title={dueThisWeek > 1 ? t.busyRenewalWeek : t.renewalsThisWeek}
          detail={dueThisWeek === 0 ? t.noDueThisWeek : dueThisWeek === 1 ? t.dueThisWeekOne : format(t.dueThisWeekMany, { count: dueThisWeek })}
          href="/calendar"
          action={t.viewCalendar}
        />
        <InsightRow
          icon={Star}
          tone="violet"
          title={t.freeTrials}
          detail={trials === 0 ? t.noActiveTrials : trials === 1 ? t.trialsOne : format(t.trialsMany, { count: trials })}
          href="/subscriptions?filter=active"
          action={t.reviewPlans}
        />
      </div>
    </section>
  );
}

const DEBT_CHART_COLORS = ["#F59E0B", "#8B5CF6", "#06B6D4", "#EF4444", "#10B981", "#2563EB"];

function DebtsCard({ debts, t }: { debts: Subscription[]; t: T }) {
  const currencies = new Set(debts.map((debt) => debt.currency));
  const singleCurrency = currencies.size === 1;
  const total = debts.reduce((sum, debt) => sum + Number(debt.amount), 0);
  const owedByMe = debts.filter((debt) => debt.debt_direction !== "owed_to_me").reduce((sum,debt)=>sum+Number(debt.remaining_balance ?? debt.original_amount ?? debt.amount),0);
  const owedToMe = debts.filter((debt) => debt.debt_direction === "owed_to_me").reduce((sum,debt)=>sum+Number(debt.remaining_balance ?? debt.original_amount ?? debt.amount),0);
  const debtCurrency = debts[0]?.currency ?? "USD";
  let cursor = 0;
  const segments = singleCurrency
    ? debts.map((debt, index) => {
        const share = total > 0 ? (Number(debt.amount) / total) * 360 : 0;
        const start = cursor;
        cursor += share;
        return { color: DEBT_CHART_COLORS[index % DEBT_CHART_COLORS.length], start, end: cursor };
      })
    : [];
  const gradient = segments.length
    ? `conic-gradient(${segments.map((segment) => `${segment.color} ${segment.start}deg ${segment.end}deg`).join(",")})`
    : "#E2E8F0";

  return (
    <section className="dashboard-debts workspace-section overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
        <div><h2 className="text-base font-bold">{t.personalDebts}</h2><p className="mt-1 text-xs text-slate-500">{t.personalDebtsDesc}</p></div>
        <HandCoins size={18} className="text-amber-500" />
      </div>
      <div className="p-5 sm:p-6">
        {singleCurrency && <div className="mb-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-orange-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">You owe</p><strong className="mt-2 block text-lg text-orange-800">{formatMoney(owedByMe,debtCurrency)}</strong></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Owed to you</p><strong className="mt-2 block text-lg text-emerald-800">{formatMoney(owedToMe,debtCurrency)}</strong></div></div>}
        <div className="flex items-center gap-5">
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: gradient }}>
            <div className="grid h-[62px] w-[62px] place-items-center rounded-full bg-white text-center">
              <div>
                <p className="text-xl font-black">{debts.length}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{t.debtsCountLabel}</p>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            {debts.map((debt, index) => (
              <Link key={debt.id} href={`/subscriptions/${debt.id}`} className="flex items-center gap-2 text-xs transition hover:text-blue-600">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: singleCurrency ? DEBT_CHART_COLORS[index % DEBT_CHART_COLORS.length] : "#CBD5E1" }} />
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{debt.counterparty_name || debt.service_name}</span>
                <span className="shrink-0 font-black text-slate-900">{formatMoney(Number(debt.amount), debt.currency)}</span>
              </Link>
            ))}
          </div>
        </div>
        {!singleCurrency && <p className="mt-4 text-[11px] text-slate-400">{t.debtsMixedCurrency}</p>}
      </div>
    </section>
  );
}

function InsightRow({
  icon: Icon,
  tone,
  title,
  detail,
  href,
  action,
}: {
  icon: typeof Star;
  tone: "blue" | "amber" | "violet" | "emerald";
  title: string;
  detail: string;
  href: string;
  action: string;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="flex gap-3 py-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={17} /></span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
        <Link href={href} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600">{action} <ChevronRight size={12} className="rtl:rotate-180" /></Link>
      </div>
    </div>
  );
}

function RecentActivity({ subscriptions, t, locale }: { subscriptions: Subscription[]; t: T; locale: Locale }) {
  return (
    <section className="dashboard-secondary workspace-section overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <h2 className="text-base font-bold">{t.recentActivity}</h2>
        <p className="mt-1 text-xs text-slate-500">{t.recentActivityDesc}</p>
      </div>
      <div className="divide-y divide-slate-100 px-5 sm:px-6">
        {subscriptions.map((subscription) => {
          const activity = activityFor(subscription, t);
          const ActivityIcon = activity.icon;
          return (
            <Link key={subscription.id} href={`/subscriptions/${subscription.id}`} className="flex items-center gap-3 py-4 transition hover:bg-slate-50/70">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${activity.tone}`}><ActivityIcon size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{activity.title}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{activity.detail}</span>
              </span>
              <span className="shrink-0 text-[11px] font-medium text-slate-400">{relativeActivityDate(subscription.updated_at, t, locale)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function activityFor(subscription: Subscription, t: T) {
  if (subscription.status === "cancelled") {
    return {
      icon: Check,
      tone: "bg-amber-50 text-amber-600",
      title: `${subscription.service_name} ${t.markedCancelled}`,
      detail: t.trackingPaused,
    };
  }
  const wasUpdated = new Date(subscription.updated_at).getTime() - new Date(subscription.created_at).getTime() > 60_000;
  if (wasUpdated) {
    return {
      icon: History,
      tone: "bg-violet-50 text-violet-600",
      title: `${subscription.service_name} ${t.updated}`,
      detail: `${t.renewsOn} ${subscription.renewal_date}`,
    };
  }
  return {
    icon: Clock3,
    tone: "bg-blue-50 text-blue-600",
    title: `${subscription.service_name} ${t.added}`,
    detail: subscription.source_type === "screenshot" ? t.fromScreenshot : subscription.source_type === "text" ? t.fromText : t.addedManually,
  };
}

function relativeActivityDate(value: string, t: T, locale: Locale) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return t.justNow;
  if (hours < 24) return format(t.hoursShort, { h: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t.yesterday;
  if (days < 7) return format(t.daysShort, { d: days });
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(value));
}

function Timeline({ group, t, billingLabels, commitmentTypes }: { group: TimelineGroup; t: T; billingLabels: Dictionary["common"]; commitmentTypes: Dictionary["commitmentTypes"] }) {
  return <div><div className="mb-2.5 flex items-center gap-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{group.label}</p><div className="h-px flex-1 bg-slate-100" /><span className="text-[10px] font-bold text-slate-400">{group.items.length}</span></div><div className="grid gap-2 lg:grid-cols-2">{group.items.map((subscription) => { const days = daysUntil(subscription.renewal_date); const billingLabel = subscription.billing_cycle === 'yearly' ? billingLabels.yearly : subscription.billing_cycle === 'trial' ? billingLabels.trial : billingLabels.monthly; const typeSuffix = subscription.commitment_type !== 'subscription' ? ' · ' + commitmentTypes[subscription.commitment_type] : ''; return <Link key={subscription.id} href={`/subscriptions/${subscription.id}`} className="group flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 transition hover:bg-blue-50/60"><ServiceLogo name={subscription.service_name} className="h-10 w-10 rounded-xl" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{subscription.service_name}</span><span className="mt-0.5 block text-[11px] text-slate-500"><span className={renewalTone(days)}>{renewalLabel(days, t)}</span> · {billingLabel}{typeSuffix}</span></span><span className="text-right"><span className="block text-sm font-black">{formatMoney(Number(subscription.amount), subscription.currency)}</span><span className="text-[10px] text-slate-400">{subscription.renewal_date}</span></span><ChevronRight size={14} className="text-slate-300 rtl:rotate-180" /></Link>; })}</div></div>;
}

function UpcomingMobileRow({ subscription, t, billingLabels }: { subscription: Subscription; t: T; billingLabels: Dictionary["common"] }) {
  const days = daysUntil(subscription.renewal_date);
  const billingLabel = subscription.billing_cycle === "yearly" ? billingLabels.yearly : subscription.billing_cycle === "trial" ? billingLabels.trial : billingLabels.monthly;
  return <Link href={`/subscriptions/${subscription.id}`} className="flex min-h-16 items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
    <ServiceLogo name={subscription.service_name} className="h-10 w-10 rounded-xl" />
    <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{subscription.service_name}</strong><small className="mt-0.5 block truncate text-[11px] text-slate-500"><span className={renewalTone(days)}>{renewalLabel(days, t)}</span> · {billingLabel}</small></span>
    <span className="shrink-0 text-end"><strong className="block text-sm">{formatMoney(Number(subscription.amount), subscription.currency)}</strong><small className="text-[10px] text-slate-400">{subscription.renewal_date}</small></span>
  </Link>;
}

function EmptyDashboard({ t }: { t: T }) {
  return <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center"><div className="grid h-24 w-24 place-items-center rounded-[30px] bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-200"><CalendarDays size={30} /></div><h2 className="mt-8 text-2xl font-bold tracking-tight">{t.calmStarts}</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">{t.calmStartsDesc}</p><Link href="/subscriptions/new" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-bold text-white"><Plus size={16} /> {t.addFirstSubscription}</Link><span className="mt-5 inline-flex items-center gap-2 text-xs text-slate-400"><Check size={14} className="text-emerald-500" /> {t.freeUpTo3}</span></div>;
}
