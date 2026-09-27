"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
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
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import { useLocale } from "@/components/locale-provider";
import { format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type T = Dictionary["notifications"];

export function NotificationsView({
  notifications,
  initialReadKeys,
}: {
  notifications: RenewalNotification[];
  initialReadKeys: string[];
}) {
  const { dict, locale } = useLocale();
  const t = dict.notifications;
  const [read, setRead] = useState(initialReadKeys);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"unread" | "all">("unread");
  const unread = notifications.filter(
    (notification) => !read.includes(notificationKey(notification)),
  ).length;
  const displayedNotifications = view === "unread"
    ? notifications.filter((notification) => !read.includes(notificationKey(notification)))
    : notifications;
  const groups = groupNotifications(displayedNotifications, t);

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
    <div className="mx-auto max-w-4xl">
      <header className="flex items-start justify-between">
        <div>
          <p className="page-kicker">{t.kicker}</p>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-description">
            {t.subtitle}
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
        <div className="mb-5 inline-flex rounded-full bg-slate-100 p-1">
          <button type="button" onClick={() => setView("unread")} className={`rounded-full px-4 py-2 text-xs font-bold transition ${view === "unread" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>{t.unread} {unread > 0 ? `(${unread})` : ""}</button>
          <button type="button" onClick={() => setView("all")} className={`rounded-full px-4 py-2 text-xs font-bold transition ${view === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>{t.all}</button>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t.dueReminders}
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
              {t.markAllRead}
            </button>
          )}
        </div>

        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.label} aria-labelledby={`notification-${group.id}`}>
              <div className="mb-2.5 flex items-center gap-3">
                <h2 id={`notification-${group.id}`} className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {group.label}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                  {group.items.length}
                </span>
                <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="space-y-2">
                {group.items.map((notification) => {
                  const key = notificationKey(notification);
                  return (
                    <Alert
                      key={key}
                      subscription={notification}
                      read={read.includes(key)}
                      busy={busyKey === key}
                      onRead={() => mark(notification)}
                      t={t}
                      locale={locale}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {!displayedNotifications.length && (
            <div className="ui-card p-12 text-center">
              <Info className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold">{t.caughtUpTitle}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {t.caughtUpDesc}
              </p>
              <Link
                href="/subscriptions"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white"
              >
                {t.viewSubscriptions}
              </Link>
            </div>
          )}
        </div>
      </div>

      <details className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-5 text-slate-600 dark:bg-blue-950/30 dark:text-slate-300">
        <summary className="cursor-pointer font-bold text-slate-900 dark:text-white">{t.howItWorks}</summary>
        <p className="mt-2">{t.howItWorksDesc}</p>
      </details>
    </div>
  );
}

function groupNotifications(notifications: RenewalNotification[], t: T) {
  const definitions = [
    { id: "today", label: t.renewingToday, match: (days: number) => days === 0 },
    { id: "tomorrow", label: t.renewingTomorrow, match: (days: number) => days === 1 },
    { id: "soon", label: t.renewingSoon, match: (days: number) => days >= 2 && days <= 7 },
    { id: "later", label: t.later, match: (days: number) => days > 7 },
  ];
  return definitions
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      items: notifications.filter((notification) =>
        definition.match(daysUntilRenewal(notification.renewal_date)),
      ),
    }))
    .filter((group) => group.items.length > 0);
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
  t,
  locale,
}: {
  subscription: RenewalNotification;
  read: boolean;
  busy: boolean;
  onRead: () => void;
  t: T;
  locale: string;
}) {
  const days = daysUntilRenewal(subscription.renewal_date);
  const urgent = days <= 1;
  const renewsText = days === 0
    ? format(t.renewsToday, { service: subscription.service_name })
    : days === 1
      ? format(t.renewsInDay, { service: subscription.service_name })
      : format(t.renewsInDays, { service: subscription.service_name, days });
  return (
    <article
      className={
        "flex items-start gap-3 rounded-[22px] border p-4 transition sm:p-5 " +
        (read
          ? "border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-700 dark:bg-slate-900"
          : urgent
            ? "border-amber-200 bg-amber-50/40 shadow-sm dark:border-amber-900 dark:bg-amber-950/20"
            : "border-blue-100 bg-white shadow-sm dark:bg-slate-900")
      }
    >
      <Link
        href={"/subscriptions/" + subscription.id}
        className="flex min-w-0 flex-1 gap-4"
      >
        <ServiceLogo name={subscription.service_name} className="h-10 w-10 shrink-0 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            {renewsText}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {formatMoney(Number(subscription.amount), subscription.currency)} {t.on}{" "}
            {new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(new Date(subscription.renewal_date + "T00:00:00"))}
          </span>
          <span className="mt-1 block text-[11px] text-slate-400">
            {subscription.reminder_days_before === 1 ? t.reminderOne : format(t.reminderMany, { n: subscription.reminder_days_before })}
          </span>
        </span>
      </Link>

      {read ? (
        <span
          aria-label={t.read}
          title={t.read}
          className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-emerald-500"
        >
          <Check size={15} />
        </span>
      ) : (
        <button
          type="button"
          onClick={onRead}
          disabled={busy}
          aria-label={t.markAsRead}
          title={t.markAsRead}
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-blue-600 transition hover:bg-blue-50 disabled:opacity-60 dark:hover:bg-blue-950"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        </button>
      )}
    </article>
  );
}
