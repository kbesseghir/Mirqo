"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthStyles } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/locale-provider";
import { format } from "@/lib/i18n/format";

export default function Page() {
  const { dict } = useLocale();
  const t = dict.forgotPassword;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell mode="login">
      <Link href="/login" aria-label={t.backToSignIn} className="mb-10 grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100"><ArrowLeft size={22} className="rtl:rotate-180" /></Link>
      {sent ? (
        <div className="flex flex-1 flex-col text-center">
          <span className="mx-auto mt-10 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-200"><CheckCircle2 size={42} /></span>
          <h1 className="mt-8 text-[30px] font-bold tracking-tight">{t.checkEmailTitle}</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">{format(t.checkEmailDesc, { email })}</p>
          <Link href="/login" className="mt-auto flex min-h-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-700 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-blue-200 lg:mt-12">{t.backToSignIn}</Link>
        </div>
      ) : (
        <>
          <h1 className="text-[30px] font-bold leading-tight tracking-tight">{t.title} <span aria-hidden>🔑</span></h1>
          <p className="mt-3 text-[15px] leading-6 text-slate-500">{t.subtitle}</p>
          <form onSubmit={submit} className="mt-10 flex flex-1 flex-col">
            <label className="text-[15px] font-semibold text-slate-900">{t.registeredEmail}
              <div className="relative mt-3">
                <Mail size={18} className="absolute start-5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="trezo-input ps-14 pe-5" placeholder="you@example.com" />
              </div>
            </label>
            {error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="mt-auto flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-blue-200 disabled:opacity-60 lg:mt-12">
              {loading ? <><Loader2 size={17} className="animate-spin" /> {t.sending}</> : t.sendResetLink}
            </button>
          </form>
        </>
      )}
      <AuthStyles />
    </AuthShell>
  );
}
