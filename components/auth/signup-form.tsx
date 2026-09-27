"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthStyles } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/client";
import { logEvent } from "@/lib/analytics";
import { useLocale } from "@/components/locale-provider";

export function SignupForm() {
  const router = useRouter();
  const { dict } = useLocale();
  const t = dict.auth.signup;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted) {
      setError(t.acceptRequired);
      return;
    }
    setError("");
    setLoading(true);
    const result = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback`, data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    const newUserId = result.data.user?.id;
    if (newUserId) void logEvent(createClient(), newUserId, "signup_completed");
    if (!result.data.session) {
      router.push("/check-email");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell mode="signup">
      <Link href="/" aria-label={dict.common.back} className="mb-8 grid h-10 w-10 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100"><ArrowLeft size={22} className="rtl:rotate-180" /></Link>
      <h1 className="text-[30px] font-bold leading-tight tracking-tight text-slate-950">{t.join} <span aria-hidden>🚀</span></h1>
      <p className="mt-2 text-[15px] text-slate-500">{t.subtitle}</p>
      <form onSubmit={submit} className="mt-8 flex flex-1 flex-col">
        <div className="space-y-5">
          <Field label={t.fullName} icon={UserRound}><input required autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder={t.fullNamePlaceholder} className="trezo-input ps-14 pe-5" /></Field>
          <Field label={t.email} icon={Mail}><input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.email} className="trezo-input ps-14 pe-5" /></Field>
          <label className="flex flex-col gap-3 text-[15px] font-semibold text-slate-900">
            {t.password}
            <div className="relative">
              <Lock size={18} className="absolute start-5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input required minLength={6} autoComplete="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t.password} className="trezo-input px-14" />
              <button type="button" aria-label={showPassword ? t.hidePassword : t.showPassword} onClick={() => setShowPassword((value) => !value)} className="absolute end-5 top-1/2 -translate-y-1/2 text-slate-600">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-slate-700">
            <input required type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded-md accent-blue-600" />
            <span>{t.agreePrefix} <Link href="/terms" target="_blank" className="font-semibold text-blue-600">{t.terms}</Link> {t.and} <Link href="/privacy" target="_blank" className="font-semibold text-blue-600">{t.privacyPolicy}</Link> {t.ofMirqo}</span>
          </label>
          {error && <p role="alert" className="flex gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={17} className="shrink-0" />{error}</p>}
          <p className="text-center text-sm text-slate-600">{t.haveAccount} <Link href="/login" className="font-semibold text-blue-600">{t.signIn}</Link></p>
        </div>
        <div className="mt-auto pt-8 lg:mt-6">
          <button disabled={loading} className="auth-primary-button" aria-busy={loading}>
            {loading ? <><Loader2 size={17} className="animate-spin" /> {t.creatingAccount}</> : t.signUp}
          </button>
          <p className="mt-5 text-center text-xs text-slate-400">{t.planNote}</p>
        </div>
      </form>
      <AuthStyles />
    </AuthShell>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Mail; children: React.ReactNode }) {
  return <label className="flex flex-col gap-3 text-[15px] font-semibold text-slate-900">{label}<div className="relative"><Icon size={18} className="absolute start-5 top-1/2 -translate-y-1/2 text-slate-600" />{children}</div></label>;
}
