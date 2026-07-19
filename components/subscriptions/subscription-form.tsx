"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  Plus,
  Search,
} from "lucide-react";
import { createSubscription } from "@/features/subscriptions/actions/create-subscription";
import { FREE_SUBSCRIPTION_LIMIT } from "@/features/subscriptions/constants";
import { CalendarConfirmation } from "@/components/subscriptions/calendar-confirmation";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";

type Service = { name: string; category: string; color: string };
const services: Service[] = [
  { name: "Netflix", category: "Entertainment", color: "#e50914" },
  { name: "Spotify", category: "Music", color: "#1db954" },
  { name: "Adobe CC", category: "Creative", color: "#ef4444" },
  { name: "Figma", category: "Design", color: "#f97316" },
  { name: "Notion", category: "Productivity", color: "#111827" },
  { name: "GitHub", category: "Dev Tools", color: "#24292f" },
  { name: "iCloud", category: "Cloud", color: "#2563eb" },
  { name: "YouTube", category: "Entertainment", color: "#ef4444" },
  { name: "Microsoft 365", category: "Productivity", color: "#2563eb" },
];
const currencies = SUPPORTED_CURRENCIES;
const reminders = [1, 3, 7, 14] as const;
type Billing = "monthly" | "yearly" | "trial";
export function SubscriptionForm({
  subscriptionCount,
  isPro,
  defaultCurrency,
}: {
  subscriptionCount: number;
  isPro: boolean;
  defaultCurrency: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Service | null>(null);
  const [customName, setCustomName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [billing, setBilling] = useState<Billing>("monthly");
  const [renewalDate, setRenewalDate] = useState("");
  const [reminder, setReminder] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [calendarPrompt, setCalendarPrompt] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [error, setError] = useState("");
  const limitReached = !isPro && subscriptionCount >= FREE_SUBSCRIPTION_LIMIT;
  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()),
  );
  const serviceName = selected?.name ?? customName;
  const serviceColor = selected?.color ?? "#2563eb";
  function back() {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((value) => value - 1);
  }
  async function save() {
    setLoading(true);
    setError("");
    const data = new FormData();
    data.set("service_name", serviceName);
    data.set("amount", amount);
    data.set("currency", currency);
    data.set("renewal_date", renewalDate);
    data.set("billing_cycle", billing);
    data.set("status", billing === "trial" ? "trial" : "active");
    data.set("reminder_days_before", String(reminder));
    data.set("notes", "");
    const result = await createSubscription(data);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSavedId(result.id);
    setCalendarPrompt(true);
  }
  if (limitReached) return <Limit />;
  return (
    <div className="mx-auto max-w-lg pb-16">
      <header className="mb-8 flex items-center gap-3">
        <button
          onClick={back}
          aria-label="Go back"
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Add subscription</h1>
          <p className="mt-0.5 text-xs text-slate-500">Step {step + 1} of 4</p>
        </div>
      </header>
      <div className="mb-10 flex gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition ${index <= step ? "bg-blue-600" : "bg-slate-100"}`}
          />
        ))}
      </div>
      {step === 0 && (
        <ServiceStep
          search={search}
          setSearch={setSearch}
          filtered={filtered}
          selected={selected}
          setSelected={(value) => {
            setSelected(value);
            setCustomName("");
          }}
          customName={customName}
          setCustomName={(value) => {
            setCustomName(value);
            setSelected(null);
          }}
          onNext={() => setStep(1)}
        />
      )}{" "}
      {step === 1 && (
        <PriceStep
          serviceName={serviceName}
          serviceColor={serviceColor}
          category={selected?.category ?? "Custom"}
          amount={amount}
          setAmount={setAmount}
          currency={currency}
          setCurrency={setCurrency}
          billing={billing}
          setBilling={setBilling}
          renewalDate={renewalDate}
          setRenewalDate={setRenewalDate}
          onNext={() => setStep(2)}
        />
      )}{" "}
      {step === 2 && (
        <ReminderStep
          reminder={reminder}
          setReminder={setReminder}
          onNext={() => setStep(3)}
        />
      )}{" "}
      {step === 3 && (
        <Review
          serviceName={serviceName}
          serviceColor={serviceColor}
          category={selected?.category ?? "Custom"}
          amount={amount}
          currency={currency}
          billing={billing}
          renewalDate={renewalDate}
          reminder={reminder}
          loading={loading}
          error={error}
          onSave={save}
          onEdit={() => setStep(2)}
        />
      )}{" "}
      {calendarPrompt && (
        <CalendarConfirmation
          subscriptionId={savedId}
          serviceName={serviceName}
          amount={amount}
          currency={currency}
          renewalDate={renewalDate}
          billingCycle={billing}
          onDone={() => {
            router.push("/subscriptions");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
function ServiceStep({
  search,
  setSearch,
  filtered,
  selected,
  setSelected,
  customName,
  setCustomName,
  onNext,
}: {
  search: string;
  setSearch: (v: string) => void;
  filtered: Service[];
  selected: Service | null;
  setSelected: (v: Service) => void;
  customName: string;
  setCustomName: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <Title
        title="Which service?"
        text="Pick from popular services or enter a custom name."
      />
      <label className="relative mb-4 block">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search or type service name…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {filtered.slice(0, 9).map((service) => (
          <button
            key={service.name}
            onClick={() => setSelected(service)}
            className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3.5 ${selected?.name === service.name ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-200"}`}
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: service.color }}
            >
              {service.name[0]}
            </span>
            <span className="text-center text-xs font-semibold">
              {service.name}
            </span>
            {selected?.name === service.name && (
              <Check
                size={12}
                className="absolute right-2 top-2 text-blue-600"
              />
            )}
          </button>
        ))}
      </div>
      {search && (
        <button
          onClick={() => setCustomName(search.trim())}
          className={`mt-3 flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${customName === search.trim() ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 font-bold text-white">
            {search[0]?.toUpperCase()}
          </span>
          <span>
            <span className="block text-sm font-semibold">{search}</span>
            <span className="block text-xs text-slate-500">
              Use custom service
            </span>
          </span>
        </button>
      )}
      <Primary disabled={!selected && !customName} onClick={onNext}>
        Continue <ChevronRight size={16} />
      </Primary>
    </div>
  );
}
function PriceStep({
  serviceName,
  serviceColor,
  category,
  amount,
  setAmount,
  currency,
  setCurrency,
  billing,
  setBilling,
  renewalDate,
  setRenewalDate,
  onNext,
}: {
  serviceName: string;
  serviceColor: string;
  category: string;
  amount: string;
  setAmount: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  billing: Billing;
  setBilling: (v: Billing) => void;
  renewalDate: string;
  setRenewalDate: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div className="mb-7 flex items-center gap-3">
        <span
          className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-bold text-white"
          style={{ backgroundColor: serviceColor }}
        >
          {serviceName[0]}
        </span>
        <div>
          <h2 className="text-lg font-bold">{serviceName}</h2>
          <p className="text-xs text-slate-500">{category}</p>
        </div>
      </div>
      <div className="space-y-5">
        <Field label="Amount">
          <div className="flex gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium outline-none"
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </Field>
        <Field label="Billing cycle">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["monthly", "Monthly"],
                ["yearly", "Annual"],
                ["trial", "Trial"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setBilling(value)}
                className={`rounded-xl border py-3 text-xs font-semibold ${billing === value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-500"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Next renewal date">
          <input
            type="date"
            value={renewalDate}
            onChange={(e) => setRenewalDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </Field>
      </div>
      <Primary disabled={!amount || !renewalDate} onClick={onNext}>
        Continue <ChevronRight size={16} />
      </Primary>
    </div>
  );
}
function ReminderStep({
  reminder,
  setReminder,
  onNext,
}: {
  reminder: number;
  setReminder: (v: number) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <Title
        title="Set reminders"
        text="When should we notify you before the renewal?"
      />
      <div className="space-y-2">
        {reminders.map((days) => (
          <button
            key={days}
            onClick={() => setReminder(days)}
            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${reminder === days ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
          >
            <span className="text-sm font-medium">
              {days} day{days === 1 ? "" : "s"} before
            </span>
            <span
              className={`grid h-5 w-5 place-items-center rounded-full border-2 ${reminder === days ? "border-blue-600 bg-blue-600" : "border-slate-200"}`}
            >
              {reminder === days && <Check size={11} className="text-white" />}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        <strong className="text-slate-900">Reminder channel:</strong> In-app
        notification
      </div>
      <Primary onClick={onNext}>
        Continue <ChevronRight size={16} />
      </Primary>
    </div>
  );
}
function Review({
  serviceName,
  serviceColor,
  category,
  amount,
  currency,
  billing,
  renewalDate,
  reminder,
  loading,
  error,
  onSave,
  onEdit,
}: {
  serviceName: string;
  serviceColor: string;
  category: string;
  amount: string;
  currency: string;
  billing: Billing;
  renewalDate: string;
  reminder: number;
  loading: boolean;
  error: string;
  onSave: () => void;
  onEdit: () => void;
}) {
  return (
    <div>
      <Title title="Review & save" text="Confirm your subscription details." />
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-4 border-b border-slate-200 pb-5">
          <span
            className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold text-white"
            style={{ backgroundColor: serviceColor }}
          >
            {serviceName[0]}
          </span>
          <div>
            <h3 className="font-bold">{serviceName}</h3>
            <p className="text-sm text-slate-500">{category}</p>
          </div>
        </div>
        <div className="space-y-3.5">
          <Summary
            label="Amount"
            value={`${currency} ${amount} / ${billing === "yearly" ? "Annual" : billing === "trial" ? "Trial" : "Monthly"}`}
          />
          <Summary label="Next renewal" value={renewalDate} />
          <Summary
            label="Reminders"
            value={`${reminder} day${reminder === 1 ? "" : "s"} before`}
          />
        </div>
      </section>
      {error && (
        <p
          role="alert"
          className="mb-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle size={16} />
          {error}
        </p>
      )}
      <button
        disabled={loading}
        onClick={onSave}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-200 disabled:opacity-60"
      >
        <Check size={16} />
        {loading ? "Saving…" : "Save subscription"}
      </button>
      <button
        onClick={onEdit}
        className="mt-2 w-full py-3 text-sm font-semibold text-slate-500"
      >
        Edit details
      </button>
    </div>
  );
}
function Title({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
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
    <label className="block text-sm font-semibold">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}
function Primary({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}
function Limit() {
  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-blue-100 bg-blue-50/50 p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-blue-600">
        <CreditCard size={24} />
      </span>
      <h2 className="mt-5 text-xl font-bold">Free plan limit reached</h2>
      <p className="mt-2 text-sm text-slate-500">
        The free plan supports up to {FREE_SUBSCRIPTION_LIMIT} subscriptions.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/subscriptions"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
        >
          Manage
        </Link>
        <Link
          href="/upgrade"
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
        >
          Upgrade
        </Link>
      </div>
    </section>
  );
}
