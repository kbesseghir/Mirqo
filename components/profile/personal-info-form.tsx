"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/locale-provider";

export function PersonalInfoForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const { dict } = useLocale();
  const t = dict.profile;
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setMessage("");
    const { error } = await createClient().auth.updateUser({ data: { full_name: trimmed } });
    setLoading(false);
    if (error) {
      setSuccess(false);
      setMessage(t.nameSaveFailed);
      return;
    }
    setSuccess(true);
    setMessage(t.nameSaved);
    router.refresh();
  }

  return (
    <div className="flex min-h-16 items-center gap-4 px-5 py-3.5 sm:px-6">
      <span className="min-w-0 flex-1">
        <label htmlFor="display-name" className="block text-sm font-semibold">{t.personalInfo}</label>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{t.personalInfoDesc}</span>
        <div className="mt-2.5 flex gap-2">
          <input
            id="display-name"
            value={name}
            onChange={(event) => { setName(event.target.value); setMessage(""); }}
            placeholder={t.namePlaceholder}
            maxLength={100}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={save}
            disabled={loading || !name.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {t.saveName}
          </button>
        </div>
        {message && <p role="status" className={`mt-2 text-xs ${success ? "text-emerald-600" : "text-red-600"}`}>{message}</p>}
      </span>
    </div>
  );
}
