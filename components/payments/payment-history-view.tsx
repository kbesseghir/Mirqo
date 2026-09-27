"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  ChevronRight,
  Download,
  Edit3,
  ReceiptText,
  Search,
  Trash2,
} from "lucide-react";
import type { CommitmentPayment, CommitmentType, Subscription } from "@/types/database";
import {
  deleteCommitmentPayment,
  updateCommitmentPayment,
} from "@/features/subscriptions/actions/record-payment";
import { formatMoney } from "@/lib/subscriptions";
import { useLocale } from "@/components/locale-provider";
import { ServiceLogo } from "@/components/subscriptions/service-logo";

type Props = {
  payments: CommitmentPayment[];
  subscriptions: Subscription[];
};

export function PaymentHistoryView({ payments, subscriptions }: Props) {
  const { dict, locale } = useLocale();
  const ar = locale === "ar";
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [type, setType] = useState<"all" | CommitmentType>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const byId = useMemo(
    () => new Map(subscriptions.map((item) => [item.id, item])),
    [subscriptions],
  );

  const rows = useMemo(
    () =>
      payments.filter((payment) => {
        const item = byId.get(payment.subscription_id);
        return (
          (!query || item?.service_name.toLowerCase().includes(query.toLowerCase())) &&
          (!month || payment.paid_at.startsWith(month)) &&
          (type === "all" || item?.commitment_type === type)
        );
      }),
    [payments, byId, query, month, type],
  );

  const currencies = useMemo(() => Array.from(new Set(rows.map((row) => row.currency))), [rows]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthRows = payments.filter((payment) => payment.paid_at.startsWith(currentMonth));
  const primaryCurrency = rows[0]?.currency ?? payments[0]?.currency ?? "USD";
  const visibleTotal = rows
    .filter((payment) => payment.currency === primaryCurrency)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const thisMonthTotal = thisMonthRows
    .filter((payment) => payment.currency === primaryCurrency)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  function exportCsv() {
    const values = [
      ["Service", "Type", "Amount", "Currency", "Paid date", "Due date"],
      ...rows.map((payment) => {
        const item = byId.get(payment.subscription_id);
        return [
          item?.service_name ?? "",
          item?.commitment_type ?? "",
          String(payment.amount),
          payment.currency,
          payment.paid_at,
          payment.due_date ?? "",
        ];
      }),
    ];
    const csv = values
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mirqo-payments-${month || "all"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker">
            {ar ? "مدفوعاتك الفعلية" : "Your actual payments"}
          </p>
          <h1 className="page-title">
            {ar ? "سجل الدفعات" : "Payment history"}
          </h1>
          <p className="page-description">
            {ar
              ? "كل ما دفعته، منظّم وواضح في مكان واحد."
              : "Every payment you have recorded, clear and organized."}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!rows.length}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={17} />
          {ar ? "تصدير CSV" : "Export CSV"}
        </button>
      </header>

      <section className="metric-strip mt-7 grid gap-3 sm:grid-cols-3 sm:gap-4">
        <SummaryCard
          icon={ReceiptText}
          label={ar ? "كل الدفعات" : "All payments"}
          value={String(payments.length)}
          note={ar ? "دفعة مسجلة" : "recorded transactions"}
        />
        <SummaryCard
          icon={CalendarDays}
          label={ar ? "هذا الشهر" : "This month"}
          value={formatMoney(thisMonthTotal, primaryCurrency)}
          note={`${thisMonthRows.length} ${ar ? "دفعة" : "payments"}`}
        />
        <SummaryCard icon={Banknote} label={ar ? "إجمالي النتائج" : "Filtered total"} value={formatMoney(visibleTotal, primaryCurrency)} note={`${rows.length} ${ar ? "دفعة" : "payments"}`} primary />
      </section>

      <section className="workspace-section mt-7 overflow-hidden">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">
                {ar ? "الدفعات المسجلة" : "Recorded payments"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {ar ? "ابحث أو صفِّ النتائج وعدّلها عند الحاجة." : "Search, filter and correct any payment."}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {rows.length}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_220px]">
            <label className="relative">
              <Search size={17} className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                placeholder={ar ? "ابحث باسم الالتزام…" : "Search by commitment…"}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pe-4 ps-11 text-sm font-medium outline-none transition focus:border-slate-300 focus:bg-white"
              />
            </label>
            <input
              type="month"
              value={month}
              onChange={(event) => { setMonth(event.target.value); setPage(1); }}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
            />
            <select
              value={type}
              onChange={(event) => { setType(event.target.value as typeof type); setPage(1); }}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
            >
              <option value="all">{ar ? "كل الأنواع" : "All commitment types"}</option>
              {Object.entries(dict.commitmentTypes).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {message && (
          <div className="mx-5 mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 sm:mx-6">
            {message}
          </div>
        )}

        <div className="p-3 sm:p-4">
          <div className="hidden grid-cols-[minmax(260px,1.4fr)_180px_190px_110px] gap-4 px-4 pb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 md:grid">
            <span>{ar ? "الالتزام" : "Commitment"}</span>
            <span>{ar ? "المبلغ" : "Amount"}</span>
            <span>{ar ? "تاريخ الدفع" : "Paid on"}</span>
            <span className="text-end">{ar ? "إجراءات" : "Actions"}</span>
          </div>

          <div className="space-y-2">
            {visibleRows.map((payment) => {
              const item = byId.get(payment.subscription_id);
              const displayDate = new Date(`${payment.paid_at}T12:00:00`).toLocaleDateString(locale, {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              if (editing === payment.id) {
                return (
                  <form
                    key={payment.id}
                    action={async (data) => {
                      const result = await updateCommitmentPayment(data);
                      setMessage(result.message);
                      if (result.success) setEditing(null);
                    }}
                    className="grid gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 md:grid-cols-[minmax(220px,1fr)_170px_180px_auto] md:items-center"
                  >
                    <input type="hidden" name="payment_id" value={payment.id} />
                    <input type="hidden" name="subscription_id" value={payment.subscription_id} />
                    <div className="flex min-w-0 items-center gap-3">
                      {item && <ServiceLogo name={item.service_name} className="size-11 rounded-xl" />}
                      <strong className="truncate text-sm text-slate-900">
                        {item?.service_name ?? (ar ? "التزام محذوف" : "Deleted commitment")}
                      </strong>
                    </div>
                    <input
                      name="amount"
                      type="number"
                      step=".01"
                      min="0"
                      defaultValue={Number(payment.amount)}
                      className="h-11 rounded-xl border border-blue-100 bg-white px-3 text-sm font-bold outline-none focus:border-blue-300"
                    />
                    <input
                      name="paid_at"
                      type="date"
                      defaultValue={payment.paid_at}
                      className="h-11 rounded-xl border border-blue-100 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-300"
                    />
                    <div className="flex gap-2">
                      <button className="h-11 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700">
                        {ar ? "حفظ" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="h-11 rounded-xl bg-white px-4 text-xs font-bold text-slate-600"
                      >
                        {ar ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={payment.id}
                  className="group grid gap-3 rounded-2xl border border-transparent bg-slate-50/80 p-4 transition hover:border-slate-200 hover:bg-white hover:shadow-sm md:grid-cols-[minmax(260px,1.4fr)_180px_190px_110px] md:items-center"
                >
                  <Link href={`/payments/${payment.id}`} className="flex min-w-0 items-center gap-3">
                    {item ? (
                      <ServiceLogo name={item.service_name} className="size-11 rounded-xl" />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-200 text-slate-500">
                        <ReceiptText size={18} />
                      </span>
                    )}
                    <span className="min-w-0">
                      <strong className="block truncate text-[15px] text-slate-950">
                        {item?.service_name ?? (ar ? "التزام محذوف" : "Deleted commitment")}
                      </strong>
                      <span className="mt-1 block text-xs font-medium text-slate-500">
                        {item ? dict.commitmentTypes[item.commitment_type] : "—"}
                      </span>
                    </span>
                  </Link>
                  <div>
                    <strong className="text-[15px] text-slate-950">
                      {formatMoney(Number(payment.amount), payment.currency)}
                    </strong>
                    <span className="mt-1 block text-xs text-slate-400">{payment.currency}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CalendarDays size={15} className="text-slate-400" />
                    {displayDate}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      aria-label={ar ? "تعديل" : "Edit"}
                      onClick={() => setEditing(payment.id)}
                      className="rounded-xl p-2.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      aria-label={ar ? "حذف" : "Delete"}
                      onClick={async () => {
                        if (confirm(ar ? "حذف هذه الدفعة؟" : "Delete this payment?")) {
                          const result = await deleteCommitmentPayment(payment.id, payment.subscription_id);
                          setMessage(result.message);
                        }
                      }}
                      className="rounded-xl p-2.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                    <Link
                      href={`/payments/${payment.id}`}
                      aria-label={ar ? "فتح" : "Open"}
                      className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <ChevronRight className={ar ? "rotate-180" : ""} size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}

            {!rows.length && (
              <div className="grid min-h-72 place-items-center px-6 text-center">
                <div>
                  <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                    <ReceiptText size={27} />
                  </span>
                  <h2 className="mt-4 text-base font-extrabold text-slate-900">
                    {ar ? "لا توجد دفعات مطابقة" : "No matching payments"}
                  </h2>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    {ar
                      ? "جرّب تغيير البحث أو الفلاتر لعرض دفعات أخرى."
                      : "Try changing your search or filters to see more payments."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {!!rows.length && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-sm sm:px-6">
            <p className="font-medium text-slate-500">
              <strong className="text-slate-950">{rows.length}</strong> {ar ? "دفعة معروضة" : "payments shown"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {pageCount > 1 && <div className="me-2 flex items-center gap-1"><button type="button" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-40">{ar ? "السابق" : "Previous"}</button><span className="px-2 text-xs font-bold text-slate-500">{safePage} / {pageCount}</span><button type="button" disabled={safePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-40">{ar ? "التالي" : "Next"}</button></div>}
              {currencies.map((currency) => (
                <span key={currency} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                  {formatMoney(
                    rows
                      .filter((row) => row.currency === currency)
                      .reduce((sum, row) => sum + Number(row.amount), 0),
                    currency,
                  )}
                </span>
              ))}
            </div>
          </footer>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  note,
  primary = false,
}: {
  icon: typeof ReceiptText;
  label: string;
  value: string;
  note: string;
  primary?: boolean;
}) {
  return (
    <article
      className={`min-h-36 p-5 ${
        primary
          ? "border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_100%)] text-slate-950"
          : "border-slate-200/80 bg-white text-slate-950"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className={`text-sm font-bold ${primary ? "text-blue-700" : "text-slate-500"}`}>{label}</p>
        <span className={`grid size-10 place-items-center rounded-xl ${primary ? "bg-white text-blue-600 ring-1 ring-blue-100" : "bg-blue-50 text-blue-600"}`}>
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-4 truncate text-2xl font-black tracking-tight sm:text-3xl">{value}</p>
      <p className={`mt-1.5 text-xs font-medium ${primary ? "text-slate-500" : "text-slate-400"}`}>{note}</p>
    </article>
  );
}
