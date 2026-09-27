"use client";
import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  FileText,
  ImageUp,
  Loader2,
  Mail,
  ScanText,
} from "lucide-react";
import { createSubscription } from "@/features/subscriptions/actions/create-subscription";
import {
  DetectionMethod,
  DetectedSubscription,
} from "@/features/subscriptions/types/detected-subscription";
import { parseSubscriptionText } from "@/features/subscriptions/services/parse-subscription-text";
import { suggestCommitmentType } from "@/lib/commitment-type";
import { CalendarConfirmation } from "@/components/subscriptions/calendar-confirmation";
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
type T = Dictionary["detection"];

export function DetectionFlow({
  initialMethod,
  embedded = false,
}: {
  initialMethod?: DetectionMethod;
  embedded?: boolean;
} = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const { dict } = useLocale();
  const t = dict.detection;
  const initial =
    initialMethod ??
    (params.get("method") === "screenshot" ? "screenshot" : "email");
  const [method, setMethod] = useState<DetectionMethod>(initial);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DetectedSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [calendarPrompt, setCalendarPrompt] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [error, setError] = useState("");
  const [reminder, setReminder] = useState(7);
  async function detect() {
    setError("");
    setLoading(true);
    try {
      let sourceText = text;
      if (method === "email") {
        if (text.trim().length < 20)
          throw new Error(t.pasteMoreError);
      } else {
        if (!file) throw new Error(t.chooseScreenshotError);
        if (file.size > 5_500_000)
          throw new Error(t.imageTooLargeError);
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
          throw new Error(t.imageTypeError);
        const { createWorker } = await import("tesseract.js");
        setOcrProgress(0);
        const worker = await createWorker("eng", 1, {
          logger: (message) => {
            if (message.status === "recognizing text")
              setOcrProgress(Math.round(message.progress * 100));
          },
        });
        try {
          const recognition = await worker.recognize(file);
          sourceText = recognition.data.text;
        } finally {
          await worker.terminate();
        }
        if (sourceText.trim().length < 10)
          throw new Error(t.notEnoughTextError);
      }
      setResult(parseSubscriptionText(sourceText));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t.detectionFailedError,
      );
    } finally {
      setLoading(false);
    }
  }
  function update<K extends keyof DetectedSubscription>(
    key: K,
    value: DetectedSubscription[K],
  ) {
    setResult((current) => (current ? { ...current, [key]: value } : current));
  }
  async function save() {
    if (!result) return;
    setSaving(true);
    setError("");
    const data = new FormData();
    data.set("service_name", result.service_name);
    data.set("amount", String(result.amount));
    data.set("currency", result.currency);
    data.set("renewal_date", result.renewal_date);
    data.set("billing_cycle", result.billing_cycle);
    data.set("status", result.billing_cycle === "trial" ? "trial" : "active");
    data.set("reminder_days_before", String(reminder));
    data.set("notes", "");
    data.set("source_type", method === "email" ? "text" : "screenshot");
    data.set("commitment_type", suggestCommitmentType(result.service_name));
    const saved = await createSubscription(data);
    setSaving(false);
    if (!saved.success) {
      setError(saved.message);
      return;
    }
    setSavedId(saved.id);
    setCalendarPrompt(true);
  }
  if (result)
    return (
      <>
        <Review
          t={t}
          common={dict.common}
          result={result}
          update={update}
          reminder={reminder}
          setReminder={setReminder}
          saving={saving}
          error={error}
          save={save}
          edit={() => setResult(null)}
          showHeader={!embedded}
        />
        {calendarPrompt && (
          <CalendarConfirmation
            subscriptionId={savedId}
            serviceName={result.service_name}
            amount={String(result.amount)}
            currency={result.currency}
            renewalDate={result.renewal_date}
            billingCycle={result.billing_cycle}
            onDone={() => {
              router.push("/subscriptions");
              router.refresh();
            }}
          />
        )}
      </>
    );
  return (
    <div className={`pb-16 ${embedded ? "" : "mx-auto max-w-lg"}`}>
      {!embedded && <Header t={t} />}
      <div className="mb-7">
        <h2 className="text-xl font-bold tracking-tight">
          {method === "screenshot" ? t.scanTitle : t.pasteTitle}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {method === "screenshot" ? t.scanDesc : t.pasteDesc}
        </p>
      </div>
      {!embedded && <div className="grid grid-cols-2 gap-3">
        <Choice
          active={method === "email"}
          onClick={() => {
            setMethod("email");
            setError("");
          }}
          icon={Mail}
          title={t.pasteEmailChoice}
        />
        <Choice
          active={method === "screenshot"}
          onClick={() => {
            setMethod("screenshot");
            setError("");
          }}
          icon={ImageUp}
          title={t.screenshotChoice}
        />
      </div>}
      <section className="ui-feature-card p-5 sm:p-7">
        {method === "email" ? (
          <>
            <label htmlFor="email-text" className="text-sm font-semibold">
              {t.receiptLabel}
            </label>
            <textarea
              id="email-text"
              rows={10}
              maxLength={30000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.pastePlaceholder}
              className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </>
        ) : <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.9fr)]">
          <div>
            <Upload file={file} onChange={setFile} t={t} />
            <div className="mt-5 flex items-center justify-between text-xs" aria-live="polite">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {loading ? t.readingScreenshot : file ? t.readyToScan : t.chooseScreenshotToBegin}
              </span>
              {loading && <span className="font-bold text-blue-600">{ocrProgress}%</span>}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${loading ? Math.max(8, ocrProgress) : file ? 5 : 0}%` }}
              />
            </div>
          </div>
          <ExtractionProgress fileSelected={Boolean(file)} loading={loading} progress={ocrProgress} t={t} />
        </div>}{" "}
        {error && <ErrorMessage text={error} />}
        <button
          onClick={detect}
          disabled={loading || (method === "screenshot" ? !file : text.trim().length < 20)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-none"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ScanText size={16} />
          )}{" "}
          {loading
            ? method === "screenshot" && ocrProgress > 0
              ? format(t.readingScreenshotPercent, { percent: ocrProgress })
              : t.reading
            : method === "screenshot" ? t.scanScreenshot : t.extractDetails}
        </button>
      </section>
      {!embedded && <p className="mt-4 text-center text-xs text-slate-500">
        <FileText size={13} className="me-1 inline" />
        {t.preferManual}{" "}
        <Link
          href="/subscriptions/new?method=manual"
          className="font-semibold text-blue-600"
        >
          {t.addManually}
        </Link>
      </p>}
    </div>
  );
}

function ExtractionProgress({
  fileSelected,
  loading,
  progress,
  t,
}: {
  fileSelected: boolean;
  loading: boolean;
  progress: number;
  t: T;
}) {
  const steps = [
    { label: t.stepScreenshotSelected, state: fileSelected ? "complete" : "waiting" },
    {
      label: t.stepReadingText,
      state: loading ? (progress >= 90 ? "complete" : "active") : "waiting",
    },
    {
      label: t.stepFindingDetails,
      state: loading && progress >= 90 ? "active" : "waiting",
    },
    { label: t.stepPreparing, state: "waiting" },
  ] as const;
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        {t.extractionProgress}
      </p>
      <div className="space-y-2.5">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
              step.state === "active"
                ? "border-blue-200 bg-blue-50 font-semibold text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100"
                : step.state === "complete"
                  ? "border-emerald-100 bg-emerald-50 text-slate-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-slate-200"
                  : "border-transparent text-slate-400"
            }`}
          >
            {step.state === "complete" ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            ) : step.state === "active" ? (
              <Loader2 size={18} className="shrink-0 animate-spin text-blue-600" />
            ) : (
              <Circle size={18} className="shrink-0 text-slate-300" />
            )}
            {step.label}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        {t.noAiNote}
      </p>
    </div>
  );
}
function Header({ t }: { t: T }) {
  return (
    <header className="mb-9 flex items-center gap-3">
      <Link
        href="/subscriptions/new"
        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ArrowLeft size={17} className="rtl:rotate-180" />
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t.addSubscription}</h1>
        <p className="mt-0.5 text-xs text-slate-500">{t.automaticDetection}</p>
      </div>
    </header>
  );
}
function Choice({
  active,
  onClick,
  icon: Icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Mail;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-3 rounded-2xl border p-4 text-start text-sm font-semibold " +
        (active
          ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950"
          : "border-slate-200 dark:border-slate-700")
      }
    >
      <Icon size={18} />
      {title}
    </button>
  );
}
function Upload({
  file,
  onChange,
  t,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  t: T;
}) {
  function change(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.files?.[0] ?? null);
  }
  return (
    <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-950">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950">
        <ImageUp size={26} />
      </span>
      <span className="mt-4 block text-sm font-semibold">
        {file?.name ?? t.clickToUpload}
      </span>
      <span className="mt-1 block text-xs text-slate-500">
        {t.uploadHint}
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={change}
        className="sr-only"
      />
    </label>
  );
}
function Review({
  t,
  common,
  result,
  update,
  reminder,
  setReminder,
  saving,
  error,
  save,
  edit,
  showHeader,
}: {
  t: T;
  common: Dictionary["common"];
  result: DetectedSubscription;
  update: <K extends keyof DetectedSubscription>(
    key: K,
    value: DetectedSubscription[K],
  ) => void;
  reminder: number;
  setReminder: (v: number) => void;
  saving: boolean;
  error: string;
  save: () => void;
  edit: () => void;
  showHeader: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl pb-16">
      {showHeader && <Header t={t} />}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t.reviewTitle}</h2>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {t.readyToReview}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {t.reviewDesc}
        </p>
      </div>
      {result.warnings.length > 0 && (
        <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {result.warnings.map((w) => (
            <p key={w}>- {w}</p>
          ))}
        </div>
      )}
      <section className="ui-card space-y-4 p-5 sm:p-6">
        <Field label={t.serviceName}>
          <input
            value={result.service_name}
            onChange={(e) => update("service_name", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px]">
          <Field label={t.amount}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={result.amount}
              onChange={(e) => update("amount", Number(e.target.value))}
            />
          </Field>
          <Field label={t.currency}>
            <select
              value={result.currency}
              onChange={(e) => update("currency", e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t.billingCycle}>
            <select
              value={result.billing_cycle}
              onChange={(e) =>
                update(
                  "billing_cycle",
                  e.target.value as DetectedSubscription["billing_cycle"],
                )
              }
            >
              <option value="monthly">{common.monthly}</option>
              <option value="yearly">{common.yearly}</option>
              <option value="trial">{common.trial}</option>
            </select>
          </Field>
          <Field label={t.nextRenewal}>
            <input
              type="date"
              value={result.renewal_date}
              onChange={(e) => update("renewal_date", e.target.value)}
            />
          </Field>
        </div>
        <Field label={t.reminder}>
          <select
            value={reminder}
            onChange={(e) => setReminder(Number(e.target.value))}
          >
            {[1, 3, 7, 14].map((d) => (
              <option key={d} value={d}>
                {d === 1 ? format(t.dayBefore, { n: d }) : format(t.daysBefore, { n: d })}
              </option>
            ))}
          </select>
        </Field>
      </section>
      {error && <ErrorMessage text={error} />}
      <button
        onClick={save}
        disabled={saving}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Check size={16} />
        )}{" "}
        {saving ? t.saving : t.confirmSave}
      </button>
      <button
        onClick={edit}
        className="mt-2 w-full py-3 text-sm font-semibold text-slate-500"
      >
        {t.useDifferentInput}
      </button>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
      <div className="mt-1.5 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:bg-slate-50 [&_input]:px-3 [&_input]:py-3 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-slate-50 [&_select]:px-3 [&_select]:py-3 [&_select]:text-sm dark:[&_input]:border-slate-700 dark:[&_input]:bg-slate-950 dark:[&_select]:border-slate-700 dark:[&_select]:bg-slate-950">
        {children}
      </div>
    </label>
  );
}
function ErrorMessage({ text }: { text: string }) {
  return (
    <p
      role="alert"
      className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
    >
      <AlertCircle size={16} className="shrink-0" />
      {text}
    </p>
  );
}
