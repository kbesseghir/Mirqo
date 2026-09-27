"use client";

import { useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { updatePreferredCurrency } from "@/features/profile/actions/update-preferred-currency";
import { useLocale } from "@/components/locale-provider";

export function CurrencyPreferenceForm({ initialCurrency }: { initialCurrency: string }) {
  const { dict } = useLocale();
  const t = dict.preferences;
  const [currency, setCurrency] = useState(initialCurrency);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setLoading(true);
    setMessage("");
    const result = await updatePreferredCurrency(currency);
    setMessage(result.success ? t.saved : result.message ?? t.couldNotSave);
    setLoading(false);
  }

  return (
    <section className="mt-7 overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)] ring-1 ring-slate-200/60">
      <div className="flex items-center gap-5 px-5 py-5">
        <div className="min-w-0 flex-1">
          <label htmlFor="preferred-currency" className="text-sm font-bold">{t.defaultCurrency}</label>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t.defaultCurrencyDesc}</p>
        </div>
        <div className="relative">
          <select id="preferred-currency" value={currency} onChange={(event) => { setCurrency(event.target.value); setMessage(""); }} className="h-11 appearance-none rounded-xl bg-slate-50 ps-4 pe-10 text-sm font-semibold outline-none ring-1 ring-slate-200 focus:ring-blue-500">
            {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      </div>
      <div className="border-t border-slate-100 p-4">
        <button type="button" onClick={save} disabled={loading || currency === initialCurrency && message === t.saved} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {t.savePreference}
        </button>
        {message && <p role="status" className={`mt-3 text-center text-xs ${message === t.saved ? "text-emerald-600" : "text-red-600"}`}>{message}</p>}
      </div>
    </section>
  );
}
