"use client";

import { useState } from "react";
import { Check, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/locale-provider";

export function ChangePasswordForm({ email }: { email: string }) {
  const { dict } = useLocale();
  const t = dict.security;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(false);
    if (next.length < 6) {
      setMessage(t.tooShort);
      return;
    }
    if (next !== confirm) {
      setMessage(t.mismatch);
      return;
    }
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const verify = await supabase.auth.signInWithPassword({ email, password: current });
    if (verify.error) {
      setLoading(false);
      setMessage(t.wrongPassword);
      return;
    }
    const update = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (update.error) {
      setMessage(t.genericError);
      return;
    }
    setSuccess(true);
    setMessage(t.saved);
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <form onSubmit={submit} className="mt-7 overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)] ring-1 ring-slate-200/60">
      <div className="space-y-5 p-5">
        <PasswordField label={t.currentPassword} value={current} show={show} onChange={setCurrent} autoComplete="current-password" />
        <PasswordField label={t.newPassword} value={next} show={show} onChange={setNext} autoComplete="new-password" />
        <PasswordField label={t.confirmPassword} value={confirm} show={show} onChange={setConfirm} autoComplete="new-password" />
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          {show ? t.hidePassword : t.showPassword}
        </label>
      </div>
      <div className="border-t border-slate-100 p-4">
        <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {loading ? t.saving : t.save}
        </button>
        {message && <p role="status" className={`mt-3 text-center text-xs ${success ? "text-emerald-600" : "text-red-600"}`}>{message}</p>}
      </div>
    </form>
  );
}

function PasswordField({ label, value, show, onChange, autoComplete }: {
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-900">
      {label}
      <div className="relative mt-2">
        <Lock size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          required
          minLength={6}
          autoComplete={autoComplete}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 ps-11 pe-4 text-sm font-normal outline-none focus:border-blue-500"
        />
      </div>
    </label>
  );
}
