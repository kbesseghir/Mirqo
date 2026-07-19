"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Info,
  Loader2,
} from "lucide-react";
import { formatMoney } from "@/lib/subscriptions";
import {
  daysUntilRenewal,
  notificationKey,
} from "@/lib/notifications";
import type { RenewalNotification } from "@/lib/notifications";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/features/notifications/actions/notification-actions";

export function NotificationsView({
  notifications,
  initialReadKeys,
}: {
  notifications: RenewalNotification[];
  initialReadKeys: string[];
}) {
  const [read, setRead] = useState(initialReadKeys);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const unread = notifications.filter(
    (notification) => !read.includes(notificationKey(notification)),
  ).length;

  async function mark(notification: RenewalNotification) {
    const key = notificationKey(notification);
    if (read.includes(key) || busyKey) return;

    setBusyKey(key);
    setError("");
    const previous = read;
    setRead((current) => [...current, key]);
    const result = await markNotificationRead(toItem(notification));
    if (!result.success) {
      setRead(previous);
      setError(result.message);
    }
    setBusyKey(null);
  }

  async function markAll() {
    if (!unread || markingAll) return;
    setMarkingAll(true);
    setError("");
    const previous = read;
    setRead((current) => [
      ...new Set([
        ...current,
        ...notifications.map((notification) => notificationKey(notification)),
      ]),
    ]);
    const result = await markAllNotificationsRead(notifications.map(toItem));
    if (!result.success) {
      setRead(previous);
      setError(result.message);
    }
    setMarkingAll(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Renewal alerts based on your saved reminder dates.
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950">
          <Bell size={18} />
        </span>
      </header>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="mt-7">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Due reminders
            </p>
            {unread > 0 && (
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              disabled={markingAll}
              onClick={markAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 disabled:opacity-60"
            >
              {markingAll ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCheck size={14} />
              )}
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-2">
          {notifications.map((notification) => {
            const key = notificationKey(notification);
            return (
              <Alert
                key={key}
                subscription={notification}
                read={read.includes(key)}
                busy={busyKey === key}
                onRead={() => mark(notification)}
              />
            );
          })}

          {!notifications.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <Info className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold">You are all caught up</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Active renewals appear here when they reach their 1, 3, 7, or
                14-day reminder window.
              </p>
              <Link
                href="/subscriptions"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white"
              >
                View subscriptions
              </Link>
            </div>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-5 text-slate-600 dark:bg-blue-950/30 dark:text-slate-300">
        <strong className="text-slate-900 dark:text-white">How it works:</strong>{" "}
        Mirqo checks active subscriptions whenever you open the app. Cancelled,
        expired, and past renewals are excluded. Email and push delivery remain
        planned for a future version.
      </section>
    </div>
  );
}

function toItem(subscription: RenewalNotification): NotificationItem {
  return {
    subscription_id: subscription.id,
    renewal_date: subscription.renewal_date,
    reminder_days_before: subscription.reminder_days_before,
  };
}

function Alert({
  subscription,
  read,
  busy,
  onRead,
}: {
  subscription: RenewalNotification;
  read: boolean;
  busy: boolean;
  onRead: () => void;
}) {
  const days = daysUntilRenewal(subscription.renewal_date);
  const urgent = days <= 3;

  return (
    <article
      className={
        "flex items-start gap-3 rounded-2xl border p-4 transition sm:p-5 " +
        (read
          ? "border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-700 dark:bg-slate-900"
          : "border-blue-100 bg-white shadow-sm dark:bg-slate-900")
      }
    >
      <Link
        href={"/subscriptions/" + subscription.id}
        className="flex min-w-0 flex-1 gap-4"
      >
        <span
          className={
            "grid h-9 w-9 shrink-0 place-items-center rounded-full " +
            (urgent
              ? "bg-amber-50 text-amber-500 dark:bg-amber-950"
              : "bg-blue-50 text-blue-600 dark:bg-blue-950")
          }
        >
          {urgent ? <AlertTriangle size={16} /> : <Info size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            {subscription.service_name} renews{" "}
            {days === 0
              ? "today"
              : "in " + days + " day" + (days === 1 ? "" : "s")}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {formatMoney(Number(subscription.amount), subscription.currency)} on{" "}
            {new Intl.DateTimeFormat("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(new Date(subscription.renewal_date + "T00:00:00"))}
            .
          </span>
          <span className="mt-1 block text-[11px] text-slate-400">
            {subscription.reminder_days_before}-day reminder
          </span>
        </span>
      </Link>

      {read ? (
        <span
          aria-label="Read"
          title="Read"
          className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-emerald-500"
        >
          <Check size={15} />
        </span>
      ) : (
        <button
          type="button"
          onClick={onRead}
          disabled={busy}
          aria-label={"Mark " + subscription.service_name + " reminder as read"}
          title="Mark as read"
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-blue-600 transition hover:bg-blue-50 disabled:opacity-60 dark:hover:bg-blue-950"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        </button>
      )}
    </article>
  );
}