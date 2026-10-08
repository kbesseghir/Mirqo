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
  Search,
} from "lucide-react";
import { createSubscription } from "@/features/subscriptions/actions/create-subscription";
import { FREE_SUBSCRIPTION_LIMIT } from "@/features/subscriptions/constants";
import { CalendarConfirmation } from "@/components/subscriptions/calendar-confirmation";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import { useLocale } from "@/components/locale-provider";
import { format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { HouseholdMember } from "@/types/database";
import { COMMITMENT_TYPES } from "@/features/subscriptions/constants";
import { COMMITMENT_TYPE_ICONS, COMMITMENT_TYPE_PRESET_ICONS } from "@/lib/commitment-type";
import { nextRenewalFromPaymentDate } from "@/lib/subscriptions";

type Service = { name: string; category: keyof Dictionary["serviceCategories"] };
type CommitmentType = (typeof COMMITMENT_TYPES)[number];
const services: Service[] = [
  { name: "Netflix", category: "entertainment" },
  { name: "Spotify", category: "music" },
  { name: "Shahid VIP", category: "entertainment" },
  { name: "Anghami", category: "music" },
  { name: "Adobe CC", category: "design" },
  { name: "Figma", category: "design" },
  { name: "Notion", category: "productivity" },
  { name: "GitHub", category: "devTools" },
  { name: "iCloud", category: "cloud" },
  { name: "YouTube Premium", category: "entertainment" },
  { name: "Microsoft 365", category: "productivity" },
  { name: "Ooredoo", category: "telecom" },
];
const PRESET_ACCENT_COLORS = ["#6D3FF2", "#15CFE0", "#8B5CF6", "#F59E0B", "#EF4444"];
const currencies = SUPPORTED_CURRENCIES;
const reminders = [1, 3, 7, 14] as const;
type Billing = "monthly" | "yearly" | "trial";

function reminderLabel(days: number, t: Dictionary["subscriptionForm"]) {
  if (days === 1) return format(t.reminderOne, { n: days });
  if (days <= 10) return format(t.reminderFew, { n: days });
  return format(t.reminderMany, { n: days });
}

export function SubscriptionForm({
  subscriptionCount,
  isPro,
  defaultCurrency,
  householdMembers = [],
  embedded = false,
}: {
  subscriptionCount: number;
  isPro: boolean;
  defaultCurrency: string;
  householdMembers?: HouseholdMember[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const { dict, locale } = useLocale();
  const t = dict.subscriptionForm;
  const categories = dict.serviceCategories;
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Service | null>(null);
  const [customName, setCustomName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [billing, setBilling] = useState<Billing>("monthly");
  const [billingIntervalMonths, setBillingIntervalMonths] = useState(1);
  const [renewalDate, setRenewalDate] = useState("");
  const [reminder, setReminder] = useState<number>(7);
  const [commitmentType, setCommitmentType] = useState<CommitmentType>("subscription");
  const [householdMemberIds, setHouseholdMemberIds] = useState<string[]>([]);
  const [counterpartyName, setCounterpartyName] = useState<string>("");
  const [amountIsVariable, setAmountIsVariable] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("");
  const [installmentsPaid, setInstallmentsPaid] = useState("0");
  const [debtDirection, setDebtDirection] = useState<"i_owe" | "owed_to_me">("i_owe");
  const [originalAmount, setOriginalAmount] = useState("");
  function changeCommitmentType(value: CommitmentType) {
    setCommitmentType(value);
    setSelected(null);
    setCustomName("");
  }
  const [loading, setLoading] = useState(false);
  const [calendarPrompt, setCalendarPrompt] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [error, setError] = useState("");
  const limitReached = !isPro && subscriptionCount >= FREE_SUBSCRIPTION_LIMIT;
  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      categories[s.category].toLowerCase().includes(search.toLowerCase()),
  );
  const serviceName = selected?.name ?? customName;
  const selectedCategory = selected ? categories[selected.category] : t.custom;
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
    data.set("renewal_date", nextRenewalFromPaymentDate(renewalDate, billing, billingIntervalMonths));
    data.set("billing_cycle", billing);
    data.set("billing_interval_months", String(billing === "yearly" ? 12 : billing === "trial" ? 1 : billingIntervalMonths));
    data.set("status", billing === "trial" ? "trial" : "active");
    data.set("reminder_days_before", String(reminder));
    data.set("notes", "");
    data.set("commitment_type", commitmentType);
    data.set("amount_is_variable", String(commitmentType === "bill" && amountIsVariable));
    if (commitmentType === "bnpl") {
      data.set("installment_count", installmentCount);
      data.set("installments_paid", installmentsPaid || "0");
    }
    if (commitmentType === "debt") {
      data.set("debt_direction", debtDirection);
      data.set("original_amount", originalAmount);
      data.set("remaining_balance", originalAmount);
    }
    householdMemberIds.forEach((id) => data.append("household_member_ids", id));
    if (counterpartyName) data.set("counterparty_name", counterpartyName);
    try {
      const result = await createSubscription(data);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setSavedId(result.id);
      setCalendarPrompt(true);
    } catch {
      setError(t.saveFailed);
    } finally {
      setLoading(false);
    }
  }
  if (limitReached) return <Limit />;
  return (
    <div className="mx-auto max-w-xl pb-16">
      {!embedded && <header className="mb-8 flex items-center gap-3">
        <button
          onClick={back}
          aria-label={t.goBack}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft size={17} className="rtl:rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t.addSubscription}</h1>
          <p className="mt-0.5 text-xs text-slate-500">{format(t.stepOf, { step: step + 1 })}</p>
        </div>
      </header>}
      <div
        className="mb-10 flex gap-1.5"
        role="progressbar"
        aria-label={t.progressAria}
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={step + 1}
      >
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition ${index <= step ? "bg-blue-600" : "bg-slate-100"}`}
          />
        ))}
      </div>
      {embedded && step > 0 && <div className="mb-7 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white">{(() => { const Icon = COMMITMENT_TYPE_ICONS[commitmentType]; return <Icon size={18}/>; })()}</span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-blue-500">{dict.commitmentTypes[commitmentType]}</p><h2 className="mt-0.5 text-base font-bold">{locale === "ar" ? `إضافة ${dict.commitmentTypes[commitmentType]}` : `Add ${dict.commitmentTypes[commitmentType].toLowerCase()}`}</h2></div></div>}
      {step === 0 && (
        <ServiceStep
          t={t}
          common={dict.common}
          commitmentTypes={dict.commitmentTypes}
          commitmentTypeHints={dict.commitmentTypeHints}
          commitmentTypePresets={dict.commitmentTypePresets}
          commitmentType={commitmentType}
          setCommitmentType={changeCommitmentType}
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
          counterpartyName={counterpartyName}
          setCounterpartyName={setCounterpartyName}
          onNext={() => setStep(1)}
        />
      )}{" "}
      {step === 1 && (
        <PriceStep
          t={t}
          common={dict.common}
          household={dict.household}
          householdMembers={householdMembers}
          serviceName={serviceName}
          category={selectedCategory}
          amount={amount}
          setAmount={setAmount}
          currency={currency}
          setCurrency={setCurrency}
          billing={billing}
          billingIntervalMonths={billingIntervalMonths}
          commitmentType={commitmentType}
          locale={locale}
          setBilling={setBilling}
          setBillingIntervalMonths={setBillingIntervalMonths}
          renewalDate={renewalDate}
          setRenewalDate={setRenewalDate}
          amountIsVariable={amountIsVariable}
          setAmountIsVariable={setAmountIsVariable}
          installmentCount={installmentCount}
          setInstallmentCount={setInstallmentCount}
           installmentsPaid={installmentsPaid}
           setInstallmentsPaid={setInstallmentsPaid}
           debtDirection={debtDirection}
           setDebtDirection={setDebtDirection}
           originalAmount={originalAmount}
           setOriginalAmount={setOriginalAmount}
          householdMemberIds={householdMemberIds}
          setHouseholdMemberIds={setHouseholdMemberIds}
          onNext={() => setStep(2)}
        />
      )}{" "}
      {step === 2 && (
        <ReminderStep
          t={t}
          common={dict.common}
          reminder={reminder}
          setReminder={setReminder}
          onNext={() => setStep(3)}
        />
      )}{" "}
      {step === 3 && (
        <Review
          t={t}
          common={dict.common}
          commitmentTypes={dict.commitmentTypes}
          splitWithLabel={dict.household.splitWith}
          eachLabel={dict.household.each}
          serviceName={serviceName}
          category={selectedCategory}
          amount={amount}
          currency={currency}
          billing={billing}
          billingIntervalMonths={billingIntervalMonths}
           renewalDate={nextRenewalFromPaymentDate(renewalDate, billing, billingIntervalMonths)}
          reminder={reminder}
          commitmentType={commitmentType}
          locale={locale}
          amountIsVariable={amountIsVariable}
          installmentCount={installmentCount}
          installmentsPaid={installmentsPaid}
          splitNames={householdMembers.filter((m) => householdMemberIds.includes(m.id)).map((m) => m.name)}
          counterpartyName={counterpartyName}
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
          renewalDate={nextRenewalFromPaymentDate(renewalDate, billing, billingIntervalMonths)}
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
  t,
  common,
  commitmentTypes,
  commitmentTypeHints,
  commitmentTypePresets,
  commitmentType,
  setCommitmentType,
  search,
  setSearch,
  filtered,
  selected,
  setSelected,
  customName,
  setCustomName,
  counterpartyName,
  setCounterpartyName,
  onNext,
}: {
  t: Dictionary["subscriptionForm"];
  common: Dictionary["common"];
  commitmentTypes: Dictionary["commitmentTypes"];
  commitmentTypeHints: Dictionary["commitmentTypeHints"];
  commitmentTypePresets: Dictionary["commitmentTypePresets"];
  commitmentType: CommitmentType;
  setCommitmentType: (v: CommitmentType) => void;
  search: string;
  setSearch: (v: string) => void;
  filtered: Service[];
  selected: Service | null;
  setSelected: (v: Service) => void;
  customName: string;
  setCustomName: (v: string) => void;
  counterpartyName: string;
  setCounterpartyName: (v: string) => void;
  onNext: () => void;
}) {
  const isSubscription = commitmentType === "subscription";
  const hasName = isSubscription ? Boolean(selected || customName) : Boolean(customName.trim());
  return (
    <div>
      <Title
        title={t.whichType}
        text={t.pickType}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {COMMITMENT_TYPES.map((value) => {
          const Icon = COMMITMENT_TYPE_ICONS[value];
          const active = commitmentType === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setCommitmentType(value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[11px] font-semibold ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-500 hover:border-blue-200"}`}
            >
              <Icon size={17} />
              {commitmentTypes[value]}
            </button>
          );
        })}
      </div>
      <p className="mb-6 mt-2 text-[11px] leading-4 text-slate-400">{commitmentTypeHints[commitmentType]}</p>

      {isSubscription ? (
        <>
          <label className="relative mb-4 block">
            <Search
              size={15}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pe-10 ps-4 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {filtered.slice(0, 9).map((service) => (
              <button
                key={service.name}
                onClick={() => setSelected(service)}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3.5 ${selected?.name === service.name ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-200"}`}
              >
                <ServiceLogo name={service.name} className="h-10 w-10 rounded-xl" />
                <span className="text-center text-xs font-semibold">
                  {service.name}
                </span>
                {selected?.name === service.name && (
                  <Check
                    size={12}
                    className="absolute start-2 top-2 text-blue-600"
                  />
                )}
              </button>
            ))}
          </div>
          {search && (
            <button
              onClick={() => setCustomName(search.trim())}
              className={`mt-3 flex w-full items-center gap-3 rounded-2xl border p-4 text-start ${customName === search.trim() ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
            >
              <ServiceLogo name={search} className="h-10 w-10 rounded-xl" />
              <span>
                <span className="block text-sm font-semibold">{search}</span>
                <span className="block text-xs text-slate-500">
                  {t.useCustomService}
                </span>
              </span>
            </button>
          )}
        </>
      ) : (
        <>
          {commitmentTypePresets[commitmentType].length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {commitmentTypePresets[commitmentType].map((preset, index) => {
                const PresetIcon = COMMITMENT_TYPE_PRESET_ICONS[commitmentType][index];
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomName(preset)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-3.5 ${customName === preset ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-200"}`}
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                      style={{ backgroundColor: PRESET_ACCENT_COLORS[index % PRESET_ACCENT_COLORS.length] }}
                    >
                      {PresetIcon && <PresetIcon size={17} />}
                    </span>
                    <span className="text-center text-xs font-semibold">{preset}</span>
                  </button>
                );
              })}
            </div>
          )}
          <label className="relative mb-4 block">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t.namePlaceholder}
              maxLength={100}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
        </>
      )}

      {commitmentType === "debt" && (
        <Field label={t.counterpartyName}>
          <input
            value={counterpartyName}
            onChange={(e) => setCounterpartyName(e.target.value)}
            placeholder={t.counterpartyPlaceholder}
            maxLength={100}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </Field>
      )}

      <Primary disabled={!hasName} onClick={onNext}>
        {common.continue} <ChevronRight size={16} className="rtl:rotate-180" />
      </Primary>
    </div>
  );
}
function PriceStep({
  t,
  common,
  household,
  householdMembers,
  serviceName,
  category,
  amount,
  setAmount,
  currency,
  setCurrency,
  billing,
  billingIntervalMonths,
  commitmentType,
  locale,
  setBilling,
  setBillingIntervalMonths,
  renewalDate,
  setRenewalDate,
  amountIsVariable,
  setAmountIsVariable,
  installmentCount,
  setInstallmentCount,
  installmentsPaid,
  setInstallmentsPaid,
  debtDirection,
  setDebtDirection,
  originalAmount,
  setOriginalAmount,
  householdMemberIds,
  setHouseholdMemberIds,
  onNext,
}: {
  t: Dictionary["subscriptionForm"];
  common: Dictionary["common"];
  household: Dictionary["household"];
  householdMembers: HouseholdMember[];
  serviceName: string;
  category: string;
  amount: string;
  setAmount: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  billing: Billing;
  billingIntervalMonths: number;
  commitmentType: CommitmentType;
  locale: "en" | "ar";
  setBilling: (v: Billing) => void;
  setBillingIntervalMonths: (v: number) => void;
  renewalDate: string;
  setRenewalDate: (v: string) => void;
  amountIsVariable: boolean;
  setAmountIsVariable: (v: boolean) => void;
  installmentCount: string;
  setInstallmentCount: (v: string) => void;
  installmentsPaid: string;
  setInstallmentsPaid: (v: string) => void;
  debtDirection: "i_owe" | "owed_to_me";
  setDebtDirection: (v: "i_owe" | "owed_to_me") => void;
  originalAmount: string;
  setOriginalAmount: (v: string) => void;
  householdMemberIds: string[];
  setHouseholdMemberIds: (v: string[]) => void;
  onNext: () => void;
}) {
  const isBill = commitmentType === "bill";
  const isInstallment = commitmentType === "bnpl";
  const isDebt = commitmentType === "debt";
  const remainingInstallments = Math.max(0, Number(installmentCount || 0) - Number(installmentsPaid || 0));
  const copy = locale === "ar" ? {
    paymentAmount: isInstallment ? "قيمة القسط" : isBill ? "قيمة الفاتورة" : t.amount,
    fixed: "مبلغ ثابت", variable: "مبلغ متغير", amountBehavior: "نوع المبلغ",
    installmentPlan: "خطة التقسيط", total: "إجمالي الأقساط", paid: "الأقساط المدفوعة", remaining: "متبقية",
    dueDate: "تاريخ الاستحقاق الأخير", nextDueHint: "سنحسب موعد الاستحقاق القادم في اليوم نفسه.", custom: "مخصص", every: "كل", months: "أشهر",
  } : {
    paymentAmount: isInstallment ? "Installment amount" : isBill ? "Bill amount" : t.amount,
    fixed: "Fixed amount", variable: "Variable amount", amountBehavior: "Amount behavior",
    installmentPlan: "Installment plan", total: "Total installments", paid: "Already paid", remaining: "remaining",
    dueDate: "Last due date", nextDueHint: "We’ll calculate the next due date on the same day.", custom: "Custom", every: "Every", months: "months",
  };
  const perPersonAmount = householdMemberIds.length > 0 && amount ? Number(amount) / householdMemberIds.length : 0;
  function toggleMember(id: string) {
    setHouseholdMemberIds(
      householdMemberIds.includes(id) ? householdMemberIds.filter((value) => value !== id) : [...householdMemberIds, id],
    );
  }
  return (
    <div>
      <div className="mb-7 flex items-center gap-3">
        <ServiceLogo name={serviceName} className="h-12 w-12 rounded-2xl" />
        <div>
          <h2 className="text-lg font-bold">{serviceName}</h2>
          <p className="text-xs text-slate-500">{category}</p>
        </div>
      </div>
      <div className="space-y-5">
        <Field label={copy.paymentAmount}>
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
        {isBill && <Field label={copy.amountBehavior}>
          <div className="grid grid-cols-2 gap-2">
            {([[false, copy.fixed], [true, copy.variable]] as const).map(([value, label]) => <button key={label} type="button" onClick={() => setAmountIsVariable(value)} className={`rounded-xl border px-3 py-3 text-xs font-semibold transition ${amountIsVariable === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}
          </div>
        </Field>}
        {isInstallment && <Field label={copy.installmentPlan}>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-slate-500">{copy.total}<input type="number" min="1" max="600" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500" /></label>
            <label className="text-xs font-medium text-slate-500">{copy.paid}<input type="number" min="0" max={installmentCount || "600"} value={installmentsPaid} onChange={(e) => setInstallmentsPaid(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500" /></label>
          </div>
          {installmentCount && <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3 text-xs text-violet-700"><span>{copy.installmentPlan}</span><strong>{remainingInstallments} {copy.remaining}</strong></div>}
        </Field>}
        {isDebt && <Field label={locale === "ar" ? "تفاصيل الدين" : "Debt details"}>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setDebtDirection("i_owe")} className={`rounded-xl border px-3 py-3 text-xs font-bold ${debtDirection === "i_owe" ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-500"}`}>{locale === "ar" ? "أنا مدين" : "I owe"}</button>
            <button type="button" onClick={() => setDebtDirection("owed_to_me")} className={`rounded-xl border px-3 py-3 text-xs font-bold ${debtDirection === "owed_to_me" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>{locale === "ar" ? "شخص مدين لي" : "Owed to me"}</button>
          </div>
          <label className="mt-3 block text-xs font-medium text-slate-500">{locale === "ar" ? "إجمالي الدين الأصلي" : "Original debt total"}<input type="number" min="0.01" step="0.01" value={originalAmount} onChange={(event) => setOriginalAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500" /></label>
          <p className="mt-2 text-[11px] text-slate-400">{locale === "ar" ? "المبلغ أعلاه هو قيمة الدفعة المقترحة، ويمكن تغييره عند كل دفعة." : "The payment amount above is only a suggested payment and can change each time."}</p>
        </Field>}
        <Field label={t.billingCycle}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {((isInstallment
              ? [["monthly", 1, common.monthly]]
              : isBill
                ? [["monthly", 1, common.monthly], ["yearly", 12, common.yearly]]
                : [["monthly", 1, common.monthly], ["yearly", 12, common.yearly], ["trial", 1, common.trial]]) as readonly (readonly [Billing, number, string])[]).map(([value, months, label]) => (
              <button
                key={`${value}-${months}`}
                type="button"
                onClick={() => { setBilling(value); setBillingIntervalMonths(months); }}
                className={`rounded-xl border px-2 py-3 text-xs font-semibold ${billing === value && billingIntervalMonths === months ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-500"}`}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => { setBilling("monthly"); if (billingIntervalMonths === 1 || billingIntervalMonths === 12) setBillingIntervalMonths(2); }} className={`rounded-xl border px-2 py-3 text-xs font-semibold ${billing === "monthly" && billingIntervalMonths !== 1 ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-500"}`}>{copy.custom}</button>
          </div>
          {billing === "monthly" && billingIntervalMonths !== 1 && <label className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500"><span>{copy.every}</span><input aria-label={copy.custom} type="number" min="2" max="120" value={billingIntervalMonths} onChange={(e) => setBillingIntervalMonths(Math.max(2, Math.min(120, Number(e.target.value) || 2)))} className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-bold text-slate-900 outline-none focus:border-blue-500" /><span>{copy.months}</span></label>}
        </Field>
        <Field label={commitmentType === "subscription" ? t.nextRenewalDate : isBill || isInstallment ? copy.dueDate : t.paymentDate}>
          <input
            type="date"
            value={renewalDate}
            onChange={(e) => setRenewalDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
          {commitmentType !== "subscription" && <p className="mt-1.5 text-[11px] font-normal text-slate-400">{isBill || isInstallment ? copy.nextDueHint : t.paymentDateHint}</p>}
        </Field>
        {householdMembers.length > 0 && (
          <Field label={household.splitWith}>
            <div className="space-y-2">
              {householdMembers.map((member) => {
                const checked = householdMemberIds.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm ${checked ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
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
                      <span className="text-xs font-bold text-blue-600">{currency} {perPersonAmount.toFixed(2)} {household.each}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </Field>
        )}
      </div>
      <Primary disabled={!amount || !renewalDate || (isInstallment && (!installmentCount || Number(installmentsPaid) > Number(installmentCount))) || (isDebt && !originalAmount)} onClick={onNext}>
        {common.continue} <ChevronRight size={16} className="rtl:rotate-180" />
      </Primary>
    </div>
  );
}
function ReminderStep({
  t,
  common,
  reminder,
  setReminder,
  onNext,
}: {
  t: Dictionary["subscriptionForm"];
  common: Dictionary["common"];
  reminder: number;
  setReminder: (v: number) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <Title
        title={t.setReminders}
        text={t.setRemindersDesc}
      />
      <div className="space-y-2">
        {reminders.map((days) => (
          <button
            key={days}
            onClick={() => setReminder(days)}
            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-start ${reminder === days ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
          >
            <span className="text-sm font-medium">
              {reminderLabel(days, t)}
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
        <strong className="text-slate-900">{t.reminderChannel}</strong> {t.inAppNotification}
      </div>
      <Primary onClick={onNext}>
        {common.continue} <ChevronRight size={16} className="rtl:rotate-180" />
      </Primary>
    </div>
  );
}
function Review({
  t,
  common,
  commitmentTypes,
  splitWithLabel,
  eachLabel,
  serviceName,
  category,
  amount,
  currency,
  billing,
  billingIntervalMonths,
  renewalDate,
  reminder,
  commitmentType,
  locale,
  amountIsVariable,
  installmentCount,
  installmentsPaid,
  splitNames,
  counterpartyName,
  loading,
  error,
  onSave,
  onEdit,
}: {
  t: Dictionary["subscriptionForm"];
  common: Dictionary["common"];
  commitmentTypes: Dictionary["commitmentTypes"];
  splitWithLabel: string;
  eachLabel: string;
  serviceName: string;
  category: string;
  amount: string;
  currency: string;
  billing: Billing;
  billingIntervalMonths: number;
  renewalDate: string;
  reminder: number;
  commitmentType: CommitmentType;
  locale: "en" | "ar";
  amountIsVariable: boolean;
  installmentCount: string;
  installmentsPaid: string;
  splitNames: string[];
  counterpartyName?: string;
  loading: boolean;
  error: string;
  onSave: () => void;
  onEdit: () => void;
}) {
  const billingLabel = billing === "yearly" ? common.yearly : billing === "trial" ? common.trial : billingIntervalMonths === 1 ? common.monthly : locale === "ar" ? `كل ${billingIntervalMonths} أشهر` : `every ${billingIntervalMonths} months`;
  const remainingInstallments = Math.max(0, Number(installmentCount || 0) - Number(installmentsPaid || 0));
  const typeCopy = locale === "ar" ? { due: "موعد الدفع القادم", behavior: "نوع المبلغ", fixed: "ثابت", variable: "متغير", plan: "خطة التقسيط", installmentSummary: `${remainingInstallments} متبقية من ${installmentCount}` } : { due: "Next payment", behavior: "Amount behavior", fixed: "Fixed", variable: "Variable", plan: "Installment plan", installmentSummary: `${remainingInstallments} of ${installmentCount} remaining` };
  return (
    <div>
      <Title title={t.reviewSave} text={t.confirmDetails} />
      <section className="ui-card mb-5 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-4 border-b border-slate-200 pb-5">
          <ServiceLogo name={serviceName} className="h-14 w-14 rounded-2xl" />
          <div>
            <h3 className="font-bold">{serviceName}</h3>
            <p className="text-sm text-slate-500">{category}</p>
          </div>
        </div>
        <div className="space-y-3.5">
          <Summary label={t.commitmentType} value={commitmentTypes[commitmentType]} />
          <Summary
            label={t.amount}
            value={`${currency} ${amount} / ${billingLabel}`}
          />
          <Summary label={commitmentType === "subscription" ? t.nextRenewal : typeCopy.due} value={renewalDate} />
          {commitmentType === "bill" && <Summary label={typeCopy.behavior} value={amountIsVariable ? typeCopy.variable : typeCopy.fixed} />}
          {commitmentType === "bnpl" && <Summary label={typeCopy.plan} value={typeCopy.installmentSummary} />}
          <Summary
            label={t.reminders}
            value={reminderLabel(reminder, t)}
          />
          {splitNames.length > 0 && (
            <Summary
              label={splitWithLabel}
              value={`${splitNames.join(", ")} (${currency} ${(Number(amount || 0) / splitNames.length).toFixed(2)} ${eachLabel})`}
            />
          )}
          {counterpartyName && <Summary label={t.counterpartyName} value={counterpartyName} />}
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
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none"
      >
        <Check size={16} />
        {loading ? t.saving : t.saveSubscription}
      </button>
      <button
        onClick={onEdit}
        className="mt-2 w-full py-3 text-sm font-semibold text-slate-500"
      >
        {t.editDetails}
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
      <span className="text-end text-sm font-semibold">{value}</span>
    </div>
  );
}
function Limit() {
  const { dict } = useLocale();
  const t = dict.subscriptionForm;
  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-blue-100 bg-blue-50/50 p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-blue-600">
        <CreditCard size={24} />
      </span>
      <h2 className="mt-5 text-xl font-bold">{t.limitReached}</h2>
      <p className="mt-2 text-sm text-slate-500">
        {format(t.limitReachedDesc, { limit: FREE_SUBSCRIPTION_LIMIT })}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/subscriptions"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
        >
          {dict.common.manage}
        </Link>
        <Link
          href="/upgrade"
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
        >
          {dict.common.upgrade}
        </Link>
      </div>
    </section>
  );
}
