"use client";

import { useId, useRef, useState, useTransition, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleDollarSign, Coffee, Fuel, HeartPulse, Loader2, Plus, ReceiptText, ShoppingBag, Sparkles, TrendingUp, Utensils, Wallet, X, Bus, Repeat2 } from "lucide-react";
import { addSpendingEntry, saveMonthlyIncome } from "@/features/snapshot/actions/snapshot-actions";
import styles from "./monthly-snapshot.module.css";

export type SnapshotEntry = { id?: string; amount: number; category: string; currency: string; spent_at?: string; note?: string | null };
const categories = [
  { id: "food", label: "Food & dining", short: "Food", icon: Utensils, color: "#ea9750", tint: "#fff2e6" },
  { id: "transport", label: "Transport", short: "Transport", icon: Bus, color: "#6878df", tint: "#edf0ff" },
  { id: "shopping", label: "Shopping", short: "Shopping", icon: ShoppingBag, color: "#45a28a", tint: "#e8f6f0" },
  { id: "gas", label: "Fuel & gas", short: "Fuel", icon: Fuel, color: "#c8a03e", tint: "#faf3dd" },
  { id: "health", label: "Health", short: "Health", icon: HeartPulse, color: "#db7e93", tint: "#fceef2" },
  { id: "entertainment", label: "Entertainment", short: "Fun", icon: Coffee, color: "#a17acd", tint: "#f4edfc" },
  { id: "other", label: "Other", short: "Other", icon: CircleDollarSign, color: "#8393a6", tint: "#edf1f5" },
];
const localDate = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; };

export function MonthlySnapshotCard({ currency, income, spending, recurring = 0, actualPaid = 0, selectedMonth, loadError, compact = false, locale = "en" }: {
  currency: string; income: number; spending: SnapshotEntry[]; recurring?: number; actualPaid?: number; selectedMonth?: string; loadError?: string; compact?: boolean; locale?: "en" | "ar";
}) {
  const router = useRouter();
  const uid = useId();
  const incomeDialog = useRef<HTMLDialogElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [incomeValue, setIncomeValue] = useState(String(income || ""));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const month = selectedMonth ?? localDate().slice(0, 7);
  const today = localDate();
  const [date, setDate] = useState(today.startsWith(month) ? today : `${month}-01`);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<{ text: string; error: boolean; target: "income" | "expense" } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const entries = spending.filter(entry => entry.currency === currency);
  const spent = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const allocated = spent + recurring;
  const left = income - allocated;
  const usage = income > 0 ? Math.round(allocated / income * 100) : 0;
  const monthDate = new Date(`${month}-01T12:00:00`);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const elapsed = month === today.slice(0, 7) ? new Date().getDate() : daysInMonth;
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  const daily = Array.from({ length: daysInMonth }, (_, i) => entries.filter(e => e.spent_at?.slice(0, 10) === `${month}-${String(i + 1).padStart(2, "0")}`).reduce((sum, e) => sum + Number(e.amount), 0));
  const peak = Math.max(...daily, 1);
  const totals = categories.map(c => ({ ...c, value: entries.filter(e => e.category === c.id).reduce((sum, e) => sum + Number(e.amount), 0) })).sort((a, b) => b.value - a.value);
  const largest = entries.reduce((max, e) => Math.max(max, Number(e.amount)), 0);
  const sorted = [...entries].sort((a, b) => (b.spent_at ?? "").localeCompare(a.spent_at ?? ""));
  const iconStyle = (color: string, tint: string) => ({ "--category-color": color, "--category-tint": tint } as CSSProperties);

  function openIncome() {
    setIncomeValue(String(income || ""));
    setNotice(null);
    incomeDialog.current?.showModal();
  }

  function goToExpense() {
    amountInput.current?.focus({ preventScroll: true });
    amountInput.current?.closest("form")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function submit(event: FormEvent, kind: "income" | "expense") {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      try {
        const result = kind === "income"
          ? await saveMonthlyIncome({ amount: incomeValue, currency, month: `${month}-01` })
          : await addSpendingEntry({ amount, currency, category, spent_at: date, note: note.trim() });
        if (!result.success) { setNotice({ text: result.message ?? "Couldn't save. Please try again.", error: true, target: kind }); return; }
        setNotice({ text: kind === "income" ? "Monthly income updated." : "Expense saved. Your balance and charts have updated.", error: false, target: kind });
        if (kind === "income") incomeDialog.current?.close();
        else { setAmount(""); setNote(""); }
        router.refresh();
      } catch { setNotice({ text: "Couldn't connect. Please try again.", error: true, target: kind }); }
    });
  }

  if (compact) {
    const copy = locale === "ar" ? {
      title: "ملخص الشهر", subtitle: "دخلك ومصروفاتك في نظرة واحدة", left: "المتبقي التقديري", income: "الدخل", recurring: "الالتزامات", expenses: "المصروفات اليومية", used: "من الدخل مخصص للمصروفات", setup: "ابدأ بإدخال دخلك", setupHint: "أضف دخلك الشهري لمعرفة المبلغ المتبقي.", details: "إدارة الدخل والمصروفات", start: "إعداد ملخص الشهر", estimate: actualPaid > 0 ? `دُفع فعليًا هذا الشهر: ${new Intl.NumberFormat("ar",{style:"currency",currency}).format(actualPaid)} — دون احتسابه مرتين.` : "الالتزامات محسوبة كمتوسط شهري.", error: "تعذر تحميل الملخص. افتح التفاصيل للمحاولة مجددًا.",
    } : {
      title: "Monthly snapshot", subtitle: "Your income and spending, together", left: "Estimated left to spend", income: "Income", recurring: "Commitments", expenses: "Daily expenses", used: "of income allocated", setup: "Start with your income", setupHint: "Add your monthly income to see what’s left.", details: "Manage income & expenses", start: "Set up monthly snapshot", estimate: actualPaid > 0 ? `Actually paid this month: ${new Intl.NumberFormat("en-US",{style:"currency",currency}).format(actualPaid)} — not counted twice.` : "Commitments use a monthly estimate.", error: "Couldn't load your snapshot. Open details to try again.",
    };
    const compactMoney = (value: number) => new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", { style: "currency", currency }).format(value);
    const scale = Math.max(income, allocated, 1);
    return <section className={`${styles.snapshot} ${styles.compactCard}`}>
      <div className={styles.compactHeader}><span className={styles.compactWallet}><Wallet size={20} /></span><div><h2>{copy.title}</h2><p>{copy.subtitle}</p></div><span className={styles.compactMonth}>{monthDate.toLocaleDateString(locale, { month: "short" })}</span></div>
      {loadError ? <p role="alert" className={styles.error}>{copy.error}</p> : <>
        <div className={styles.compactBalance}>
          <p>{income > 0 ? copy.left : copy.setup}</p>
          {income > 0 ? <strong className={left < 0 ? styles.overBudget : undefined}>{compactMoney(left)}</strong> : <span className={styles.compactSetup}>{copy.setupHint}</span>}
          {income > 0 && <><div className={styles.compactProgress} aria-label={`${usage}% ${copy.used}`}><span style={{ width: `${recurring / scale * 100}%` }} /><span style={{ width: `${spent / scale * 100}%` }} /></div><small>{usage}% {copy.used}</small></>}
        </div>
        <dl className={styles.compactFigures}>
          <div><dt><ArrowDownLeft size={14} />{copy.income}</dt><dd>{income > 0 ? compactMoney(income) : "—"}</dd></div>
          <div><dt><Repeat2 size={14} />{copy.recurring}</dt><dd>{compactMoney(recurring)}</dd></div>
          <div><dt><ReceiptText size={14} />{copy.expenses}</dt><dd>{compactMoney(spent)}</dd></div>
        </dl>
        <p className={styles.compactHint}>{copy.estimate}</p>
      </>}
      <Link className={styles.compactLink} href="/snapshot"><span>{income > 0 || loadError ? copy.details : copy.start}</span><ArrowUpRight size={17} className="rtl:-rotate-90" /></Link>
    </section>;
  }

  return <section id="monthly-snapshot" className={`${styles.snapshot} mobile-snapshot-page`}>
    <header className={styles.pageHeader}>
      <div><p className={styles.eyebrow}><Sparkles size={14} /> YOUR MONEY, IN FOCUS</p><h1>Monthly snapshot<span>.</span></h1><p className={styles.subtitle}>Enter your income, add daily expenses, and see what’s left.</p></div>
      <label className={styles.monthPicker}><CalendarDays size={18} /><span>{monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span><ChevronDown size={15} /><input aria-label="Snapshot month" type="month" value={month} onChange={e => { if (e.target.value) router.push(`/snapshot?month=${e.target.value}`); }} /></label>
    </header>
    {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
    <nav className={styles.actionBar} aria-label="Manage your monthly money">
      <button className={styles.incomeAction} onClick={openIncome}><Wallet size={18} /> {income > 0 ? "Edit monthly income" : "1. Set monthly income"}</button>
      <button className={styles.expenseAction} onClick={goToExpense}><Plus size={18} /> {income > 0 ? "Add an expense" : "2. Add an expense"}</button>
    </nav>
    {notice?.target === "income" && <p role={notice.error ? "alert" : "status"} className={notice.error ? styles.error : styles.success}>{notice.error ? null : <Check size={17} />}{notice.text}</p>}
    <div className={styles.layout}>
        <article className={styles.incomePanel}>
          <div className={styles.expenseHeading}><span className={styles.stepNumber}>{income > 0 ? <Check size={19} /> : "1"}</span><div><h2>Monthly income</h2><p>Salary + any additional income this month.</p></div></div>
          <strong>{money(income)}</strong>
          <button className={styles.incomeButton} onClick={openIncome}><Wallet size={17} />{income > 0 ? "Edit monthly income" : "Set monthly income"}<ArrowUpRight size={16} /></button>
        </article>
        <form className={styles.expensePanel} onSubmit={e => submit(e, "expense")}>
          <div className={styles.expenseHeading}><span className={styles.stepNumber}>2</span><div><h2>Add daily expenses</h2><p>Food, fuel, shopping, and other one-time costs.</p></div></div>
          <label className={styles.amountLabel} htmlFor={uid + "-amount"}>Amount</label>
          <div className={styles.amountField}><span>{currency}</span><input ref={amountInput} id={uid + "-amount"} type="number" min="0.01" max="999999999" step="0.01" required placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <fieldset className={styles.categoryPicker}><legend>Category</legend><div>{categories.map(c => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={category === c.id ? styles.selectedCategory : ""}><c.icon size={20} /><span>{c.short}</span></button>)}</div></fieldset>
          <label className={styles.field}>Payment date<input type="date" required min={`${month}-01`} max={`${month}-${daysInMonth}`} value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className={styles.field}>Note <span>optional</span><input type="text" maxLength={200} placeholder="e.g. Groceries or lunch with friends" value={note} onChange={e => setNote(e.target.value)} /></label>
          <button className={styles.primaryButton} disabled={pending} type="submit">{pending ? <Loader2 size={18} className={styles.spin} /> : <Plus size={18} />} {pending ? "Saving…" : "Save expense"} {Number(amount) > 0 && !pending && <span>· {money(Number(amount))}</span>}</button>
          <p className={styles.formHint}><Repeat2 size={14} /> Subscriptions and bills are already included automatically. Add only other expenses here.</p>
          {notice?.target === "expense" && <p role={notice.error ? "alert" : "status"} className={notice.error ? styles.error : styles.success}>{!notice.error && <Check size={17} />}{notice.text}</p>}
        </form>
        <article className={styles.balance}>
          <div className={styles.balanceTop}><span><Wallet size={18} /> MONTHLY BALANCE</span><span className={styles.currency}>{currency}</span></div>
          <div className={styles.balanceBody}>
            <div><p className={styles.balanceLabel}>Estimated left to spend</p><div className={styles.balanceNumber}>{income > 0 ? money(left) : "Let’s set your income"}</div><p className={styles.balanceHint}>{income > 0 ? "Income − recurring commitments − daily expenses" : "Give this month a starting point."}</p>{income <= 0 && <button className={styles.heroAction} onClick={openIncome}>Set monthly income <ArrowUpRight size={16} /></button>}</div>
            <div className={styles.ring} style={{ "--used": `${Math.min(usage, 100) * 3.6}deg` } as CSSProperties}><div><strong>{usage}%</strong><span>income used</span></div></div>
          </div>
          <div className={styles.balanceFoot}>
            <div><span><ArrowDownLeft size={16} /> Income</span><strong>{money(income)}</strong></div>
            <div><span><Repeat2 size={15} /> Commitments</span><strong>{money(recurring)}</strong>{actualPaid > 0 && <small>{money(actualPaid)} actually paid</small>}</div>
            <div><span><ArrowUpRight size={16} /> Daily expenses</span><strong>{money(spent)}</strong></div>
          </div>
        </article>
        <div className={styles.statGrid}>
          {[{ icon: TrendingUp, label: "Daily average", value: money(spent / elapsed), hint: "Daily expenses only", color: "#6277db", tint: "#edf0ff" }, { icon: ReceiptText, label: "Expenses added", value: String(entries.length).padStart(2, "0"), hint: "Recorded this month", color: "#419c83", tint: "#e8f6f0" }, { icon: ArrowUpRight, label: "Largest expense", value: money(largest), hint: "One-time spending", color: "#d28b42", tint: "#fff4e6" }].map(item => <article key={item.label} className={styles.stat}><span className={styles.icon} style={iconStyle(item.color, item.tint)}><item.icon size={18} /></span><p>{item.label}</p><strong>{item.value}</strong><small>{item.hint}</small></article>)}
        </div>
        <article className={`${styles.panel} ${styles.dailyPanel}`}>
          <div className={styles.sectionHead}><div><h2>Daily spending</h2><p>Each bar shows the expenses you added that day.</p></div><span className={styles.legend}><i /> {monthDate.toLocaleDateString("en-US", { month: "short" })}</span></div>
          <div className={styles.chart} role="img" aria-label={`Daily expenses for ${month}. Total ${money(spent)}. Peak ${money(Math.max(...daily))}.`}>
            <div className={styles.chartGrid}><span>{money(Math.max(...daily))}</span><span>{money(Math.max(...daily) / 2)}</span><span>{money(0)}</span></div>
            <div className={styles.bars}>{daily.map((value, i) => <div key={i} className={styles.barSlot}><div className={value === Math.max(...daily) && value > 0 ? styles.peakBar : styles.bar} style={{ height: `${value > 0 ? Math.max(3, value / peak * 100) : 2}%` }}><span>{month.slice(5)}/{i + 1} · {money(value)}</span></div></div>)}</div>
            {!entries.length && <div className={styles.chartEmpty}><TrendingUp size={24} /><span>No expenses added yet</span><small>Save your first expense to see this chart.</small></div>}
          </div>
          <div className={styles.chartDates}><span>01</span><span>07</span><span>14</span><span>21</span><span>{daysInMonth}</span></div>
        </article>
        <article className={`${styles.panel} ${styles.categoryPanel}`}>
          <div className={styles.sectionHead}><div><h2>Spending by category</h2><p>How your daily expenses are divided.</p></div><span className={styles.subtlePill}>{totals.filter(c => c.value > 0).length} categories</span></div>
          <div className={styles.categories}>{totals.filter((c, i) => c.value > 0 || i < 3).map(c => <div className={styles.categoryCard} key={c.id} style={iconStyle(c.color, c.tint)}><span className={styles.icon}><c.icon size={19} /></span><span className={styles.categoryShare}>{spent ? Math.round(c.value / spent * 100) : 0}%</span><p>{c.label}</p><strong>{money(c.value)}</strong><div className={styles.track}><div style={{ width: `${spent ? c.value / spent * 100 : 0}%` }} /></div></div>)}</div>
        </article>
        <article className={`${styles.panel} ${styles.latestPanel}`}>
          <div className={styles.sectionHead}><div><h2>Recent expenses</h2><p>The expenses you have saved this month.</p></div>{entries.length > 4 && <button className={styles.textButton} onClick={() => setShowAll(!showAll)}>{showAll ? "Show less" : "View all"} <ArrowUpRight size={15} /></button>}</div>
          {entries.length ? <div>{sorted.slice(0, showAll ? undefined : 4).map((entry, i) => { const c = categories.find(c => c.id === entry.category) ?? categories[6]; return <div key={entry.id ?? i} className={styles.transaction}><span className={styles.icon} style={iconStyle(c.color, c.tint)}><c.icon size={18} /></span><div><strong>{entry.note || c.label}</strong><small>{c.label} · {entry.spent_at ? new Date(entry.spent_at + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "This month"}</small></div><b>−{money(Number(entry.amount))}</b></div>; })}</div> : <div className={styles.empty}><ReceiptText size={26} /><div><strong>A fresh start for your month</strong><p>Your first expense will show up here.</p></div><button aria-label="Add your first expense" onClick={goToExpense}><Plus size={20} /></button></div>}
        </article>

    </div>
    <dialog ref={incomeDialog} className={styles.dialog} aria-labelledby={uid + "-income-title"}>
      <form onSubmit={e => submit(e, "income")}><div className={styles.sectionHead}><h2 id={uid + "-income-title"}>Monthly income</h2><button type="button" className={styles.editButton} aria-label="Close income editor" onClick={() => incomeDialog.current?.close()}><X size={20} /></button></div><p className={styles.subtitle}>Enter your total income for {monthDate.toLocaleDateString("en-US", { month: "long" })}.</p><label className={styles.field}>Income ({currency})<input autoFocus type="number" min="0" max="999999999" step="0.01" required value={incomeValue} onChange={e => setIncomeValue(e.target.value)} placeholder="0.00" /></label>{notice?.error && <p role="alert" className={styles.error}>{notice.text}</p>}<button disabled={pending} className={styles.primaryButton}>{pending ? "Saving…" : "Save income"}</button></form>
    </dialog>
  </section>;
}
