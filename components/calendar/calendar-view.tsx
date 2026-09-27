"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { formatMoney, withEffectiveRenewalDate } from "@/lib/subscriptions";
import type { Subscription } from "@/types/database";
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import { useLocale } from "@/components/locale-provider";
import { format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type T = Dictionary["calendar"];

const colors = ["#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#22c55e"];
function color(name: string) { return colors[(name.charCodeAt(0) || 0) % colors.length]; }
function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarView({
  subscriptions,
  calendarConnected,
}: {
  subscriptions: Subscription[];
  calendarConnected: boolean;
}) {
  const { dict, locale } = useLocale();
  const t = dict.calendar;
  const today = new Date();
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(() =>
    dateKey(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const active = subscriptions
    .filter((subscription) => subscription.status === "active" || subscription.status === "trial")
    .map((subscription) => withEffectiveRenewalDate(subscription));
  const connectSubscription = active[0];
  const byDate = useMemo(() => {
    const map = new Map<string, Subscription[]>();
    active.forEach((subscription) =>
      map.set(subscription.renewal_date, [
        ...(map.get(subscription.renewal_date) ?? []),
        subscription,
      ]),
    );
    return map;
  }, [active]);
  const monthItems = active
    .filter((subscription) => {
      const date = new Date(`${subscription.renewal_date}T00:00:00`);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .sort((a, b) => a.renewal_date.localeCompare(b.renewal_date));
  const monthTotals = useMemo(() => {
    const values = new Map<string, number>();
    monthItems.forEach((subscription) =>
      values.set(
        subscription.currency,
        (values.get(subscription.currency) ?? 0) + Number(subscription.amount),
      ),
    );
    return [...values.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [monthItems]);
  const selectedItems = byDate.get(selected) ?? [];
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((firstDay + days) / 7) * 7;
  const cells = Array.from(
    { length: cellCount },
    (_, index) => (index < firstDay || index >= firstDay + days ? null : index - firstDay + 1),
  );

  function move(offset: number) {
    const next = new Date(year, month + offset, 1);
    setViewDate(next);
    setSelected(dateKey(next.getFullYear(), next.getMonth(), 1));
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker">{t.kicker}</p>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-description">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Month summary">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800">
            {monthItems.length === 1 ? t.renewalOne : format(t.renewalMany, { count: monthItems.length })}
          </span>
          {monthTotals.map(([currency, amount]) => (
            <span key={currency} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900">
              {formatMoney(amount, currency)} {t.expected}
            </span>
          ))}
        </div>
      </header>

      <section className="ui-card mt-6 flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${calendarConnected ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
          {calendarConnected ? <CheckCircle2 size={19} /> : <CalendarDays size={19} />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">{calendarConnected ? t.connected : t.connectTitle}</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {calendarConnected
              ? t.connectedDesc
              : connectSubscription
                ? t.connectDescReady
                : t.connectDescEmpty}
          </p>
        </div>
        {calendarConnected ? (
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">{t.connected}</span>
        ) : connectSubscription ? (
          <Link href={`/api/calendar/connect?subscriptionId=${connectSubscription.id}`} className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white">
            <ExternalLink size={13} /> {t.connect}
          </Link>
        ) : (
          <span aria-disabled="true" className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400">{t.connect}</span>
        )}
      </section>

      <div className="mt-5">
        <section className="ui-card p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => move(-1)} aria-label={t.previousMonth} className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft size={18} className="rtl:rotate-180" /></button>
            <h2 className="text-sm font-bold">{viewDate.toLocaleDateString(locale === "ar" ? "ar" : "en-US", { month: "long", year: "numeric" })}</h2>
            <button type="button" onClick={() => move(1)} aria-label={t.nextMonth} className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={18} className="rtl:rotate-180" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
            {t.days.map((day) => <span key={day} className="py-3">{day}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1.5 sm:gap-2">
            {cells.map((day, index) =>
              day === null ? <span key={`blank-${index}`} className="h-14 rounded-xl border border-slate-100 bg-slate-50/80 sm:h-20 lg:h-24" /> : (
                <Day
                  key={day}
                  day={day}
                  dateKey={dateKey(year, month, day)}
                  selected={selected === dateKey(year, month, day)}
                  today={today.getFullYear() === year && today.getMonth() === month && today.getDate() === day}
                  items={byDate.get(dateKey(year, month, day)) ?? []}
                  onClick={() => setSelected(dateKey(year, month, day))}
                  t={t}
                />
              ),
            )}
          </div>
        </section>

        <aside className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="ui-card p-5">
            <p className="text-sm font-bold">
              {new Date(`${selected}T00:00:00`).toLocaleDateString(locale === "ar" ? "ar" : "en-US", { month: "long", day: "numeric" })}
            </p>
            <p className="mt-1 text-xs text-slate-500">{selectedItems.length === 1 ? t.renewalOne : format(t.renewalMany, { count: selectedItems.length })}</p>
            {selectedItems.length ? (
              <div className="mt-4 space-y-3">{selectedItems.map((subscription) => <Renewal key={subscription.id} subscription={subscription} common={dict.common} />)}</div>
            ) : (
              <p className="mt-5 rounded-xl bg-slate-50 py-6 text-center text-xs text-slate-500 dark:bg-slate-800">{t.noRenewalsDate}</p>
            )}
          </section>
          <section className="ui-card p-5">
            <h2 className="text-sm font-bold">{t.thisMonth}</h2>
            <div className="mt-4 space-y-4">
              {monthItems.map((subscription) => <Renewal key={subscription.id} subscription={subscription} showDay common={dict.common} />)}
              {!monthItems.length && <p className="py-6 text-center text-xs text-slate-500">{t.noRenewalsMonth}</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Day({ day, dateKey: value, selected, today, items, onClick, t }: { day: number; dateKey: string; selected: boolean; today: boolean; items: Subscription[]; onClick: () => void; t: T }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} aria-label={`${value}${items.length ? `, ${items.length}` : ""}`} className={`relative flex h-14 min-w-0 flex-col items-start overflow-hidden rounded-xl border p-1.5 text-xs font-semibold transition sm:h-20 sm:p-2 sm:text-sm lg:h-24 ${selected ? "border-blue-500 bg-blue-50/40 shadow-[0_0_0_1px_#3b82f6]" : today ? "border-blue-200 bg-blue-50/50 text-blue-700" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/20 dark:border-slate-700 dark:bg-slate-900"}`}>
      <span className={selected ? "text-blue-600" : ""}>{day}</span>
      <span className="mt-auto flex w-full gap-1 sm:hidden">
        {items.slice(0, 3).map((item) => <span key={item.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color(item.service_name) }} />)}
      </span>
      <span className="mt-2 hidden w-full space-y-1 sm:block">
        {items.slice(0, 2).map((item) => <span key={item.id} className="block truncate rounded-md px-2 py-0.5 text-start text-[10px] font-bold text-white lg:text-[11px]" style={{ backgroundColor: color(item.service_name) }}>{item.service_name}</span>)}
        {items.length > 2 && <span className="block px-1 text-start text-[10px] font-bold text-slate-500">+{items.length - 2} {t.more}</span>}
      </span>
    </button>
  );
}

function Renewal({ subscription, showDay = false, common }: { subscription: Subscription; showDay?: boolean; common: Dictionary["common"] }) {
  const billingLabel = subscription.billing_cycle === "yearly" ? common.yearly : subscription.billing_cycle === "trial" ? common.trial : common.monthly;
  return (
    <Link aria-label={subscription.service_name} href={`/subscriptions/${subscription.id}`} className="group flex min-h-12 items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800">
      {showDay ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold dark:bg-slate-800">
          {new Date(`${subscription.renewal_date}T00:00:00`).getDate()}
        </span>
      ) : (
        <ServiceLogo name={subscription.service_name} className="h-9 w-9 rounded-xl" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">{subscription.service_name}</span>
        <span className="block text-[11px] text-slate-500">{formatMoney(Number(subscription.amount), subscription.currency)} · {billingLabel}</span>
      </span>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color(subscription.service_name) }} />
      <ChevronRight size={14} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}
