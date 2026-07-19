"use client";
import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  ImageUp,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createSubscription } from "@/features/subscriptions/actions/create-subscription";
import {
  DetectionMethod,
  DetectedSubscription,
} from "@/features/subscriptions/types/detected-subscription";
import { parseSubscriptionText } from "@/features/subscriptions/services/parse-subscription-text";
import { CalendarConfirmation } from "@/components/subscriptions/calendar-confirmation";

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

export function DetectionFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const initial =
    params.get("method") === "screenshot" ? "screenshot" : "email";
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
          throw new Error("Paste more of the receipt or renewal email.");
      } else {
        if (!file) throw new Error("Choose a screenshot first.");
        if (file.size > 5_500_000)
          throw new Error("The image must be smaller than 5 MB.");
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
          throw new Error("Choose a PNG, JPG, or WebP image.");
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
          throw new Error(
            "We could not read enough text from that screenshot. Try a clearer image.",
          );
      }
      setResult(parseSubscriptionText(sourceText));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Detection failed. Please try again.",
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
          result={result}
          update={update}
          reminder={reminder}
          setReminder={setReminder}
          saving={saving}
          error={error}
          save={save}
          edit={() => setResult(null)}
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
    <div className="mx-auto max-w-lg pb-16">
      <Header />
      <div className="mb-7">
        <h2 className="text-lg font-bold">Detect subscription details</h2>
        <p className="mt-1 text-sm text-slate-500">
          Mirqo reads the text locally using fixed rules, then asks you to
          review it.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Choice
          active={method === "email"}
          onClick={() => {
            setMethod("email");
            setError("");
          }}
          icon={Mail}
          title="Paste email"
        />
        <Choice
          active={method === "screenshot"}
          onClick={() => {
            setMethod("screenshot");
            setError("");
          }}
          icon={ImageUp}
          title="Screenshot"
        />
      </div>
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {method === "email" ? (
          <>
            <label htmlFor="email-text" className="text-sm font-semibold">
              Receipt or renewal email
            </label>
            <textarea
              id="email-text"
              rows={10}
              maxLength={30000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the email text here..."
              className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </>
        ) : (
          <Upload file={file} onChange={setFile} />
        )}{" "}
        {error && <ErrorMessage text={error} />}
        <button
          onClick={detect}
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-200 disabled:opacity-60 dark:shadow-none"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}{" "}
          {loading
            ? method === "screenshot" && ocrProgress > 0
              ? "Reading image " + ocrProgress + "%"
              : "Analyzing..."
            : "Detect details"}
        </button>
      </section>
      <p className="mt-4 text-center text-xs text-slate-500">
        <FileText size={13} className="mr-1 inline" />
        Prefer manual entry?{" "}
        <Link
          href="/subscriptions/new?method=manual"
          className="font-semibold text-blue-600"
        >
          Add manually
        </Link>
      </p>
    </div>
  );
}
function Header() {
  return (
    <header className="mb-9 flex items-center gap-3">
      <Link
        href="/subscriptions/new"
        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ArrowLeft size={17} />
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight">Add subscription</h1>
        <p className="mt-0.5 text-xs text-slate-500">Automatic detection</p>
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
        "flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold " +
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
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  function change(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.files?.[0] ?? null);
  }
  return (
    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center hover:border-blue-400 dark:border-slate-700">
      <ImageUp className="mx-auto text-blue-600" />
      <span className="mt-4 block text-sm font-semibold">
        {file?.name ?? "Upload a subscription screenshot"}
      </span>
      <span className="mt-1 block text-xs text-slate-500">
        PNG, JPG, or WebP - maximum 5 MB
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
  result,
  update,
  reminder,
  setReminder,
  saving,
  error,
  save,
  edit,
}: {
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
}) {
  return (
    <div className="mx-auto max-w-lg pb-16">
      <Header />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Review detected details</h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950">
            {Math.round(result.confidence * 100)}% confidence
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Correct anything that looks wrong before saving.
        </p>
      </div>
      {result.warnings.length > 0 && (
        <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {result.warnings.map((w) => (
            <p key={w}>- {w}</p>
          ))}
        </div>
      )}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <Field label="Service name">
          <input
            value={result.service_name}
            onChange={(e) => update("service_name", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Amount">
            <input
              type="number"
              min="0"
              step="0.01"
              value={result.amount}
              onChange={(e) => update("amount", Number(e.target.value))}
            />
          </Field>
          <Field label="Currency">
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Billing cycle">
            <select
              value={result.billing_cycle}
              onChange={(e) =>
                update(
                  "billing_cycle",
                  e.target.value as DetectedSubscription["billing_cycle"],
                )
              }
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Annual</option>
              <option value="trial">Trial</option>
            </select>
          </Field>
          <Field label="Next renewal">
            <input
              type="date"
              value={result.renewal_date}
              onChange={(e) => update("renewal_date", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Reminder">
          <select
            value={reminder}
            onChange={(e) => setReminder(Number(e.target.value))}
          >
            {[1, 3, 7, 14].map((d) => (
              <option key={d} value={d}>
                {d} day{d === 1 ? "" : "s"} before
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
        {saving ? "Saving..." : "Confirm and save"}
      </button>
      <button
        onClick={edit}
        className="mt-2 w-full py-3 text-sm font-semibold text-slate-500"
      >
        Use different input
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
