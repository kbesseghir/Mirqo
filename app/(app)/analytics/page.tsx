import Link from "next/link";
import { ArrowUpRight, CreditCard, DollarSign, Gift, HandCoins, PieChart, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, monthlyEquivalent, preferredCurrency, totalsByCurrency } from "@/lib/subscriptions";
import { serviceVisual } from "@/lib/services";
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import type { CommitmentPayment, Subscription } from "@/types/database";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { format } from "@/lib/i18n/format";

type T = Dictionary["analytics"];

export default async function Page({ searchParams }: { searchParams: { currency?: string; month?:string } }) {
  const locale=await getLocale();
  const dict = getDictionary(locale);
  const ar=locale==="ar";
  const t = dict.analytics;
  const common = dict.common;
  const supabase = await createClient();
  const now = new Date();
  const requestedMonth=/^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month??"")?searchParams.month!:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const monthStart = `${requestedMonth}-01`;
  const selectedDate=new Date(`${monthStart}T12:00:00`);
  const nextMonth = new Date(selectedDate.getFullYear(),selectedDate.getMonth()+1,1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth()+1).padStart(2,"0")}-01`;
  const historyStartDate=new Date(selectedDate.getFullYear(),selectedDate.getMonth()-5,1);
  const historyStart=`${historyStartDate.getFullYear()}-${String(historyStartDate.getMonth()+1).padStart(2,"0")}-01`;
  const [{ data }, { data: profile }, { data: paymentRows }] = await Promise.all([
    supabase.from("subscriptions").select("*"),
    supabase.from("profiles").select("preferred_currency").maybeSingle(),
    supabase.from("commitment_payments").select("amount,currency,paid_at,subscription_id").gte("paid_at",historyStart).lt("paid_at",monthEnd),
  ]);
  const subscriptions = (data ?? []) as Subscription[];
  const active = subscriptions.filter((subscription) => subscription.status === "active" || subscription.status === "trial");
  const spendActive = active.filter((subscription) => subscription.commitment_type !== "debt" || subscription.debt_direction !== "owed_to_me");
  const debts = active.filter((subscription) => subscription.commitment_type === "debt");
  const totals = totalsByCurrency(spendActive);
  const currency = preferredCurrency(totals, searchParams.currency ?? profile?.preferred_currency);
  const selected = spendActive.filter((subscription) => subscription.currency === currency);
  const total = totals.find((item) => item.currency === currency) ?? { currency, monthly: 0, yearly: 0 };
  const allPaymentRows=(paymentRows??[]) as Pick<CommitmentPayment,"amount"|"currency"|"paid_at"|"subscription_id">[];
  const isIncomingDebtPayment=(payment:Pick<CommitmentPayment,"subscription_id">)=>{const commitment=subscriptions.find(item=>item.id===payment.subscription_id);return commitment?.commitment_type==="debt"&&commitment.debt_direction==="owed_to_me"};
  const selectedPayments = allPaymentRows.filter(payment=>payment.currency===currency&&payment.paid_at>=monthStart&&payment.paid_at<monthEnd&&!isIncomingDebtPayment(payment));
  const paidThisMonth = selectedPayments.reduce((sum,payment)=>sum+Number(payment.amount),0);
  const paymentTypes = (["subscription","bill","bnpl","membership","insurance","debt","other"] as const).map(type=>({type,total:selectedPayments.filter(payment=>subscriptions.find(item=>item.id===payment.subscription_id)?.commitment_type===type).reduce((sum,payment)=>sum+Number(payment.amount),0)})).filter(row=>row.total>0);
  const comparisonMax=Math.max(total.monthly,paidThisMonth,1);
  const previousDate=new Date(selectedDate.getFullYear(),selectedDate.getMonth()-1,1);const previousKey=`${previousDate.getFullYear()}-${String(previousDate.getMonth()+1).padStart(2,"0")}`;const previousPaid=allPaymentRows.filter(row=>row.currency===currency&&row.paid_at.startsWith(previousKey)&&!isIncomingDebtPayment(row)).reduce((sum,row)=>sum+Number(row.amount),0);const paidChange=previousPaid?Math.round((paidThisMonth-previousPaid)/previousPaid*100):null;
  const trend=Array.from({length:6},(_,index)=>{const date=new Date(selectedDate.getFullYear(),selectedDate.getMonth()-5+index,1);const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;return{key,label:date.toLocaleDateString("en-US",{month:"short"}),value:allPaymentRows.filter(row=>row.currency===currency&&row.paid_at.startsWith(key)&&!isIncomingDebtPayment(row)).reduce((sum,row)=>sum+Number(row.amount),0)}});const trendMax=Math.max(...trend.map(row=>row.value),1);
  const trials = active.filter((subscription) => subscription.status === "trial").length;
  const ranked = [...selected].sort((a, b) => monthlyEquivalent(b) - monthlyEquivalent(a));
  const monthlyCount = selected.filter((subscription) => subscription.billing_cycle === "monthly").length;
  const yearlyCount = selected.filter((subscription) => subscription.billing_cycle === "yearly").length;
  const trialCount = selected.filter((subscription) => subscription.billing_cycle === "trial").length;
  const count = Math.max(selected.length, 1);
  const monthlyEnd = (monthlyCount / count) * 360;
  const yearlyEnd = monthlyEnd + (yearlyCount / count) * 360;
  const donut = `conic-gradient(#2563eb 0deg ${monthlyEnd}deg,#06b6d4 ${monthlyEnd}deg ${yearlyEnd}deg,#8b5cf6 ${yearlyEnd}deg 360deg)`;
  const currencyDebts=debts.filter(debt=>debt.currency===currency);
  const debtOwedByMe=currencyDebts.filter(debt=>debt.debt_direction!=="owed_to_me").reduce((sum,debt)=>sum+Number(debt.remaining_balance??debt.original_amount??debt.amount),0);
  const debtOwedToMe=currencyDebts.filter(debt=>debt.debt_direction==="owed_to_me").reduce((sum,debt)=>sum+Number(debt.remaining_balance??debt.original_amount??debt.amount),0);
  const netDebt=debtOwedToMe-debtOwedByMe;

  return (
    <div className="mx-auto max-w-[1480px]">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker">{t.kicker}</p>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-description">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><form><input type="hidden" name="currency" value={currency}/><input name="month" type="month" defaultValue={requestedMonth} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"/><button className="ms-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">View</button></form>{totals.length > 0 && totals.map((item) => <Link key={item.currency} href={`/analytics?currency=${item.currency}&month=${requestedMonth}`} aria-current={currency === item.currency ? "page" : undefined} className={`rounded-full px-4 py-2 text-xs font-bold transition ${currency === item.currency ? "bg-slate-950 text-white shadow-lg shadow-slate-300" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>{item.currency}</Link>)}</div>
      </header>

      {totals.length > 1 && <p className="mt-5 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-medium text-blue-700">{t.multiCurrencyNote}</p>}

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[var(--shadow-card)] sm:p-8">
          <div className="relative flex min-h-52 flex-col justify-between">
            <div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-blue-700">{t.monthlyRecurringSpend} · {currency}</p><p className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{formatMoney(total.monthly, currency)}</p><p className="mt-2 text-sm text-slate-500">{formatMoney(total.yearly, currency)} {t.projectedYearly}</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-blue-600 ring-1 ring-blue-100"><TrendingUp size={20} /></span></div>
            <div className="mt-8 flex items-center justify-between gap-4"><span className="text-xs text-slate-500">{format(t.subscriptionsIn, { count: selected.length, currency })}</span><Link href="/subscriptions" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-xs font-bold text-white">{t.reviewPlans} <ArrowUpRight size={14} className="rtl:rotate-90" /></Link></div>
          </div>
        </section>

        <section className="workspace-section p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">{t.billingCycles}</h2><p className="mt-1 text-xs text-slate-500">{currency}</p></div><PieChart size={18} className="text-violet-500" /></div>
          <div className="mt-5 flex items-center gap-6">
            <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: donut }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center"><div><p className="text-2xl font-black">{selected.length}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t.plans}</p></div></div></div>
            <div className="min-w-0 flex-1 space-y-3"><Legend color="bg-blue-600" label={t.monthly} value={monthlyCount} /><Legend color="bg-cyan-500" label={t.yearly} value={yearlyCount} /><Legend color="bg-violet-500" label={t.trials} value={trialCount} /></div>
          </div>
        </section>
      </div>

      <div className="metric-strip mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Metric icon={DollarSign} tone="emerald" label={t.metricMonthly} value={formatMoney(total.monthly, currency)} detail={currency} />
        <Metric icon={TrendingUp} tone="violet" label={t.metricYearly} value={formatMoney(total.yearly, currency)} detail={t.projected} />
        <Metric icon={CreditCard} tone="blue" label={ar?"المدفوع هذا الشهر":"Paid this month"} value={formatMoney(paidThisMonth,currency)} detail={paidChange===null?(ar?"لا توجد بيانات للشهر السابق":"No previous-month baseline"):`${paidChange>=0?"+":""}${paidChange}% ${ar?"مقارنة بالشهر السابق":"vs previous month"}`} />
        <Metric icon={Gift} tone="amber" label={t.trials} value={String(trials)} detail={t.allCurrencies} />
      </div>

      <section className="workspace-section mt-6 grid gap-8 p-5 lg:grid-cols-2 sm:p-6">
        <div><h2 className="text-base font-bold">{ar?"الفعلي مقابل المتوقع":"Actual vs expected"}</h2><p className="mt-1 text-xs text-slate-500">{ar?"الدفعات المسجلة مقارنة بتقدير الالتزامات الشهري.":"Recorded payments compared with the monthly commitment estimate."}</p><div className="mt-6 space-y-4">{[{label:ar?"المتوقع":"Expected",value:total.monthly,color:"bg-blue-500"},{label:ar?"المدفوع فعليًا":"Actually paid",value:paidThisMonth,color:"bg-emerald-500"}].map(row=><div key={row.label}><div className="mb-2 flex justify-between text-xs"><span className="font-semibold text-slate-600">{row.label}</span><strong>{formatMoney(row.value,currency)}</strong></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${row.color}`} style={{width:`${Math.max(row.value?4:0,row.value/comparisonMax*100)}%`}}/></div></div>)}</div></div>
        <div><h2 className="text-base font-bold">{ar?"الدفعات حسب النوع":"Payments by type"}</h2><p className="mt-1 text-xs text-slate-500">{ar?"الدفعات التي سجلتها فعليًا هذا الشهر.":"Only payments you actually recorded this month."}</p><div className="mt-5 space-y-2.5">{paymentTypes.map(row=><div key={row.type} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs"><span className="font-semibold">{dict.commitmentTypes[row.type]}</span><strong>{formatMoney(row.total,currency)}</strong></div>)}{!paymentTypes.length&&<p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">{ar?"لا توجد دفعات مسجلة هذا الشهر.":"No payments recorded this month."}</p>}</div></div>
      </section>
      <section className="mt-4 rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,.05)] sm:p-6"><div><h2 className="text-base font-bold">{ar?"اتجاه الدفعات":"Payment trend"}</h2><p className="mt-1 text-xs text-slate-500">{ar?"الدفعات الفعلية المسجلة خلال آخر ستة أشهر.":"Actual recorded payments over the last six months."}</p></div><div className="mt-6 flex h-48 items-end gap-3">{trend.map(row=><div key={row.key} className="flex h-full flex-1 flex-col justify-end gap-2 text-center"><span className="text-[10px] font-bold text-slate-500">{row.value?formatMoney(row.value,currency):"—"}</span><div className="mx-auto w-full max-w-16 rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400" style={{height:`${Math.max(row.value?8:2,row.value/trendMax*140)}px`}}/><span className="text-[10px] font-semibold text-slate-400">{row.label}</span></div>)}</div></section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
        <section className="workspace-section p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4"><div><h2 className="text-base font-bold">{t.spendingDistribution}</h2><p className="mt-1 text-xs text-slate-500">{t.monthlyEquivalentByService}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">{currency}</span></div>
          <SpendingBreakdown subscriptions={selected} currency={currency} t={t} />
        </section>

        <section className="workspace-section p-5 sm:p-6">
          <h2 className="text-base font-bold">{t.highestCommitments}</h2>
          <p className="mt-1 text-xs text-slate-500">{t.rankedByMonthly}</p>
          <div className="mt-5 space-y-3">
            {ranked.slice(0, 5).map((subscription, index) => <Link key={subscription.id} href={`/subscriptions/${subscription.id}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-blue-50"><span className="w-4 text-center text-[10px] font-bold text-slate-400">{index + 1}</span><ServiceLogo name={subscription.service_name} className="h-10 w-10 rounded-xl" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{subscription.service_name}</span><span className="mt-1 block text-[10px] text-slate-500">{subscription.billing_cycle === "yearly" ? common.yearly : subscription.billing_cycle === "trial" ? common.trial : common.monthly}</span></span><span className="text-right text-xs font-black">{formatMoney(monthlyEquivalent(subscription), currency)}<span className="block text-[9px] font-medium text-slate-400">{t.perMonth}</span></span></Link>)}
            {!ranked.length && <p className="py-12 text-center text-sm text-slate-500">{format(t.noActiveSubscriptions, { currency })}</p>}
          </div>
        </section>
      </div>

      {debts.length > 0 && (
        <section className="workspace-section mt-6 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="text-base font-bold">{t.personalDebts}</h2><p className="mt-1 text-xs text-slate-500">{t.personalDebtsDesc}</p></div>
            <HandCoins size={18} className="text-amber-500" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-orange-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">{ar?"عليك":"You owe"}</p><strong className="mt-2 block text-lg text-orange-800">{formatMoney(debtOwedByMe,currency)}</strong></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">{ar?"لك":"Owed to you"}</p><strong className="mt-2 block text-lg text-emerald-800">{formatMoney(debtOwedToMe,currency)}</strong></div><div className={`rounded-2xl p-4 ${netDebt>=0?"bg-blue-50":"bg-slate-100"}`}><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{ar?"صافي الديون":"Net debt position"}</p><strong className={`mt-2 block text-lg ${netDebt>=0?"text-blue-800":"text-slate-800"}`}>{formatMoney(netDebt,currency)}</strong></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {debts.map((debt) => (
              <Link key={debt.id} href={`/subscriptions/${debt.id}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 transition hover:bg-amber-50">
                <ServiceLogo name={debt.service_name} className="h-10 w-10 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">{debt.counterparty_name || debt.service_name}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">{debt.service_name}</span>
                </span>
                <span className="shrink-0 text-end text-xs font-black">{formatMoney(Number(debt.remaining_balance ?? debt.original_amount ?? debt.amount), debt.currency)}<span className={`block text-[9px] font-bold ${debt.debt_direction==="owed_to_me"?"text-emerald-600":"text-orange-600"}`}>{debt.debt_direction==="owed_to_me"?(ar?"لك":"Owed to you"):(ar?"عليك":"You owe")}</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

function Metric({ icon: Icon, tone, label, value, detail }: { icon: typeof DollarSign; tone: "blue" | "emerald" | "violet" | "amber"; label: string; value: string; detail: string }) {
  const tones = { blue: "bg-blue-50 text-blue-600", emerald: "bg-emerald-50 text-emerald-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600" };
  return <div className="p-4 sm:p-5"><span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}><Icon size={16} /></span><p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-xl font-black">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return <div className="flex items-center"><span className={`me-2 h-2.5 w-2.5 rounded-full ${color}`} /><span className="flex-1 text-xs text-slate-500">{label}</span><span className="text-xs font-black">{value}</span></div>;
}

function SpendingBreakdown({ subscriptions, currency, t }: { subscriptions: Subscription[]; currency: string; t: T }) {
  const ranked = [...subscriptions].sort((a, b) => monthlyEquivalent(b) - monthlyEquivalent(a));
  const total = ranked.reduce((sum, subscription) => sum + monthlyEquivalent(subscription), 0);
  if (!ranked.length) return <div className="mt-5 grid min-h-60 place-items-center rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-500">{format(t.noRecurringSpending, { currency })}</div>;
  return <div className="mt-6 space-y-5">{ranked.slice(0, 8).map((subscription) => { const amount = monthlyEquivalent(subscription); const share = total > 0 ? amount / total * 100 : 0; const visual = serviceVisual(subscription.service_name); return <div key={subscription.id}><div className="mb-2 flex items-center gap-3"><ServiceLogo name={subscription.service_name} className="h-8 w-8 rounded-lg" /><span className="min-w-0 flex-1 truncate text-xs font-bold">{subscription.service_name}</span><span className="text-xs font-black">{formatMoney(amount, currency)} <span className="font-medium text-slate-400">· {Math.round(share)}%</span></span></div><div className="ms-11 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(2, share)}%`, backgroundColor: visual.color }} /></div></div>; })}</div>;
}
