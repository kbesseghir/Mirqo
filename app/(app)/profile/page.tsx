import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Lock,
  LogOut,
  Shield,
  Smartphone,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PersonalInfoForm } from "@/components/profile/personal-info-form";
import { FREE_SUBSCRIPTION_LIMIT } from "@/features/subscriptions/constants";
import { activationDaysLeft, hasUnlimitedAccess } from "@/lib/plan";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { format } from "@/lib/i18n/format";

export default async function Page() {
  const t = getDictionary(await getLocale()).profile;
  const supabase = await createClient();
  const [{ data: { user } }, { data: profile }, { count }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("plan,is_pro,trial_ends_at,activation_ends_at").single(),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }),
  ]);
  const name = user?.user_metadata.full_name?.toString() || user?.email?.split("@")[0] || "Mirqo user";
  const isPro = hasUnlimitedAccess(profile);
  const activationDays = activationDaysLeft(profile);
  const used = count ?? 0;
  const max = isPro ? used : FREE_SUBSCRIPTION_LIMIT;
  const percent = isPro ? 100 : Math.min(100, used / FREE_SUBSCRIPTION_LIMIT * 100);

  return <div className="mx-auto max-w-4xl pb-8">
    <header className="text-center sm:text-start">
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-600 sm:hidden">{t.account}</p>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
      <p className="mt-1.5 text-sm text-slate-500 sm:text-base">{t.subtitle}</p>
    </header>

    <section className="mt-6 flex items-center gap-4 rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.04)] sm:mt-8 sm:gap-5 sm:p-6 sm:shadow-sm">
      <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-md shadow-blue-200 sm:h-20 sm:w-20 sm:text-xl">
        {initials(name)}
        <span className="absolute -bottom-1 -end-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-bold capitalize sm:text-lg">{name}</h2>
        <p className="truncate text-sm text-slate-500">{user?.email}</p>
        <div className="mt-2 flex gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
            {activationDays > 0 ? format(t.proCodeDays, { days: activationDays }) : isPro ? t.proPlan : t.freePlan}
          </span>
          {!isPro && <Link href="/upgrade" className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600">{t.betaAccess}</Link>}
        </div>
      </div>
    </section>

    <section className="mt-4 rounded-[22px] border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_100%)] p-5 text-slate-950 sm:p-6">
      <div className="flex justify-between gap-3 text-sm">
        <p className="font-bold">{isPro ? t.proPlan : format(t.freePlanUsage, { used, max })}</p>
        {!isPro && <Link href="/upgrade" className="shrink-0 font-semibold text-blue-700">{t.betaAccessArrow}</Link>}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {isPro ? t.unlimitedTracking : format(t.slotsLeft, { count: Math.max(0, FREE_SUBSCRIPTION_LIMIT - used) })}
      </p>
    </section>

    <Group label={t.accountGroup}>
      <PersonalInfoForm initialName={name} />
      <Row href="/settings/security" icon={Lock} title={t.passwordSecurity} detail={t.passwordSecurityDesc} />
      <Row href="/upgrade" icon={CreditCard} title={t.betaProAccess} detail={t.betaProAccessDesc} />
      <Row href="/notifications" icon={Bell} title={t.notifications} detail={t.notificationsDesc} action={t.manage} />
    </Group>

    <Group label={t.integrationsGroup}>
      <Row href="/calendar" icon={CalendarDays} title={t.googleCalendar} detail={t.googleCalendarDesc} />
      <Row icon={UserRound} title={t.appleSignIn} detail={t.notEnabled} disabled comingSoon={t.comingSoon} />
    </Group>

    <section className="mt-3 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600"><Smartphone size={16} /></span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{t.installMirqo}</p>
        <p className="text-xs text-slate-500">{t.installMirqoDesc}</p>
      </div>
      <span className="text-xs font-semibold text-slate-400">{t.optional}</span>
    </section>

    <Group label={t.securityGroup}>
      <Row icon={Shield} title={t.twoFactor} detail={t.notEnabled} disabled comingSoon={t.comingSoon} />
      <Row icon={Lock} title={t.activeSessions} detail={t.activeSessionsDesc} disabled comingSoon={t.comingSoon} />
    </Group>

    <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-4 p-4">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-red-50 text-red-500"><LogOut size={16} /></span>
        <div className="flex-1">
          <SignOutButton className="text-sm font-semibold text-red-500" />
          <p className="text-xs text-slate-500">{t.signOutDesc}</p>
        </div>
      </div>
      <div className="border-t border-slate-100 p-4 opacity-65">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-red-400">{t.deleteAccount}</p>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">{t.comingSoon}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{t.deleteAccountDesc}</p>
      </div>
    </section>
  </div>;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white">
    <p className="px-5 pt-5 text-xs font-bold uppercase tracking-wider text-slate-400 sm:px-6">{label}</p>
    <div className="mt-2 divide-y divide-slate-100">{children}</div>
  </section>;
}

function Row({ href, icon: Icon, title, detail, action, disabled = false, comingSoon = "" }: {
  href?: string;
  icon: typeof Bell;
  title: string;
  detail: string;
  action?: string;
  disabled?: boolean;
  comingSoon?: string;
}) {
  const content = <>
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon size={17} /></span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs leading-5 text-slate-500">{detail}</span>
    </span>
    {action
      ? <span className="text-[10px] font-semibold text-blue-600">{action} ›</span>
      : disabled
        ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">{comingSoon}</span>
        : <ChevronRight size={14} className="text-slate-400 rtl:rotate-180" />}
  </>;
  const classes = `flex min-h-16 items-center gap-4 px-5 py-3.5 sm:px-6 ${disabled ? "cursor-not-allowed opacity-65" : "hover:bg-slate-50"}`;
  return href
    ? <Link href={href} className={classes}>{content}</Link>
    : <div aria-disabled={disabled} className={classes}>{content}</div>;
}
