"use client";

import { useState } from "react";
import { AlertCircle, CalendarDays, Check, Loader2, X } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { format } from "@/lib/i18n/format";

type Props = {
  subscriptionId: string;
  serviceName: string;
  amount: string;
  currency: string;
  renewalDate: string;
  billingCycle: "monthly" | "yearly" | "trial";
  onDone: () => void;
};

export function CalendarConfirmation({
  subscriptionId,
  serviceName,
  amount,
  currency,
  renewalDate,
  onDone,
}: Props) {
  const { dict } = useLocale();
  const t = dict.calendarConfirmation;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const body = (await response.json()) as {
        connectUrl?: string;
        error?: string;
      };

      if (response.ok) {
        window.location.assign(
          "/subscriptions/" + subscriptionId + "?calendar=added",
        );
        return;
      }
      if (body.connectUrl) {
        window.location.assign(body.connectUrl);
        return;
      }
      setError(body.error ?? t.couldNotUpdate);
    } catch {
      setError(t.couldNotReach);
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-title"
        aria-describedby="calendar-description"
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950">
            <CalendarDays size={22} />
          </span>
          <button
            type="button"
            onClick={onDone}
            disabled={loading}
            aria-label={t.skipCalendar}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            <X size={17} />
          </button>
        </div>

        <h2 id="calendar-title" className="mt-5 text-lg font-bold">
          {t.title}
        </h2>
        <p
          id="calendar-description"
          className="mt-2 text-sm leading-6 text-slate-500"
        >
          {t.desc}
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
          <p className="font-semibold">{format(t.renewal, { service: serviceName })}</p>
          <p className="mt-1 text-xs text-slate-500">
            {renewalDate} - {currency} {amount}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700 dark:bg-red-950 dark:text-red-200"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="button"
          autoFocus
          disabled={loading}
          onClick={add}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {loading ? t.connecting : t.addToCalendar}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onDone}
          className="mt-2 w-full py-3 text-sm font-semibold text-slate-500 disabled:opacity-50"
        >
          {t.notNow}
        </button>
      </div>
    </div>
  );
}
