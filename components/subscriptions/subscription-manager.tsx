"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  CreditCard,
  Edit3,
  Loader2,
  PauseCircle,
  RotateCcw,
  RefreshCw,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import type { Subscription } from "@/types/database";
import { daysUntil, formatMoney } from "@/lib/subscriptions";
import {
  deleteSubscription,
  removeSubscriptionCalendar,
  setSubscriptionStatus,
  syncSubscriptionCalendar,
  updateSubscription,
} from "@/features/subscriptions/actions/manage-subscription";

const currencies = [
  "USD",
  "EUR",
  "GBP",
  "QAR",
  "AED",
  "SAR",
  "CAD",
  "AUD",
  "JPY",
  "DZD",
];
export function SubscriptionManager({
  subscription: s,
  calendarAdded = false,
}: {
  subscription: Subscription;
  calendarAdded?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "status" | null>(null);
  const [busy, setBusy] = useState(false);
  const [calendarAction, setCalendarAction] = useState<"sync" | "unlink" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inactive = s.status === "cancelled" || s.status === "expired";
  const days = daysUntil(s.renewal_date);
  async function save(formData: FormData) {
    setBusy(true);
    setError("");
    setSuccess("");
    const result = await updateSubscription(formData);
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setEditing(false);
    setSuccess(result.message ?? "Subscription updated.");
    router.refresh();
  }
  async function changeStatus() {
    setBusy(true);
    setError("");
    const result = await setSubscriptionStatus(
      s.id,
      inactive ? "active" : "cancelled",
    );
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      setConfirm(null);
      return;
    }
    setConfirm(null);
    setSuccess(
      result.message ?? (inactive ? "Subscription reactivated." : "Subscription cancelled."),
    );
    router.refresh();
  }
  async function syncCalendar() {
    setBusy(true);
    setCalendarAction("sync");
    setError("");
    setSuccess("");
    const result = await syncSubscriptionCalendar(s.id);
    setBusy(false);
    setCalendarAction(null);
    if (!result.success) {
      setError(result.message);
      return;
    }
    if (result.needsConnection) {
      window.location.assign("/api/calendar/connect?subscriptionId=" + s.id);
      return;
    }
    setSuccess(result.message ?? "Google Calendar is synchronized.");
    router.refresh();
  }
  async function unlinkCalendar() {
    setBusy(true);
    setCalendarAction("unlink");
    setError("");
    setSuccess("");
    const result = await removeSubscriptionCalendar(s.id);
    setBusy(false);
    setCalendarAction(null);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSuccess(result.message ?? "Removed from Google Calendar.");
    router.refresh();
  }
  async function remove() {
    setBusy(true);
    setError("");
    const result = await deleteSubscription(s.id);
    if (!result.success) {
      setBusy(false);
      setError(result.message);
      setConfirm(null);
      return;
    }
    router.push("/subscriptions");
    router.refresh();
  }
  return (
    <div className="mx-auto max-w-3xl pb-16">
      {calendarAdded && (
        <Notice tone="success" text="Renewal added to Google Calendar." />
      )}
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/subscriptions"
          className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={16} />
          Subscriptions
        </Link>
        {!editing && (
          <button
            onClick={() => {
              setEditing(true);
              setError("");
              setSuccess("");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <Edit3 size={15} />
            Edit
          </button>
        )}
      </header>
      {error && <Notice tone="error" text={error} />}{" "}
      {success && <Notice tone="success" text={success} />}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-6 sm:p-8 dark:border-slate-800">
          <div className="flex items-start gap-4 sm:gap-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-600 text-xl font-black text-white shadow-md shadow-blue-200 dark:shadow-none">
              {s.service_name[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-extrabold tracking-tight">
                  {s.service_name}
                </h1>
                <Status status={s.status} />
              </div>
              <p className="mt-1 text-sm capitalize text-slate-500">
                {s.billing_cycle} billing
              </p>
            </div>
          </div>
        </div>
        {editing ? (
          <EditForm
            subscription={s}
            busy={busy}
            onSave={save}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <Details subscription={s} days={days} />
        )}
      </section>
      {!editing && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl " + (s.calendar_event_id ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950" : "bg-blue-50 text-blue-600 dark:bg-blue-950")}>
              <CalendarDays size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold">Google Calendar</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {s.calendar_event_id
                  ? "This renewal is linked. Editing it updates the event automatically."
                  : inactive
                    ? "Reactivate this subscription before adding a calendar event."
                    : "Add this renewal directly to your connected Google Calendar."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={syncCalendar}
              disabled={busy || inactive}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {calendarAction === "sync" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {s.calendar_event_id ? "Sync now" : "Add to Google Calendar"}
            </button>
            {s.calendar_event_id && (
              <button
                onClick={unlinkCalendar}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 disabled:opacity-50 dark:border-slate-700"
              >
                {calendarAction === "unlink" ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
                Remove event
              </button>
            )}
          </div>
        </section>
      )}
      {!editing && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-sm font-bold">Manage subscription</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Changes here only update tracking in Mirqo. They do not cancel
            billing with the provider.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setConfirm("status")}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <span
                className={
                  "grid h-9 w-9 place-items-center rounded-xl " +
                  (inactive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600")
                }
              >
                {inactive ? (
                  <RotateCcw size={17} />
                ) : (
                  <PauseCircle size={17} />
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  {inactive ? "Reactivate tracking" : "Mark as cancelled"}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {inactive
                    ? "Include it in reminders again"
                    : "Stop reminders and spending totals"}
                </span>
              </span>
            </button>
            <button
              onClick={() => setConfirm("delete")}
              className="flex items-center gap-3 rounded-2xl border border-red-100 p-4 text-left text-red-600 transition hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/40"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 dark:bg-red-950">
                <Trash2 size={17} />
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  Delete permanently
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Remove this record from Mirqo
                </span>
              </span>
            </button>
          </div>
        </section>
      )}
      {confirm && (
        <ConfirmDialog
          type={confirm}
          service={s.service_name}
          cancelled={inactive}
          busy={busy}
          onClose={() => !busy && setConfirm(null)}
          onConfirm={confirm === "delete" ? remove : changeStatus}
        />
      )}
    </div>
  );
}
function Details({
  subscription: s,
  days,
}: {
  subscription: Subscription;
  days: number;
}) {
  return (
    <div className="p-6 sm:p-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <Info
          icon={CreditCard}
          label="Price"
          value={formatMoney(Number(s.amount), s.currency)}
          detail={
            s.billing_cycle === "yearly"
              ? "per year"
              : s.billing_cycle === "trial"
                ? "trial amount"
                : "per month"
          }
        />
        <Info
          icon={CalendarDays}
          label="Next renewal"
          value={formatDate(s.renewal_date)}
          detail={
            s.status === "cancelled"
              ? "Tracking paused"
              : days < 0
                ? "Past due"
                : days === 0
                  ? "Today"
                  : days + " days away"
          }
        />
        <Info
          icon={Bell}
          label="Reminder"
          value={
            s.reminder_days_before +
            " day" +
            (s.reminder_days_before === 1 ? "" : "s") +
            " before"
          }
          detail="In-app reminder"
        />
        <Info
          icon={Check}
          label="Added with"
          value={
            s.source_type === "screenshot"
              ? "Screenshot"
              : s.source_type === "text"
                ? "Email text"
                : "Manual entry"
          }
          detail={
            s.calendar_event_id ? "Calendar synced" : "Calendar not synced"
          }
        />
      </div>
      <div
        className={
          "mt-5 flex items-center gap-3 rounded-2xl border p-4 " +
          (s.calendar_event_id
            ? "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950"
            : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800")
        }
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 dark:bg-slate-900">
          <CalendarDays size={17} />
        </span>
        <div>
          <p className="text-sm font-bold">
            {s.calendar_event_id
              ? "Added to Google Calendar"
              : "Not added to Google Calendar"}
          </p>
          <p className="mt-0.5 text-xs">
            {s.calendar_event_id
              ? "Recurring renewal event is active."
              : "No Google Calendar event exists for this subscription."}
          </p>
        </div>
      </div>
      {s.notes && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
            {s.notes}
          </p>
        </div>
      )}
    </div>
  );
}
function EditForm({
  subscription: s,
  busy,
  onSave,
  onCancel,
}: {
  subscription: Subscription;
  busy: boolean;
  onSave: (data: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form action={onSave} className="p-6 sm:p-8">
      <input type="hidden" name="id" value={s.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Service name" wide>
          <input
            name="service_name"
            required
            maxLength={100}
            defaultValue={s.service_name}
          />
        </Field>
        <Field label="Amount">
          <input
            name="amount"
            type="number"
            required
            min="0"
            max="999999999"
            step="0.01"
            defaultValue={s.amount}
          />
        </Field>
        <Field label="Currency">
          <select name="currency" defaultValue={s.currency}>
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Billing cycle">
          <select name="billing_cycle" defaultValue={s.billing_cycle}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Annual</option>
            <option value="trial">Trial</option>
          </select>
        </Field>
        <Field label="Tracking status">
          <select name="status" defaultValue={s.status}>
            <option value="active">Active</option>
            <option value="trial">Free trial</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </Field>
        <Field label="Next renewal">
          <input
            name="renewal_date"
            type="date"
            required
            defaultValue={s.renewal_date}
          />
        </Field>
        <Field label="Reminder">
          <select
            name="reminder_days_before"
            defaultValue={s.reminder_days_before}
          >
            {[1, 3, 7, 14].map((day) => (
              <option key={day} value={day}>
                {day} day{day === 1 ? "" : "s"} before
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes" wide>
          <textarea
            name="notes"
            rows={4}
            maxLength={1000}
            defaultValue={s.notes ?? ""}
            placeholder="Optional notes about this subscription"
          />
        </Field>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500 dark:border-slate-700"
        >
          Cancel
        </button>
        <button
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          Save changes
        </button>
      </div>
    </form>
  );
}
function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={
        "block text-xs font-semibold text-slate-600 dark:text-slate-300 " +
        (wide ? "sm:col-span-2" : "")
      }
    >
      {label}
      <div className="mt-2 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:bg-slate-50 [&_input]:px-4 [&_input]:py-3 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-slate-50 [&_select]:px-4 [&_select]:py-3 [&_select]:text-sm [&_textarea]:w-full [&_textarea]:resize-none [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:bg-slate-50 [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-sm dark:[&_input]:border-slate-700 dark:[&_input]:bg-slate-950 dark:[&_select]:border-slate-700 dark:[&_select]:bg-slate-950 dark:[&_textarea]:border-slate-700 dark:[&_textarea]:bg-slate-950">
        {children}
      </div>
    </label>
  );
}
function Info({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-bold">{value}</p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
function Status({ status }: { status: Subscription["status"] }) {
  const style =
    status === "cancelled" || status === "expired"
      ? "bg-slate-100 text-slate-500"
      : status === "trial"
        ? "bg-cyan-50 text-cyan-600"
        : "bg-emerald-50 text-emerald-600";
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize " +
        style
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
function Notice({ tone, text }: { tone: "error" | "success"; text: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        "mb-4 flex items-center gap-2 rounded-xl p-3 text-sm " +
        (tone === "error"
          ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200")
      }
    >
      {tone === "error" ? <AlertCircle size={16} /> : <Check size={16} />}
      <span>{text}</span>
    </div>
  );
}
function ConfirmDialog({
  type,
  service,
  cancelled,
  busy,
  onClose,
  onConfirm,
}: {
  type: "delete" | "status";
  service: string;
  cancelled: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const deleting = type === "delete";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between">
          <span
            className={
              "grid h-11 w-11 place-items-center rounded-2xl " +
              (deleting
                ? "bg-red-50 text-red-600 dark:bg-red-950"
                : "bg-amber-50 text-amber-600")
            }
          >
            {deleting ? (
              <Trash2 size={20} />
            ) : cancelled ? (
              <RotateCcw size={20} />
            ) : (
              <PauseCircle size={20} />
            )}
          </span>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={17} />
          </button>
        </div>
        <h2 id="confirm-title" className="mt-5 text-lg font-bold">
          {deleting
            ? "Delete subscription?"
            : cancelled
              ? "Reactivate subscription?"
              : "Mark as cancelled?"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {deleting
            ? "This permanently removes " +
              service +
              " from Mirqo. This cannot be undone."
            : cancelled
              ? "Mirqo will include " +
                service +
                " in spending totals and reminders again."
              : "Mirqo will stop reminders and exclude " +
                service +
                " from spending totals. Your provider billing is not affected."}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold dark:border-slate-700"
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 " +
              (deleting ? "bg-red-600" : "bg-blue-600")
            }
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {deleting ? "Delete" : cancelled ? "Reactivate" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value + "T00:00:00"));
}
