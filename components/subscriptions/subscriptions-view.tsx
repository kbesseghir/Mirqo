"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, CalendarCheck2, Grid2X2, List, Plus, Search } from "lucide-react";
import { daysUntil, formatMoney, totalsByCurrency } from "@/lib/subscriptions";
import type { Subscription } from "@/types/database";

type Filter = "all" | "active" | "due" | "annual" | "cancelled";
type View = "grid" | "list";
const filters: [Filter, string][] = [
  ["all", "All"],
  ["active", "Active"],
  ["due", "Due Soon"],
  ["annual", "Annual"],
  ["cancelled", "Cancelled"],
];
const colors = [
  "#2563eb",
  "#06b6d4",
  "#8b5cf6",
  "#f97316",
  "#ef4444",
  "#10b981",
  "#111827",
];
function colorFor(name: string) {
  return colors[(name.charCodeAt(0) || 0) % colors.length];
}
export function SubscriptionsView({ subscriptions, initialQuery = "" }: { subscriptions: Subscription[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("grid");
  const [sortAsc, setSortAsc] = useState(true);
  const active = subscriptions.filter(
    (s) => s.status === "active" || s.status === "trial",
  );
  const currencyTotals = totalsByCurrency(active);
  const monthlyLabel = currencyTotals.length <= 2
    ? currencyTotals.map((total) => `${formatMoney(total.monthly, total.currency)}/mo`).join(" + ") || `${formatMoney(0, "USD")}/mo`
    : `${currencyTotals.length} currencies`;
  const visible = useMemo(
    () =>
      subscriptions
        .filter((s) =>
          s.service_name.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .filter(
          (s) =>
            filter === "all" ||
            (filter === "active" &&
              (s.status === "active" || s.status === "trial")) ||
            (filter === "due" &&
              s.status !== "cancelled" &&
              daysUntil(s.renewal_date) >= 0 &&
              daysUntil(s.renewal_date) <= 7) ||
            (filter === "annual" && s.billing_cycle === "yearly") ||
            (filter === "cancelled" && s.status === "cancelled"),
        )
        .sort((a, b) =>
          sortAsc
            ? a.service_name.localeCompare(b.service_name)
            : daysUntil(a.renewal_date) - daysUntil(b.renewal_date),
        ),
    [subscriptions, query, filter, sortAsc],
  );
  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Subscriptions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {active.length} active · {monthlyLabel}
          </p>
        </div>
        <Link
          href="/subscriptions/new"
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200"
        >
          <Plus size={15} />
          Add
        </Link>
      </header>
      <div className="mt-7 flex gap-2">
        <label className="relative flex-1">
          <Search
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subscriptions…"
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
          />
        </label>
        <button
          onClick={() => setSortAsc((v) => !v)}
          aria-label="Change sorting"
          title={sortAsc ? "Sort by renewal" : "Sort by name"}
          className="flex h-11 w-28 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600"
        >
          <ArrowUpDown size={15} />
          {sortAsc ? "Name" : "Renewal"}
        </button>
        <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setView("grid")}
            aria-label="Grid view"
            className={`grid h-8 w-8 place-items-center rounded-full ${view === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}
          >
            <Grid2X2 size={15} />
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="List view"
            className={`grid h-8 w-8 place-items-center rounded-full ${view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}
          >
            <List size={15} />
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filter === value ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "border border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "grid" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <SubscriptionCard key={s.id} subscription={s} />
          ))}
          {filter === "all" && !query && <AddCard view="grid" />}
        </div>
      ) : (
        <SubscriptionTable
          subscriptions={visible}
          monthlyLabel={monthlyLabel}
        />
      )}
      {!visible.length && (query || filter !== "all") && (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 py-16 text-center">
          <Search className="mx-auto text-slate-300" />
          <h2 className="mt-4 font-bold">No subscriptions found</h2>
          <p className="mt-1 text-sm text-slate-500">
            Try another search or filter.
          </p>
        </div>
      )}
    </div>
  );
}
function SubscriptionCard({ subscription: s }: { subscription: Subscription }) {
  const days = daysUntil(s.renewal_date);
  const cancelled = s.status === "cancelled";
  const due = !cancelled && days >= 0 && days <= 7;
  const accent = colorFor(s.service_name);
  const status = cancelled
    ? "Cancelled"
    : due
      ? "Due Soon"
      : s.status === "trial"
        ? "Renewing"
        : "Active";
  const statusStyle = cancelled
    ? "bg-slate-100 text-slate-500"
    : due
      ? "bg-amber-50 text-amber-600"
      : "bg-emerald-50 text-emerald-600";
  return (
    <Link
      href={`/subscriptions/${s.id}`}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg,${accent} 0%,${accent} 50%,${accent}28 50%,${accent}28 100%)`,
        }}
      />
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: accent }}
        >
          {s.service_name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold">{s.service_name}</h2>
          <p className="mt-0.5 text-xs capitalize text-slate-500">
            {s.billing_cycle}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {status}
        </span>
      </div>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight">
          {formatMoney(Number(s.amount), s.currency)}
        </span>
        <span className="text-sm text-slate-500">
          /{s.billing_cycle === "yearly" ? "yr" : "mo"}
        </span>
      </div>
      <div className="mt-4 h-px bg-slate-100" />
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {cancelled ? "Status" : "Next renewal"}
          </p>
          <p className="mt-1 text-xs font-semibold">
            {cancelled ? "Cancelled" : formatDate(s.renewal_date)}
          </p>
        </div>
        {!cancelled && (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${due ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}
          >
            {days < 0 ? "Past due" : `${days}d`}
          </span>
        )}
      </div>
    </Link>
  );
}
function SubscriptionTable({
  subscriptions,
  monthlyLabel,
}: {
  subscriptions: Subscription[];
  monthlyLabel: string;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-[2fr_1.1fr_1.5fr_1.6fr_1fr] border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <span>Service</span>
          <span>Amount</span>
          <span>Renewal</span>
          <span>Timeline</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-100">
          {subscriptions.map((s) => (
            <TableRow key={s.id} subscription={s} />
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          <span>
            {subscriptions.length} total · {monthlyLabel}
          </span>
          <Link
            href="/subscriptions/new"
            className="flex items-center gap-1 font-semibold text-blue-600"
          >
            <Plus size={13} />
            Add new
          </Link>
        </div>
      </div>
    </div>
  );
}
function TableRow({ subscription: s }: { subscription: Subscription }) {
  const days = daysUntil(s.renewal_date);
  const cancelled = s.status === "cancelled";
  const due = !cancelled && days >= 0 && days <= 7;
  const renewing = s.status === "trial";
  const accent = colorFor(s.service_name);
  const status = cancelled
    ? "Cancelled"
    : due
      ? "Due Soon"
      : renewing
        ? "Renewing"
        : "Active";
  const statusClass = cancelled
    ? "bg-slate-100 text-slate-500"
    : due
      ? "bg-amber-50 text-amber-600"
      : renewing
        ? "bg-cyan-50 text-cyan-600"
        : "bg-emerald-50 text-emerald-600";
  const barClass = due
    ? "bg-amber-400"
    : renewing
      ? "bg-cyan-500"
      : "bg-emerald-400";
  const progress = Math.min(100, Math.max(4, (days / 31) * 100));
  return (
    <Link
      href={`/subscriptions/${s.id}`}
      className="grid grid-cols-[2fr_1.1fr_1.5fr_1.6fr_1fr] items-center px-5 py-4 transition hover:bg-slate-50"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: accent }}
        >
          {s.service_name[0]?.toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">
            {s.service_name}
          </span>
          <span className="block truncate text-xs capitalize text-slate-500">
            {s.billing_cycle}
          </span>
        </span>
      </span>
      <span>
        <span className="text-sm font-bold">
          {formatMoney(Number(s.amount), s.currency)}
        </span>
        <span className="text-xs text-slate-500">
          /{s.billing_cycle === "yearly" ? "yr" : "mo"}
        </span>
      </span>
      <span className="text-sm text-slate-500">
        {cancelled ? "—" : formatDate(s.renewal_date)}
      </span>
      <span>
        {cancelled ? (
          <span className="text-slate-400">—</span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
              <span
                className={`block h-full rounded-full ${barClass}`}
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className="text-xs text-slate-500">
              {days < 0 ? "Past due" : `${days}d`}
            </span>
          </span>
        )}
      </span>
      <span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {status}
        </span>
      </span>
    </Link>
  );
}
function AddCard({ view }: { view: View }) {
  return (
    <Link
      href="/subscriptions/new"
      className={`flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50/30 hover:text-blue-600 ${view === "grid" ? "min-h-48 flex-col" : "p-5"}`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100">
        <Plus size={18} />
      </span>
      <span className="text-sm font-semibold">Add subscription</span>
    </Link>
  );
}
function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}
