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
  Banknote,
  PauseCircle,
  RotateCcw,
  RefreshCw,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import type { CommitmentPayment, CommitmentType, HouseholdMember, Subscription, SubscriptionSplit } from "@/types/database";
import { COMMITMENT_TYPES } from "@/features/subscriptions/constants";
import { COMMITMENT_TYPE_ICONS } from "@/lib/commitment-type";
import { daysUntil, effectiveRenewalDate, formatMoney } from "@/lib/subscriptions";
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import {
  deleteSubscription,
  removeSubscriptionCalendar,
  setSubscriptionStatus,
  syncSubscriptionCalendar,
  updateSubscription,
} from "@/features/subscriptions/actions/manage-subscription";
import { deleteCommitmentPayment, recordCommitmentPayment, updateCommitmentPayment } from "@/features/subscriptions/actions/record-payment";
import { useLocale } from "@/components/locale-provider";
import { format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";

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
type T = Dictionary["subscriptionManager"];

function reminderText(n: number, t: T) {
  return n === 1 ? format(t.dayBefore, { n }) : format(t.daysBefore, { n });
}

export function SubscriptionManager({
  subscription: s,
  calendarAdded = false,
  householdMembers = [],
  splits = [],
  payments = [],
}: {
  subscription: Subscription;
  calendarAdded?: boolean;
  householdMembers?: HouseholdMember[];
  splits?: SubscriptionSplit[];
  payments?: CommitmentPayment[];
}) {
  const router = useRouter();
  const { dict, locale } = useLocale();
  const t = dict.subscriptionManager;
  const splitMembers = householdMembers.filter((member) => splits.some((split) => split.household_member_id === member.id));
  const perPersonAmount = splitMembers.length > 0 ? Number(s.amount) / splitMembers.length : 0;
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "status" | null>(null);
  const [busy, setBusy] = useState(false);
  const [calendarAction, setCalendarAction] = useState<"sync" | "unlink" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastRecordedPaymentId, setLastRecordedPaymentId] = useState<string | null>(null);
  const inactive = s.status === "cancelled" || s.status === "expired";
  const displayedRenewalDate = effectiveRenewalDate(s);
  const renewalDateIsDerived = displayedRenewalDate !== s.renewal_date;
  const days = daysUntil(displayedRenewalDate);
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
    setSuccess(result.message ?? t.subscriptionUpdated);
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
    setSuccess(result.message ?? "");
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
    setSuccess(result.message ?? "");
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
    setSuccess(result.message ?? "");
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
  async function recordPayment(formData: FormData) {
    setBusy(true); setError(""); setSuccess("");
    const result = await recordCommitmentPayment(formData);
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setLastRecordedPaymentId(result.paymentId); setSuccess(result.message); router.refresh();
  }
  async function editPayment(formData: FormData) {
    setBusy(true); setError(""); setSuccess(""); const result = await updateCommitmentPayment(formData); setBusy(false);
    if (!result.success) { setError(result.message); return; } setSuccess(result.message); router.refresh();
  }
  async function removePayment(paymentId: string) {
    setBusy(true); setError(""); setSuccess(""); const result = await deleteCommitmentPayment(paymentId, s.id); setBusy(false);
    if (!result.success) { setError(result.message); return; } setLastRecordedPaymentId(null); setSuccess(result.message); router.refresh();
  }
  return (
    <div className="mx-auto max-w-4xl pb-16">
      {calendarAdded && (
        <Notice tone="success" text={t.calendarAddedNotice} />
      )}
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/subscriptions"
          className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {t.subscriptions}
        </Link>
        {!editing && (
          <button onClick={() => { setEditing(true); setError(""); setSuccess(""); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <Edit3 size={15} />{t.edit}
          </button>
        )}
      </header>
      {error && <Notice tone="error" text={error} />}{" "}
      {success && <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"><Check size={16}/><span className="min-w-0 flex-1">{success}</span>{lastRecordedPaymentId && <button type="button" disabled={busy} onClick={() => removePayment(lastRecordedPaymentId)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm disabled:opacity-50"><RotateCcw size={13}/>{locale === "ar" ? "تراجع" : "Undo"}</button>}</div>}
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[var(--shadow-feature)] dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-6 sm:p-8 dark:border-slate-800">
          <div className="flex items-start gap-4 sm:gap-5">
            <ServiceLogo name={s.service_name} className="h-14 w-14 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-extrabold tracking-tight">{s.service_name}</h1><Status status={s.status} t={t} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{dict.commitmentTypes[s.commitment_type]}</span></div>
              <p className="mt-1 text-sm text-slate-500">{s.billing_cycle === "yearly" ? dict.common.yearly : s.billing_cycle === "trial" ? dict.common.trial : dict.common.monthly} {t.billing}{splitMembers.length > 0 ? ` · ${dict.household.splitWith}: ${splitMembers.map((m) => m.name).join(", ")} (${formatMoney(perPersonAmount, s.currency)} ${dict.household.each})` : ""}{s.counterparty_name ? ` · ${dict.subscriptionManager.counterpartyName}: ${s.counterparty_name}` : ""}</p>
            </div>
          </div>
        </div>
        {editing ? (
          <EditForm
            t={t}
            commitmentTypes={dict.commitmentTypes}
            commitmentTypeHints={dict.commitmentTypeHints}
            household={dict.household}
            householdMembers={householdMembers}
            splits={splits}
            subscription={s}
            busy={busy}
            onSave={save}
            onCancel={() => setEditing(false)}
          />
        ) : <Details t={t} subscription={s} payments={payments} days={days} displayedRenewalDate={displayedRenewalDate} renewalDateIsDerived={renewalDateIsDerived} />}
      </section>
      {!editing && !inactive && <PaymentCard locale={locale} subscription={s} payments={payments} busy={busy} onPay={recordPayment} onEdit={editPayment} onDelete={removePayment} />}
      {!editing && <CalendarCard t={t} subscription={s} inactive={inactive} busy={busy} calendarAction={calendarAction} onSync={syncCalendar} onUnlink={unlinkCalendar} />}
      {!editing && <ManageCard t={t} inactive={inactive} onStatus={() => setConfirm("status")} onDelete={() => setConfirm("delete")} />}
      {confirm && (
        <ConfirmDialog
          t={t}
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
  t,
  subscription: s,
  payments,
  days,
  displayedRenewalDate,
  renewalDateIsDerived,
}: {
  t: T;
  subscription: Subscription;
  payments: CommitmentPayment[];
  days: number;
  displayedRenewalDate: string;
  renewalDateIsDerived: boolean;
}) {
  const interval = s.billing_cycle === "yearly" ? 12 : s.billing_interval_months || 1;
  const paymentLabel = s.commitment_type === "bill" ? "Next due date" : s.commitment_type === "bnpl" ? "Next installment" : t.nextExpectedRenewal;
  const frequency = s.billing_cycle === "trial" ? t.trialAmount : interval === 1 ? t.perMonth : interval === 12 ? t.perYear : `Every ${interval} months`;
  const debtOriginal = Number(s.original_amount ?? s.amount);
  const recordedDebtPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const debtPaid = Math.min(debtOriginal, recordedDebtPayments);
  const debtRemaining = Math.max(0, debtOriginal - debtPaid);
  const debtProgress = debtOriginal > 0 ? Math.min(100, Math.round(debtPaid / debtOriginal * 100)) : 0;
  return (
    <div className="p-6 sm:p-8">
      {s.commitment_type === "debt" && <div className={`mb-5 overflow-hidden rounded-2xl border ${s.debt_direction === "owed_to_me" ? "border-emerald-100 bg-emerald-50/60" : "border-orange-100 bg-orange-50/60"}`}><div className="flex flex-wrap items-end justify-between gap-4 p-5"><div><p className={`text-xs font-bold ${s.debt_direction === "owed_to_me" ? "text-emerald-700" : "text-orange-700"}`}>{s.debt_direction === "owed_to_me" ? "Owed to you" : "You owe"}</p><p className="mt-2 text-3xl font-black">{formatMoney(debtRemaining,s.currency)}</p><p className="mt-1 text-xs text-slate-500">Remaining from {formatMoney(debtOriginal,s.currency)}</p></div><div className="text-end"><strong className="text-lg">{debtProgress}%</strong><p className="text-xs text-slate-500">repaid</p></div></div><div className="mx-5 mb-5 h-2.5 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full ${s.debt_direction === "owed_to_me" ? "bg-emerald-500" : "bg-orange-500"}`} style={{width:`${debtProgress}%`}}/></div><div className="grid grid-cols-2 border-t border-white/70 text-center"><div className="p-3"><small className="text-slate-500">Paid so far</small><strong className="mt-1 block text-sm">{formatMoney(debtPaid,s.currency)}</strong></div><div className="border-s border-white/70 p-3"><small className="text-slate-500">Next payment</small><strong className="mt-1 block text-sm">{formatMoney(Number(s.amount),s.currency)}</strong></div></div></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Info icon={CreditCard} label={s.commitment_type === "bnpl" ? "Installment amount" : s.commitment_type === "bill" ? "Bill amount" : t.price} value={formatMoney(Number(s.amount), s.currency)} detail={s.commitment_type === "bill" && s.amount_is_variable ? `Variable · ${frequency}` : frequency} />
        <Info icon={CalendarDays} label={paymentLabel} value={formatDate(displayedRenewalDate)} detail={s.status === "cancelled" ? t.trackingPaused : renewalDateIsDerived ? format(t.calculatedFrom, { date: formatDate(s.renewal_date) }) : days === 0 ? t.today : format(t.daysAway, { days })} />
        <Info icon={Bell} label={t.reminder} value={reminderText(s.reminder_days_before, t)} detail={t.inAppReminder} />
      </div>
      {s.notes && <div className="mt-5 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t.notes}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{s.notes}</p></div>}
    </div>
  );
}

function PaymentCard({ locale, subscription: s, payments, busy, onPay, onEdit, onDelete }: { locale:"en"|"ar"; subscription: Subscription; payments: CommitmentPayment[]; busy: boolean; onPay: (data: FormData) => void; onEdit: (data: FormData) => void; onDelete: (id: string) => void }) {
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [paidAt, setPaidAt] = useState(todayValue);
  const [confirmPayment, setConfirmPayment] = useState<{amount:string;paidAt:string}|null>(null);
  const [editingPayment, setEditingPayment] = useState<string|null>(null);
  const currentPeriodPaid = payments.some((payment) => payment.due_date === s.renewal_date);
  const overdue = daysUntil(s.renewal_date) < 0;
  const isInstallment = s.commitment_type === "bnpl";
  const isDebt = s.commitment_type === "debt";
  const calculatedDebtRemaining = isDebt ? Math.max(0, Number(s.original_amount ?? s.amount) - payments.reduce((sum,payment)=>sum+Number(payment.amount),0)) : 0;
  const paid = s.installments_paid ?? 0;
  const total = s.installment_count ?? 0;
  const progress = total ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const totalPaid = paid * Number(s.amount);
  const totalRemaining = Math.max(0, total - paid) * Number(s.amount);
  const expectedEnd = (()=>{const date=new Date(`${s.renewal_date}T00:00:00`);date.setMonth(date.getMonth()+Math.max(0,total-paid-1)*(s.billing_interval_months||1));return Number.isNaN(date.getTime())?null:date.toISOString().slice(0,10)})();
  const change = payments.length > 1 && Number(payments[1].amount) > 0 ? Math.round(((Number(payments[0].amount) - Number(payments[1].amount)) / Number(payments[1].amount)) * 100) : null;
  const billAverage = s.commitment_type === "bill" && payments.length ? payments.slice(0,3).reduce((sum,payment)=>sum+Number(payment.amount),0)/Math.min(3,payments.length) : null;
  const c=locale==="ar"?{bill:"دفع الفاتورة",installment:"تقدم الأقساط",record:"تسجيل دفعة",due:"الاستحقاق",overdue:"متأخر",unpaid:"غير مدفوع",paidDate:"مدفوع في هذا التاريخ",paid:"مدفوع",remaining:"متبقي",amount:"المبلغ",paidOn:"تاريخ الدفع",mark:"تسجيل كمدفوع",already:"مدفوع مسبقًا",history:"سجل الدفعات",edit:"تعديل الدفعة",remove:"حذف الدفعة",save:"حفظ",cancel:"إلغاء",confirm:"تأكيد الدفع",confirmText:"تسجيل {amount} كدفعة بتاريخ {date}؟",saving:"جارٍ الحفظ…",higher:"أعلى",lower:"أقل",same:"نفس قيمة الفاتورة السابقة",average:"متوسط آخر",payments:"دفعات",paidTotal:"المدفوع",expected:"النهاية المتوقعة",deleteAsk:"حذف هذه الدفعة وإعادة حساب الإجماليات؟"}:{bill:"Bill payment",installment:"Installment progress",record:"Record payment",due:"Due",overdue:"Overdue",unpaid:"Unpaid",paidDate:"Paid on this date",paid:"Paid",remaining:"remaining",amount:"Amount",paidOn:"Paid on",mark:"Mark as paid",already:"Already paid",history:"Payment history",edit:"Edit payment",remove:"Delete payment",save:"Save",cancel:"Cancel",confirm:"Confirm payment",confirmText:"Record {amount} as paid on {date}?",saving:"Saving…",higher:"higher",lower:"lower",same:"Same amount as the previous bill",average:"Average of the last",payments:"payments",paidTotal:"Paid",expected:"Expected end",deleteAsk:"Delete this payment and recalculate totals?"};
  const localizedTitle=s.commitment_type==="bill"?c.bill:isInstallment?c.installment:isDebt?(locale==="ar"?"تسجيل دفعة دين":"Record debt payment"):c.record;
  return <section className="ui-card mt-5 overflow-hidden p-0">
    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${overdue ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}><Banknote size={18}/></span><div><h2 className="text-sm font-bold">{localizedTitle}</h2><p className="mt-1 text-xs text-slate-500">{overdue ? `${c.overdue} · ${formatDate(s.renewal_date)}` : `${c.due} ${formatDate(s.renewal_date)}`}</p></div></div>
      <span className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-bold ${currentPeriodPaid ? "bg-emerald-50 text-emerald-700" : overdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>{currentPeriodPaid ? c.paid : overdue ? c.overdue : c.unpaid}</span>
    </div>
    {isInstallment && total > 0 && <div className="border-b border-slate-100 px-5 py-4"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold">{paid} / {total} {c.paid}</span><strong className="text-violet-600">{Math.max(0,total-paid)} {c.remaining}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500" style={{width:`${progress}%`}}/></div><div className="mt-3 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-3 text-center"><div><small className="block text-[9px] text-slate-400">{c.paidTotal}</small><strong className="mt-1 block text-xs">{formatMoney(totalPaid,s.currency)}</strong></div><div><small className="block text-[9px] text-slate-400">{c.remaining}</small><strong className="mt-1 block text-xs">{formatMoney(totalRemaining,s.currency)}</strong></div><div><small className="block text-[9px] text-slate-400">{c.expected}</small><strong className="mt-1 block text-xs">{expectedEnd?formatDate(expectedEnd):"—"}</strong></div></div></div>}
    {s.commitment_type === "bill" && s.amount_is_variable && change !== null && <div className={`border-b px-5 py-3 text-xs font-semibold ${change > 0 ? "border-red-100 bg-red-50/60 text-red-700" : "border-emerald-100 bg-emerald-50/60 text-emerald-700"}`}>{change === 0 ? c.same : `${Math.abs(change)}% ${change > 0 ? c.higher : c.lower}`}</div>}
    {billAverage !== null && <div className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">{c.average} {Math.min(3,payments.length)} {c.payments}: <strong className="text-slate-800">{formatMoney(billAverage,s.currency)}</strong></div>}
    <form onSubmit={(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);setConfirmPayment({amount:String(data.get("amount")||"0"),paidAt:String(data.get("paid_at")||todayValue)});}} className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="subscription_id" value={s.id}/>
      <label className="text-xs font-semibold text-slate-500">{c.amount}<input name="amount" type="number" min="0" max={isDebt ? calculatedDebtRemaining : undefined} step="0.01" required defaultValue={isDebt ? Math.min(Number(s.amount),calculatedDebtRemaining) : Number(s.amount)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"/></label>
      <label className="text-xs font-semibold text-slate-500">{c.paidOn}<input name="paid_at" type="date" required value={paidAt} onChange={(event)=>setPaidAt(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500"/></label>
      <button disabled={busy || currentPeriodPaid} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-70"><Check size={16}/>{busy ? c.saving : currentPeriodPaid ? c.already : c.mark}</button>
    </form>
    {payments.length > 0 && <div className="border-t border-slate-100 px-5 py-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Payment history</p><div className="space-y-2">{payments.slice(0,5).map(payment=>editingPayment===payment.id?<form key={payment.id} action={async(data)=>{await onEdit(data);setEditingPayment(null);}} className="grid gap-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3 sm:grid-cols-[1fr_1fr_auto]"><input type="hidden" name="payment_id" value={payment.id}/><input type="hidden" name="subscription_id" value={s.id}/><input name="amount" type="number" min="0" step="0.01" required defaultValue={Number(payment.amount)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"/><input name="paid_at" type="date" required defaultValue={payment.paid_at} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"/><div className="flex gap-1"><button disabled={busy} className="rounded-lg bg-blue-600 px-3 text-xs font-bold text-white">Save</button><button type="button" onClick={()=>setEditingPayment(null)} className="rounded-lg bg-white px-3 text-xs font-bold text-slate-500">Cancel</button></div></form>:<div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs"><span className="min-w-0"><strong className="text-slate-700">Paid</strong><span className="ms-2 text-slate-400">{formatDate(payment.paid_at)}</span></span><span className="flex items-center gap-2"><strong className="text-emerald-700">{formatMoney(Number(payment.amount),payment.currency)}</strong><button type="button" aria-label="Edit payment" onClick={()=>setEditingPayment(payment.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-blue-600"><Edit3 size={13}/></button><button type="button" aria-label="Delete payment" onClick={()=>{if(window.confirm("Delete this payment and recalculate totals?"))onDelete(payment.id)}} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"><Trash2 size={13}/></button></span></div>)}</div></div>}
    {confirmPayment && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Check size={21}/></span><h3 className="mt-4 text-center text-lg font-bold">Confirm payment</h3><p className="mt-2 text-center text-sm leading-6 text-slate-500">Record <strong className="text-slate-900">{formatMoney(Number(confirmPayment.amount),s.currency)}</strong> as paid on <strong className="text-slate-900">{formatDate(confirmPayment.paidAt)}</strong>?</p><div className="mt-6 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setConfirmPayment(null)} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">Cancel</button><button type="button" disabled={busy} onClick={async()=>{const data=new FormData();data.set("subscription_id",s.id);data.set("amount",confirmPayment.amount);data.set("paid_at",confirmPayment.paidAt);await onPay(data);setConfirmPayment(null);}} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Saving…":"Confirm"}</button></div></div></div>}
  </section>;
}

function CalendarCard({ t, subscription: s, inactive, busy, calendarAction, onSync, onUnlink }: {
  t: T; subscription: Subscription; inactive: boolean; busy: boolean; calendarAction: "sync" | "unlink" | null; onSync: () => void; onUnlink: () => void;
}) {
  return (
    <section className="ui-card mt-5 p-5">
      <div className="flex items-start gap-3">
        <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl " + (s.calendar_event_id ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950" : "bg-blue-50 text-blue-600 dark:bg-blue-950")}><CalendarDays size={18} /></span>
        <div className="min-w-0 flex-1"><h2 className="text-sm font-bold">{t.googleCalendar}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{s.calendar_event_id ? t.calendarLinkedDesc : inactive ? t.calendarReactivateFirst : t.calendarAddDesc}</p></div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button onClick={onSync} disabled={busy || inactive} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{calendarAction === "sync" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}{s.calendar_event_id ? t.syncNow : t.addToCalendar}</button>
        {s.calendar_event_id && <button onClick={onUnlink} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 disabled:opacity-50 dark:border-slate-700">{calendarAction === "unlink" ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}{t.removeEvent}</button>}
      </div>
    </section>
  );
}

function ManageCard({ t, inactive, onStatus, onDelete }: { t: T; inactive: boolean; onStatus: () => void; onDelete: () => void }) {
  return <section className="ui-card mt-5 p-5">
    <h2 className="text-sm font-bold">{t.manageSubscription}</h2>
    <p className="mt-1 text-xs leading-5 text-slate-500">{t.manageDesc}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <button onClick={onStatus} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-start transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
        <span className={"grid h-9 w-9 place-items-center rounded-xl " + (inactive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>{inactive ? <RotateCcw size={17} /> : <PauseCircle size={17} />}</span>
        <span><span className="block text-sm font-semibold">{inactive ? t.reactivateTracking : t.markCancelled}</span><span className="mt-0.5 block text-xs text-slate-500">{inactive ? t.includeAgain : t.stopReminders}</span></span>
      </button>
      <button onClick={onDelete} className="flex items-center gap-3 rounded-2xl border border-red-100 p-4 text-start text-red-600 transition hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/40">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 dark:bg-red-950"><Trash2 size={17} /></span>
        <span><span className="block text-sm font-semibold">{t.deletePermanently}</span><span className="mt-0.5 block text-xs text-slate-500">{t.removeRecord}</span></span>
      </button>
    </div>
  </section>;
}
function EditForm({
  t,
  commitmentTypes,
  commitmentTypeHints,
  household,
  householdMembers,
  splits,
  subscription: s,
  busy,
  onSave,
  onCancel,
}: {
  t: T;
  commitmentTypes: Dictionary["commitmentTypes"];
  commitmentTypeHints: Dictionary["commitmentTypeHints"];
  household: Dictionary["household"];
  householdMembers: HouseholdMember[];
  splits: SubscriptionSplit[];
  subscription: Subscription;
  busy: boolean;
  onSave: (data: FormData) => void;
  onCancel: () => void;
}) {
  const [editType, setEditType] = useState<CommitmentType>(s.commitment_type);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(splits.map((split) => split.household_member_id));
  const editAmount = Number(s.amount);
  const perPersonAmount = selectedMemberIds.length > 0 ? editAmount / selectedMemberIds.length : 0;
  function toggleMember(id: string) {
    setSelectedMemberIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }
  return (
    <form action={onSave} className="p-6 sm:p-8">
      <input type="hidden" name="id" value={s.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.serviceName} wide>
          <input
            name="service_name"
            required
            maxLength={100}
            defaultValue={s.service_name}
          />
        </Field>
        <Field label={t.commitmentType} hint={commitmentTypeHints[editType]}>
          <input type="hidden" name="commitment_type" value={editType} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMMITMENT_TYPES.map((value) => {
              const Icon = COMMITMENT_TYPE_ICONS[value];
              const active = editType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEditType(value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[11px] font-semibold ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}
                >
                  <Icon size={17} />
                  {commitmentTypes[value]}
                </button>
              );
            })}
          </div>
        </Field>
        {editType === "debt" && (
          <Field label={t.counterpartyName}>
            <input
              name="counterparty_name"
              maxLength={100}
              defaultValue={s.counterparty_name ?? ""}
              placeholder={t.counterpartyPlaceholder}
            />
          </Field>
        )}
        {editType === "debt" && <><Field label="Debt direction"><select name="debt_direction" defaultValue={s.debt_direction ?? "i_owe"}><option value="i_owe">I owe</option><option value="owed_to_me">Owed to me</option></select></Field><Field label="Original debt amount"><input name="original_amount" type="number" min="0" step="0.01" required defaultValue={s.original_amount ?? s.amount}/></Field><Field label="Remaining balance"><input name="remaining_balance" type="number" min="0" step="0.01" required defaultValue={s.remaining_balance ?? s.original_amount ?? s.amount}/></Field></>}
        <Field label={t.amount}>
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
        {editType === "bill" && <Field label="Amount behavior"><select name="amount_is_variable" defaultValue={String(s.amount_is_variable)}><option value="false">Fixed amount</option><option value="true">Variable amount</option></select></Field>}
        {editType === "bnpl" && <><Field label="Total installments"><input name="installment_count" type="number" min="1" max="600" required defaultValue={s.installment_count ?? ""}/></Field><Field label="Installments paid"><input name="installments_paid" type="number" min="0" max={s.installment_count ?? 600} required defaultValue={s.installments_paid ?? 0}/></Field></>}
        <Field label={t.currency}>
          <select name="currency" defaultValue={s.currency}>
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={t.billingCycle}>
          <select name="billing_cycle" defaultValue={s.billing_cycle}>
            <option value="monthly">{t.perMonth}</option>
            <option value="yearly">{t.perYear}</option>
            <option value="trial">{t.trialAmount}</option>
          </select>
        </Field>
        <Field label="Repeat every (months)">
          <input
            name="billing_interval_months"
            type="number"
            required
            min="1"
            max="120"
            defaultValue={s.billing_interval_months || (s.billing_cycle === "yearly" ? 12 : 1)}
          />
        </Field>
        <Field label={t.trackingStatus}>
          <select name="status" defaultValue={s.status}>
            <option value="active">{t.active}</option>
            <option value="trial">{t.freeTrial}</option>
            <option value="cancelled">{t.cancelled}</option>
            <option value="expired">{t.expired}</option>
          </select>
        </Field>
        <Field label={t.nextRenewal}>
          <input
            name="renewal_date"
            type="date"
            required
            defaultValue={s.renewal_date}
          />
        </Field>
        <Field label={t.reminder}>
          <select
            name="reminder_days_before"
            defaultValue={s.reminder_days_before}
          >
            {[1, 3, 7, 14].map((day) => (
              <option key={day} value={day}>
                {reminderText(day, t)}
              </option>
            ))}
          </select>
        </Field>
        {householdMembers.length > 0 && (
          <div className="sm:col-span-2">
            <p className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{household.splitWith}</p>
            {selectedMemberIds.map((id) => (
              <input key={id} type="hidden" name="household_member_ids" value={id} />
            ))}
            <div className="mt-2 space-y-2">
              {householdMembers.map((member) => {
                const checked = selectedMemberIds.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm ${checked ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : "border-slate-200 dark:border-slate-700"}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(member.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="font-semibold">{member.name}</span>
                    </span>
                    {checked && perPersonAmount > 0 && (
                      <span className="text-xs font-bold text-blue-600">{formatMoney(perPersonAmount, s.currency)} {household.each}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}
        <Field label={t.notes} wide>
          <textarea
            name="notes"
            rows={4}
            maxLength={1000}
            defaultValue={s.notes ?? ""}
            placeholder={t.notesPlaceholder}
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
          {t.cancel}
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
          {t.saveChanges}
        </button>
      </div>
    </form>
  );
}
function Field({
  label,
  wide = false,
  hint,
  children,
}: {
  label: string;
  wide?: boolean;
  hint?: string;
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
      {hint && <p className="mt-1.5 text-[11px] font-normal leading-4 text-slate-400">{hint}</p>}
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
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950"><Icon size={16} /></span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 truncate text-sm font-bold">{value}</p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
function Status({ status, t }: { status: Subscription["status"]; t: T }) {
  const style =
    status === "cancelled" || status === "expired"
      ? "bg-slate-100 text-slate-500"
      : status === "trial"
        ? "bg-cyan-50 text-cyan-600"
        : "bg-emerald-50 text-emerald-600";
  const label = status === "cancelled" ? t.cancelled : status === "expired" ? t.expired : status === "trial" ? t.freeTrial : t.active;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold " +
        style
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
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
  t,
  type,
  service,
  cancelled,
  busy,
  onClose,
  onConfirm,
}: {
  t: T;
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900 sm:rounded-3xl"
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
            aria-label={t.closeDialog}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={17} />
          </button>
        </div>
        <h2 id="confirm-title" className="mt-5 text-lg font-bold">
          {deleting
            ? t.deleteTitle
            : cancelled
              ? t.reactivateTitle
              : t.cancelTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {deleting
            ? format(t.deleteBody, { service })
            : cancelled
              ? format(t.reactivateBody, { service })
              : format(t.cancelBody, { service })}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold dark:border-slate-700"
          >
            {t.keepIt}
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
            {deleting ? t.delete : cancelled ? t.reactivate : t.confirm}
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
