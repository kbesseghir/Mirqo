"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronRight,
  Grid2X2,
  List,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { daysUntil, formatMoney, withEffectiveRenewalDate } from "@/lib/subscriptions";
import type { Subscription } from "@/types/database";
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import { serviceVisual } from "@/lib/services";
import { useLocale } from "@/components/locale-provider";
import { format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { COMMITMENT_TYPES } from "@/features/subscriptions/constants";

type Filter = "all" | "active" | "due" | "overdue" | "paid" | "i_owe" | "owed_to_me" | "annual" | "cancelled";
type View = "grid" | "list";
type Category = "all" | "streaming" | "music" | "software" | "cloud" | "ai" | "shopping" | "fitness" | "other";
type CommitmentFilter = "all" | (typeof COMMITMENT_TYPES)[number];
type T = Dictionary["subscriptionsView"];

function useCommitmentFilters(allTypesLabel: string, t: Dictionary["commitmentTypes"]): [CommitmentFilter, string][] {
  return [
    ["all", allTypesLabel],
    ...COMMITMENT_TYPES.map((value) => [value, t[value]] as [CommitmentFilter, string]),
  ];
}

function useFilters(t: T, locale: "en"|"ar"): [Filter, string][] {
  return [
    ["all", t.filterAll],
    ["active", t.filterActive],
    ["due", t.filterDue],
    ["overdue", locale === "ar" ? "متأخر" : "Overdue"],
    ["paid", locale === "ar" ? "مدفوع هذا الشهر" : "Paid this month"],
    ["i_owe", locale === "ar" ? "ديون عليّ" : "I owe"],
    ["owed_to_me", locale === "ar" ? "ديون لي" : "Owed to me"],
    ["annual", t.filterAnnual],
    ["cancelled", t.filterCancelled],
  ];
}
function useCategories(t: T): [Category, string][] {
  return [
    ["all", t.categoryAll],
    ["streaming", t.categoryStreaming],
    ["music", t.categoryMusic],
    ["software", t.categorySoftware],
    ["cloud", t.categoryCloud],
    ["ai", t.categoryAi],
    ["shopping", t.categoryShopping],
    ["fitness", t.categoryFitness],
    ["other", t.categoryOther],
  ];
}

export function SubscriptionsView({
  subscriptions,
  initialQuery = "",
  initialFilter = "all",
  paidThisMonthIds = [],
}: {
  subscriptions: Subscription[];
  initialQuery?: string;
  initialFilter?: Filter;
  paidThisMonthIds?: string[];
}) {
  const { dict, locale } = useLocale();
  const t = dict.subscriptionsView;
  const filters = useFilters(t, locale);
  const paidThisMonth = useMemo(()=>new Set(paidThisMonthIds),[paidThisMonthIds]);
  const categories = useCategories(t);
  const commitmentFilters = useCommitmentFilters(t.allTypes, dict.commitmentTypes);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [category, setCategory] = useState<Category>("all");
  const [commitmentFilter, setCommitmentFilter] = useState<CommitmentFilter>("all");
  const [view, setView] = useState<View>("list");
  const [sortByName, setSortByName] = useState(false);
  const displayed = useMemo(
    () => subscriptions.map((subscription) => withEffectiveRenewalDate(subscription)),
    [subscriptions],
  );
  const active = displayed.filter((subscription) => subscription.status === "active" || subscription.status === "trial");
  const dueSoon = active.filter((subscription) => {
    const days = daysUntil(subscription.renewal_date);
    return days >= 0 && days <= 7;
  }).length;
  const currencyCount = new Set(active.map((subscription) => subscription.currency)).size;
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return displayed
      .filter((subscription) => subscription.service_name.toLowerCase().includes(normalizedQuery))
      .filter((subscription) => category === "all" || categoryFor(subscription.service_name) === category)
      .filter((subscription) => commitmentFilter === "all" || subscription.commitment_type === commitmentFilter)
      .filter((subscription) =>
        filter === "all" ||
        filter === "active" && (subscription.status === "active" || subscription.status === "trial") ||
        filter === "due" && subscription.status !== "cancelled" && daysUntil(subscription.renewal_date) >= 0 && daysUntil(subscription.renewal_date) <= 7 ||
        filter === "overdue" && subscription.status === "active" && daysUntil(subscription.renewal_date) < 0 ||
        filter === "paid" && paidThisMonth.has(subscription.id) ||
        filter === "i_owe" && subscription.commitment_type === "debt" && subscription.debt_direction !== "owed_to_me" ||
        filter === "owed_to_me" && subscription.commitment_type === "debt" && subscription.debt_direction === "owed_to_me" ||
        filter === "annual" && subscription.billing_cycle === "yearly" ||
        filter === "cancelled" && subscription.status === "cancelled",
      )
      .sort((a, b) => sortByName
        ? a.service_name.localeCompare(b.service_name)
        : daysUntil(a.renewal_date) - daysUntil(b.renewal_date));
  }, [category, commitmentFilter, displayed, filter, paidThisMonth, query, sortByName]);

  return (
    <div className="mx-auto max-w-[1480px]">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="page-kicker">{t.yourRecurringServices}</p>
          <h1 className="page-title">{t.subscriptions}</h1>
          <p className="page-description">{format(t.activeTotal, { active: active.length, total: subscriptions.length })}</p>
        </div>
      </header>

      <section className="workspace-section mt-6 p-3 sm:p-4">
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 px-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t.manageSubscriptions}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{t.manageDesc}</p>
          </div>
          {subscriptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
              <span><strong className="text-slate-900">{active.length}</strong> {t.active}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span><strong className={dueSoon > 0 ? "text-amber-600" : "text-slate-900"}>{dueSoon}</strong> {t.dueSoon}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span><strong className="text-slate-900">{currencyCount}</strong> {currencyCount === 1 ? t.currency : t.currencies}</span>
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="relative block">
            <Search size={17} className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} className="h-12 w-full rounded-2xl border-0 bg-slate-50 ps-11 pe-4 text-[15px] outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-blue-400" />
          </label>
          <button type="button" onClick={() => setSortByName((value) => !value)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm font-bold text-slate-600 ring-1 ring-slate-200"><ArrowUpDown size={15} />{sortByName ? t.name : t.renewal}</button>
          <div className="flex h-12 items-center rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-200">
            <ViewButton active={view === "grid"} label={t.gridView} onClick={() => setView("grid")} icon={Grid2X2} />
            <ViewButton active={view === "list"} label={t.listView} onClick={() => setView("list")} icon={List} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-4">
          <label className="relative shrink-0">
            <span className="sr-only">{t.filterByCategory}</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
              className="h-9 min-w-40 appearance-none rounded-full border-0 bg-slate-50 py-2 ps-4 pe-10 text-sm font-bold text-slate-500 outline-none transition hover:bg-slate-100 focus:outline-none"
            >
              {categories.map(([value, label]) => <option key={value} value={value} className="bg-white text-slate-900">{label}</option>)}
            </select>
            <ChevronRight size={14} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
          </label>
          <label className="relative shrink-0">
            <span className="sr-only">{t.filterByType}</span>
            <select
              value={commitmentFilter}
              onChange={(event) => setCommitmentFilter(event.target.value as CommitmentFilter)}
              className="h-9 min-w-32 appearance-none rounded-full border-0 bg-slate-50 py-2 ps-4 pe-10 text-sm font-bold text-slate-500 outline-none transition hover:bg-slate-100 focus:outline-none"
            >
              {commitmentFilters.map(([value, label]) => <option key={value} value={value} className="bg-white text-slate-900">{label}</option>)}
            </select>
            <ChevronRight size={14} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
          </label>
          <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" />
          {filters.map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${filter === value ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>{label}</button>)}
        </div>
      </section>

      {visible.length ? (
        view === "grid"
          ? <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,285px),1fr))] gap-4">{visible.map((subscription) => <SubscriptionCard key={subscription.id} paid={paidThisMonth.has(subscription.id)} subscription={subscription} t={t} categories={categories} common={dict.common} commitmentTypes={dict.commitmentTypes} />)}</div>
          : <div className="workspace-section mt-5 overflow-hidden divide-y divide-slate-100">{visible.map((subscription) => <SubscriptionRow key={subscription.id} paid={paidThisMonth.has(subscription.id)} subscription={subscription} t={t} categories={categories} common={dict.common} commitmentTypes={dict.commitmentTypes} />)}</div>
      ) : <EmptyState filtered={Boolean(query || filter !== "all" || category !== "all")} t={t} />}
    </div>
  );
}

function billingCycleLabel(subscription: Subscription, common: Dictionary["common"]) {
  if (subscription.billing_cycle === "yearly") return common.yearly;
  if (subscription.billing_cycle === "trial") return common.trial;
  return (subscription.billing_interval_months || 1) === 1 ? common.monthly : `Every ${subscription.billing_interval_months} months`;
}

function cycleLabelShort(subscription: Subscription, common: Dictionary["common"]) {
  if (subscription.billing_cycle === "yearly") return common.yrShort;
  return (subscription.billing_interval_months || 1) === 1 ? common.moShort : `${subscription.billing_interval_months} mo`;
}

function SubscriptionCard({ subscription, paid, t, categories, common, commitmentTypes }: { subscription: Subscription; paid:boolean; t: T; categories: [Category, string][]; common: Dictionary["common"]; commitmentTypes: Dictionary["commitmentTypes"] }) {
  const days = daysUntil(subscription.renewal_date);
  const cancelled = subscription.status === "cancelled";
  const visual = serviceVisual(subscription.service_name);
  const status = statusFor(subscription, days, t, paid);
  return (
    <Link href={`/subscriptions/${subscription.id}`} className="group relative overflow-hidden rounded-[18px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[var(--shadow-feature)]">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: visual.color }} />
      <div className="flex items-start gap-3">
        <ServiceLogo name={subscription.service_name} className="h-12 w-12 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold">{subscription.service_name}</h2>
          <p className="mt-1 truncate text-xs text-slate-500">{categoryLabel(categoryFor(subscription.service_name), categories)} · {billingCycleLabel(subscription, common)}</p>
          {subscription.commitment_type !== "subscription" && <span className="mt-1.5 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">{commitmentTypes[subscription.commitment_type]}</span>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${status.className}`}>{status.label}</span>
      </div>
      <div className="mt-6"><p className="text-2xl font-black">{formatMoney(Number(subscription.amount), subscription.currency)}<span className="ms-1 text-xs font-medium text-slate-400">/ {cycleLabelShort(subscription, common)}</span></p></div>
      <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
        <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{cancelled ? t.status : t.nextRenewal}</p><p className="mt-1 text-xs font-semibold text-slate-600">{cancelled ? t.trackingStopped : formatDate(subscription.renewal_date)}</p></div>
        {!cancelled && <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500">{days === 0 ? t.today : format(t.daysShort, { n: days })}</span>}
      </div>
    </Link>
  );
}

function SubscriptionRow({ subscription, paid, t, categories, common, commitmentTypes }: { subscription: Subscription; paid:boolean; t: T; categories: [Category, string][]; common: Dictionary["common"]; commitmentTypes: Dictionary["commitmentTypes"] }) {
  const days = daysUntil(subscription.renewal_date);
  const cancelled = subscription.status === "cancelled";
  const status = statusFor(subscription, days, t, paid);
  return (
    <Link href={`/subscriptions/${subscription.id}`} className="group grid items-center gap-4 bg-transparent p-5 transition hover:bg-white/70 sm:grid-cols-[minmax(200px,1.25fr)_minmax(100px,.55fr)_minmax(120px,.65fr)_minmax(140px,.7fr)_auto] sm:px-3">
      <div className="flex min-w-0 items-center gap-3.5"><ServiceLogo name={subscription.service_name} className="h-12 w-12 rounded-2xl" /><div className="min-w-0"><p className="truncate text-base font-bold">{subscription.service_name}</p><p className="mt-1 truncate text-sm text-slate-500">{billingCycleLabel(subscription, common)} {t.subscription}{subscription.commitment_type !== "subscription" ? ` · ${commitmentTypes[subscription.commitment_type]}` : ""}</p></div></div>
      <div className="flex items-center justify-between sm:block"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:hidden">{t.category}</span><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${categoryTone(categoryFor(subscription.service_name))}`}>{categoryLabel(categoryFor(subscription.service_name), categories)}</span></div>
      <div className="flex items-center justify-between sm:block"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:block">{t.amount}</span><span className="text-[15px] font-black sm:mt-1.5 sm:block">{formatMoney(Number(subscription.amount), subscription.currency)} <small className="font-medium text-slate-400">/{cycleLabelShort(subscription, common)}</small></span></div>
      <div className="flex items-center justify-between sm:block"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:block">{t.renewal}</span><span className="text-sm font-semibold text-slate-600 sm:mt-1.5 sm:block">{cancelled ? "—" : formatDate(subscription.renewal_date)}</span></div>
      <div className="flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${status.className}`}>{status.label}</span><ChevronRight size={17} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" /></div>
    </Link>
  );
}

function ViewButton({ active, label, onClick, icon: Icon }: { active: boolean; label: string; onClick: () => void; icon: typeof List }) {
  return <button type="button" aria-label={label} onClick={onClick} className={`grid h-10 w-10 place-items-center rounded-xl transition ${active ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}><Icon size={16} /></button>;
}

function EmptyState({ filtered, t }: { filtered: boolean; t: T }) {
  return <div className="mt-5 grid min-h-72 place-items-center rounded-[26px] border border-dashed border-slate-200 bg-white p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">{filtered ? <Search size={22} /> : <Sparkles size={22} />}</span><h2 className="mt-4 text-base font-bold">{filtered ? t.noSubscriptionsFound : t.nothingHereYet}</h2><p className="mt-1 text-sm text-slate-500">{filtered ? t.tryAnotherSearch : t.addFirstToStart}</p>{!filtered && <Link href="/subscriptions/new" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-bold text-white"><Plus size={15} /> {t.addSubscription}</Link>}</div></div>;
}

function statusFor(subscription: Subscription, days: number, t: T, paid = false) {
  if (subscription.status === "cancelled") return { label: t.cancelled, className: "bg-slate-100 text-slate-500" };
  if (subscription.status === "expired" && subscription.commitment_type === "bnpl") return { label: "Completed", className: "bg-blue-50 text-blue-700" };
  if (subscription.status === "trial") return { label: t.trial, className: "bg-violet-50 text-violet-600" };
  if (paid && (subscription.commitment_type === "bill" || subscription.commitment_type === "bnpl")) return { label: "Paid", className: "bg-emerald-50 text-emerald-700" };
  if (days < 0 && (subscription.commitment_type === "bill" || subscription.commitment_type === "bnpl")) return { label: "Overdue", className: "bg-red-50 text-red-700" };
  if (days <= 7) return { label: t.dueSoon, className: "bg-amber-50 text-amber-700" };
  return { label: t.active, className: "bg-emerald-50 text-emerald-700" };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function categoryFor(name: string): Category {
  if (/netflix|disney|hulu|prime video|youtube|hbo|max|paramount|apple tv|shahid|osn|starzplay|bein/i.test(name)) return "streaming";
  if (/spotify|music|deezer|tidal|soundcloud|pandora|anghami/i.test(name)) return "music";
  if (/icloud|google one|drive|dropbox|onedrive|cloud|vercel/i.test(name)) return "cloud";
  if (/chatgpt|openai|claude|gemini|perplexity|copilot|midjourney/i.test(name)) return "ai";
  if (/amazon|shopping|shopify|walmart|ebay|noon|jahez|talabat/i.test(name)) return "shopping";
  if (/fitness|gym|peloton|fitbit|strava|planet fitness/i.test(name)) return "fitness";
  if (/adobe|figma|canva|notion|linear|github|1password|framer|loom|office|microsoft/i.test(name)) return "software";
  return "other";
}

function categoryLabel(category: Category, categories: [Category, string][]) {
  return categories.find(([value]) => value === category)?.[1] ?? category;
}

function categoryTone(category: Category) {
  const tones: Record<Category, string> = {
    all: "bg-slate-100 text-slate-600",
    streaming: "bg-violet-50 text-violet-700",
    music: "bg-emerald-50 text-emerald-700",
    software: "bg-blue-50 text-blue-700",
    cloud: "bg-cyan-50 text-cyan-700",
    ai: "bg-slate-100 text-slate-700",
    shopping: "bg-amber-50 text-amber-700",
    fitness: "bg-red-50 text-red-600",
    other: "bg-slate-100 text-slate-600",
  };
  return tones[category];
}
