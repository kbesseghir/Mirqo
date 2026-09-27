"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/locale-provider";
import { logEvent } from "@/lib/analytics";

export function AuthForm() {
  const router = useRouter();
  const { dict } = useLocale();
  const t = dict.auth.login;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.data.user) void logEvent(createClient(), result.data.user.id, "login_completed");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell mode="login">
      <Link href="/" aria-label={dict.common.back} className="mb-10 grid h-10 w-10 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100">
        <ArrowLeft size={22} className="rtl:rotate-180" />
      </Link>
      <h1 className="text-[30px] font-bold leading-tight tracking-tight text-slate-950">{t.welcomeBack} <span aria-hidden>👋</span></h1>
      <p className="mt-2 text-[15px] text-slate-500">{t.subtitle}</p>

      <form onSubmit={submit} className="mt-10 flex flex-1 flex-col">
        <div className="space-y-6">
          <Field label={t.email}>
            <div className="relative">
              <Mail size={18} className="absolute start-5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.email} className="trezo-input ps-14" />
            </div>
          </Field>
          <Field label={t.password}>
            <div className="relative">
              <Lock size={18} className="absolute start-5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input required minLength={6} autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t.password} className="trezo-input px-14" />
              <button type="button" aria-label={showPassword ? t.hidePassword : t.showPassword} onClick={() => setShowPassword((value) => !value)} className="absolute end-5 top-1/2 -translate-y-1/2 text-slate-600">
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </Field>
          <div className="flex items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-5 w-5 rounded-md border-slate-300 accent-blue-600" />
              {t.rememberMe}
            </label>
            <Link href="/forgot-password" className="text-sm font-semibold text-blue-600">{t.forgotPassword}</Link>
          </div>
          {error && <p role="alert" className="flex gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={17} className="shrink-0" />{error}</p>}
          <p className="text-center text-sm text-slate-600">{t.noAccount} <Link href="/signup" className="font-semibold text-blue-600">{t.signUp}</Link></p>
        </div>
        <div className="mt-auto pt-10 lg:mt-8">
          <button disabled={loading} className="auth-primary-button" aria-busy={loading}>
            {loading ? <><Loader2 size={17} className="animate-spin" /> {t.signingIn}</> : t.signIn}
          </button>
          <p className="mt-5 text-center text-xs leading-5 text-slate-400">{t.betaNote}</p>
        </div>
      </form>
      <AuthStyles />
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-3 text-[15px] font-semibold text-slate-900">{label}{children}</label>;
}

export function AuthStyles() {
  return <style jsx global>{`
    .auth-primary-button{display:flex;min-height:52px;width:100%;align-items:center;justify-content:center;gap:8px;border-radius:14px;background:#2563eb;padding:0 20px;font-size:14px;font-weight:700;color:#fff;transition:.2s}
    .auth-primary-button:hover{background:#1d4ed8}
    .auth-primary-button:disabled{opacity:.6}
    .trezo-input{width:100%;min-height:64px;border:1px solid transparent;border-radius:16px;background:#f8fafc;padding-top:16px;padding-bottom:16px;font-size:16px;color:#0f172a;outline:none;transition:.2s}
    .trezo-input::placeholder{color:#a1a1aa}
    .trezo-input:focus{border-color:#2563eb;background:#fff;box-shadow:0 0 0 4px rgba(37,99,235,.1)}
  `}</style>;
}
