"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { AuthStyles } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/locale-provider";

export default function Page() {
  const router = useRouter();
  const { dict } = useLocale();
  const t = dict.resetPassword;
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setError(t.passwordsMismatch);
      return;
    }
    setLoading(true);
    setError("");
    const result = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell mode="login">
      <Link href="/login" aria-label={t.back} className="mb-10 grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100"><ArrowLeft size={22} className="rtl:rotate-180" /></Link>
      <h1 className="text-[30px] font-bold leading-tight tracking-tight">{t.title} <span aria-hidden>🔒</span></h1>
      <p className="mt-3 text-[15px] leading-6 text-slate-500">{t.subtitle}</p>
      <form onSubmit={submit} className="mt-10 flex flex-1 flex-col">
        <div className="space-y-6">
          <PasswordField label={t.createPassword} value={password} show={showPassword} onChange={setPassword} onToggle={() => setShowPassword((value) => !value)} t={t} />
          <PasswordField label={t.confirmPassword} value={confirmation} show={showPassword} onChange={setConfirmation} onToggle={() => setShowPassword((value) => !value)} t={t} />
          {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        </div>
        <button disabled={loading} className="mt-auto flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-blue-200 disabled:opacity-60 lg:mt-12">
          {loading ? <><Loader2 size={17} className="animate-spin" /> {t.updating}</> : t.saveNewPassword}
        </button>
      </form>
      <AuthStyles />
    </AuthShell>
  );
}

function PasswordField({ label, value, show, onChange, onToggle, t }: {
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  t: { hidePassword: string; showPassword: string };
}) {
  return <label className="flex flex-col gap-3 text-[15px] font-semibold">
    {label}
    <div className="relative">
      <Lock size={18} className="absolute start-5 top-1/2 -translate-y-1/2 text-slate-600" />
      <input required minLength={6} autoComplete="new-password" type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="trezo-input px-14" placeholder={label} />
      <button type="button" aria-label={show ? t.hidePassword : t.showPassword} onClick={onToggle} className="absolute end-5 top-1/2 -translate-y-1/2 text-slate-600">{show ? <EyeOff size={19} /> : <Eye size={19} />}</button>
    </div>
  </label>;
}
