import Link from "next/link";
import {
  Archive,
  Bell,
  ChevronRight,
  CircleHelp,
  CreditCard,
  KeyRound,
  LockKeyhole,
  LogOut,
  Palette,
  Settings2,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { activationDaysLeft, hasUnlimitedAccess } from "@/lib/plan";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { format } from "@/lib/i18n/format";

type Item = {
  title: string;
  description?: string;
  icon: typeof Bell;
  href?: string;
  external?: boolean;
  disabled?: boolean;
};

export default async function Page() {
  const t = getDictionary(await getLocale()).settings;
  const supabase = await createClient();
  const [{ data: { user } }, { data: profile }, { data: isAdmin }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("plan,is_pro,trial_ends_at,activation_ends_at").maybeSingle(),
    supabase.rpc("is_activation_admin"),
  ]);
  const name = user?.user_metadata.full_name?.toString() || user?.email?.split("@")[0] || "Mirqo user";
  const isPro = hasUnlimitedAccess(profile);
  const activationDays = activationDaysLeft(profile);
  const items: Item[] = [
    { title: t.archive, description: t.archiveDesc, icon: Archive, href: "/subscriptions?status=cancelled" },
    { title: t.preferences, description: t.preferencesDesc, icon: Settings2, href: "/settings/preferences" },
    { title: t.household, description: t.householdDesc, icon: Users, href: "/settings/household" },
    { title: t.accountSecurity, description: t.accountSecurityDesc, icon: ShieldCheck, href: "/settings/security" },
    { title: t.paymentMethods, description: t.paymentMethodsDesc, icon: CreditCard, disabled: true },
    { title: t.betaProAccess, description: t.betaProAccessDesc, icon: KeyRound, href: "/upgrade" },
    { title: t.linkedAccounts, description: t.linkedAccountsDesc, icon: LockKeyhole, href: "/calendar" },
    { title: t.appAppearance, description: t.appAppearanceDesc, icon: Palette, disabled: true },
    { title: t.helpSupport, description: t.helpSupportDesc, icon: CircleHelp, href: "/settings/support" },
    { title: t.rateMirqo, description: t.rateMirqoDesc, icon: Star, disabled: true },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-600 sm:hidden">Mirqo</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{t.account}</h1>
        <p className="mt-1 hidden text-sm text-slate-500 sm:block">{t.manageAccount}</p>
      </header>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:gap-7">
        <div className="space-y-4">
          <Link href="/upgrade" className="relative block overflow-hidden rounded-[18px] border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_100%)] p-5 text-slate-950">
            <span className="absolute -end-8 -top-10 h-28 w-28 rounded-full border-[22px] border-white/10" />
            <div className="relative flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-blue-600 ring-1 ring-blue-100"><Star size={21} fill="currentColor" /></span>
              <span>
                <span className="block text-base font-bold">{isPro ? t.betaProActive : t.unlockBetaPro}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {isPro
                    ? activationDays > 0 ? format(t.daysRemainingActivation, { days: activationDays }) : t.unlimitedEnabled
                    : t.startTrialOrCode}
                </span>
              </span>
            </div>
          </Link>

          <Link href="/profile" className="flex items-center gap-4 rounded-[18px] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.05)] ring-1 ring-slate-200/60 transition hover:-translate-y-0.5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-base font-bold text-white">{initials(name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold capitalize text-slate-900">{name}</span>
              <span className="mt-1 block truncate text-xs text-slate-500">{user?.email}</span>
            </span>
            <ChevronRight size={18} className="text-slate-400 rtl:rotate-180" />
          </Link>
        </div>

        <section className="overflow-hidden rounded-[18px] bg-white px-4 py-2 shadow-[0_8px_24px_rgba(15,23,42,.05)] ring-1 ring-slate-200/60 sm:px-5">
          {items.map((item) => <SettingsRow key={item.title} item={item} soon={t.soon} />)}
          {isAdmin && <SettingsRow item={{ title: t.activationCodes, description: t.activationCodesDesc, icon: KeyRound, href: "/admin/activation-codes" }} soon={t.soon} />}
          <div className="flex min-h-[68px] items-center gap-4 border-t border-slate-100 px-1 text-red-500">
            <LogOut size={19} className="shrink-0" />
            <SignOutButton className="flex-1 text-start text-sm font-semibold text-red-500" />
          </div>
        </section>
      </div>
      <p className="mt-8 text-center text-xs text-slate-400">{t.versionNote}</p>
    </div>
  );
}

function SettingsRow({ item, soon }: { item: Item; soon: string }) {
  const Icon = item.icon;
  const content = <>
    <Icon size={19} className="shrink-0 text-slate-700" />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
      {item.description && <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{item.description}</span>}
    </span>
    {item.disabled
      ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">{soon}</span>
      : <ChevronRight size={17} className="shrink-0 text-slate-400 rtl:rotate-180" />}
  </>;
  const classes = `flex min-h-[68px] items-center gap-4 border-b border-slate-100 px-1 py-3 transition last:border-0 ${item.disabled ? "cursor-not-allowed opacity-55" : "hover:bg-slate-50"}`;
  if (!item.href) return <div aria-disabled={item.disabled} className={classes}>{content}</div>;
  if (item.external) return <a href={item.href} target="_blank" rel="noreferrer" className={classes}>{content}</a>;
  return <Link href={item.href} className={classes}>{content}</Link>;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
