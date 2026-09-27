"use client";

import { BellRing, CalendarClock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { useLocale } from "@/components/locale-provider";

export function AuthShell({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: "login" | "signup";
}) {
  const { dict } = useLocale();
  const t = dict.auth;
  return (
    <main className="min-h-screen bg-white lg:grid lg:place-items-center lg:bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_#f8fafc_40%,_#eef2ff_100%)] lg:p-8">
      <div className="contents lg:grid lg:min-h-[720px] lg:w-full lg:max-w-[1180px] lg:grid-cols-[minmax(390px,.9fr)_minmax(500px,1.1fr)] lg:overflow-hidden lg:rounded-[32px] lg:border lg:border-white/80 lg:bg-white lg:shadow-[0_30px_90px_rgba(30,64,175,.14)]">
      <aside className="relative hidden overflow-hidden bg-[#f2f5fb] bg-[linear-gradient(rgba(37,99,235,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,.035)_1px,transparent_1px)] bg-[size:32px_32px] p-12 text-slate-950 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <span className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-300/35 blur-3xl" />
        <span className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
        <span className="absolute left-1/2 top-1/3 h-52 w-52 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <Logo compact href="/" />
          <LanguageToggle className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 backdrop-blur transition hover:bg-white" />
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-600">{t.neverMissRenewal}</p>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight">
            {mode === "login" ? t.loginTitle : t.signupTitle}
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-500">
            {t.trackDesc}
          </p>
        </div>
        <div className="relative grid gap-3">
          <Benefit icon={CalendarClock} text={t.benefitDates} />
          <Benefit icon={BellRing} text={t.benefitReminders} />
          <Benefit icon={ShieldCheck} text={t.benefitPrivate} />
        </div>
      </aside>

      <section className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-7 sm:px-10 lg:min-h-0 lg:max-w-[520px] lg:justify-center lg:px-14 lg:py-12 xl:px-16">
        <div className="mb-2 flex justify-end lg:hidden">
          <LanguageToggle />
        </div>
        {children}
      </section>
      </div>
    </main>
  );
}

function Benefit({ icon: Icon, text }: { icon: typeof BellRing; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-blue-100/80 bg-white/80 p-3.5 shadow-sm backdrop-blur">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={17} /></span>
      <span className="text-xs font-semibold text-slate-700">{text}</span>
    </div>
  );
}
