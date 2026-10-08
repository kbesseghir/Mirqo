"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  BarChart3,
  Bell,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Settings,
  WalletCards,
} from "lucide-react";
import { Logo } from "./brand/logo";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { useLocale } from "./locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const feedbackUrl =
  process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim() ||
  "mailto:cert.learndz@gmail.com?subject=Mirqo%20beta%20feedback";

function useNavigation(nav: Dictionary["nav"]) {
  return [
    { label: nav.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { label: nav.subscriptions, href: "/subscriptions", icon: CreditCard },
    { label: nav.analytics, href: "/analytics", icon: BarChart3 },
    { label: nav.calendar, href: "/calendar", icon: CalendarDays },
    { label: nav.monthlySnapshot, href: "/snapshot", icon: WalletCards },
    { label: nav.paymentHistory, href: "/payments", icon: ReceiptText },
    { label: nav.notifications, href: "/notifications", icon: Bell },
    { label: nav.settings, href: "/settings", icon: Settings },
  ] as const;
}

function NavigationLink({
  item,
  mobile = false,
  unreadNotifications = 0,
}: {
  item: { label: string; href: string; icon: typeof LayoutDashboard };
  mobile?: boolean;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  if (mobile) {
    return (
      <Link
        href={item.href}
        className={`relative flex h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-semibold transition ${active ? "text-blue-600" : "text-slate-400"}`}
      >
        <span className={`grid h-8 w-10 place-items-center rounded-xl transition ${active ? "bg-blue-50 text-blue-600" : "text-slate-400"}`}>
          <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
        </span>
        <span className="w-full truncate text-center leading-none">{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${active ? "bg-blue-50 font-semibold text-blue-700" : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      {active && (
        <span className="absolute start-0 h-4 w-0.5 rounded-full bg-blue-600" />
      )}
      <Icon size={17} />
      {item.label}
      {item.href === "/notifications" && unreadNotifications > 0 && (
        <span className="ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadNotifications > 99 ? "99+" : unreadNotifications}
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children, email, isPro = false, unreadNotifications = 0 }: { children: React.ReactNode; email?: string; isPro?: boolean; unreadNotifications?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { dict } = useLocale();
  const t = dict.appShell;
  const navigation = useNavigation(dict.nav);
  const mobileNavigation = [navigation[0], navigation[1], navigation[2]] as const;
  const [navigating, setNavigating] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNavigating(false);
    if (timer.current) clearTimeout(timer.current);
  }, [pathname, searchParams]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function handleNavigation(event: React.MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = (event.target as HTMLElement).closest("a");
    if (
      !anchor ||
      anchor.target === "_blank" ||
      anchor.hasAttribute("download")
    )
      return;
    const destination = new URL(anchor.href, window.location.href);
    if (
      destination.origin !== window.location.origin ||
      destination.href === window.location.href
    )
      return;
    setNavigating(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNavigating(false), 10000);
  }
  const name = email?.split("@")[0].replace(/[._-]+/g, " ") ?? "Mirqo user";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const mobileMoreActive = ["/calendar", "/notifications", "/settings", "/profile", "/upgrade"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <div className="app-shell min-h-screen bg-[var(--background)]" onClickCapture={handleNavigation}>
      {navigating && <NavigationLoading label={t.loadingPage} />}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-60 flex-col border-e border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo compact />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {navigation.map((item) => (
            <NavigationLink item={item} key={item.href} unreadNotifications={unreadNotifications} />
          ))}
        </nav>
        <div className="space-y-2 px-3 pb-5">
          <LanguageToggle className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" />
          {!isPro && <Link
            href="/upgrade"
            className="flex items-center gap-2.5 rounded-xl bg-blue-50 px-3.5 py-2.5 text-sm font-semibold text-blue-600"
          >
            <span className="grid h-5 w-5 place-items-center rounded-lg bg-blue-600 text-[10px] font-black text-white">
              <ArrowUp size={12} />
            </span>
            {t.betaProAccess}
          </Link>}
          <a
            href={feedbackUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <MessageCircle size={16} />
            {t.sendFeedback}
          </a>
          <Link
            href="/settings"
            className="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 hover:bg-slate-100"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold capitalize text-slate-900">
                {name}
              </span>
              <span className={`block text-xs ${isPro?"font-semibold text-emerald-600":"text-slate-500"}`}>{isPro?t.proPlan:t.freePlan}</span>
            </span>
            <MoreHorizontal size={14} className="text-slate-400" />
          </Link>
        </div>
      </aside>

      <header className="mobile-app-header sticky top-0 z-20 flex min-h-[64px] items-center gap-2.5 border-b border-slate-200/70 bg-white/90 px-4 py-2 pt-[max(.5rem,env(safe-area-inset-top))] backdrop-blur-2xl lg:ms-60 lg:h-14 lg:min-h-0 lg:border-b lg:border-slate-200/70 lg:px-8 lg:py-0 lg:pt-0">
        <div className="flex min-w-0 items-center lg:hidden">
          <Logo compact />
        </div>
        <form action="/subscriptions" method="get" className="relative hidden w-full max-w-xs lg:block">
          <button type="submit" aria-label={t.runSearch} className="absolute start-1.5 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-blue-600"><Search size={14}/></button>
          <input aria-label={t.searchAria} placeholder={t.searchPlaceholder} name="search" defaultValue={searchParams.get("search")??""} className="w-full rounded-xl border border-transparent bg-slate-100/70 py-2 ps-9 pe-10 text-sm outline-none transition focus:border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100" />
        </form>
        <div className="ms-auto flex items-center gap-1.5">
          <LanguageToggle className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:flex" />
          <span className="hidden sm:inline-flex"><ThemeToggle /></span>
          <Link
            href="/notifications"
            aria-label={t.notificationsAria}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
          >
            <Bell size={17} />
            {unreadNotifications > 0 && (
              <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            aria-label={t.profileAria}
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-[11px] font-bold text-white shadow-sm lg:hidden"
          >
            {initials}
          </Link>
          <Link
            href="/subscriptions/new"
            className="ms-1 hidden min-h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 lg:flex"
          >
            <Plus size={15} />
            {t.add}
          </Link>
        </div>
      </header>

      <main className="mobile-app-main min-h-[calc(100vh-4rem)] bg-[#f6f8fb] px-3.5 py-4 pb-28 sm:px-6 sm:py-7 sm:pb-28 lg:min-h-[calc(100vh-3.5rem)] lg:ms-60 lg:px-9 lg:py-9 lg:pb-10 xl:px-12">
        <div className="mx-auto w-full max-w-[1520px] animate-page-enter">
          {children}
        </div>
      </main>

      {mobileMoreOpen && (
        <>
          <button type="button" aria-label={t.closeMoreMenu} onClick={() => setMobileMoreOpen(false)} className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] lg:hidden" />
          <section aria-label={t.moreNavigation} className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-[30px] bg-white px-4 pb-3 pt-2 shadow-[0_-20px_60px_rgba(15,23,42,.22)] lg:hidden">
            <span className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{initials}</span><span className="min-w-0"><strong className="block truncate text-sm capitalize">{name}</strong><small className="text-slate-500">{isPro ? t.proPlan : t.freePlan}</small></span></div>
            <div className="grid grid-cols-2 gap-2">
            <Link href="/calendar" className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-4 text-sm font-semibold text-slate-700"><CalendarDays size={19} className="text-blue-500"/>{dict.nav.calendar}</Link>
            <Link href="/snapshot" className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-4 text-sm font-semibold text-slate-700"><WalletCards size={19} className="text-blue-500"/>{dict.nav.monthlySnapshot}</Link>
            <Link href="/payments" className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-4 text-sm font-semibold text-slate-700"><ReceiptText size={19} className="text-blue-500"/>{dict.nav.paymentHistory}</Link>
            <Link href="/settings" className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-4 text-sm font-semibold text-slate-700"><Settings size={19} className="text-blue-500"/>{dict.nav.settings}</Link>
            </div>
            <a href={feedbackUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-500"><MessageCircle size={18}/>{t.sendFeedback}</a>
            <div className="mt-1 flex items-center gap-2 border-t border-slate-100 pt-3">
              <LanguageToggle className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-600" />
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-50"><ThemeToggle /></span>
            </div>
          </section>
        </>
      )}
      <nav className="safe-area-bottom fixed inset-x-2 bottom-2 z-40 grid grid-cols-5 items-center gap-1 rounded-[24px] border border-slate-200/80 bg-white/95 px-2 pt-1.5 shadow-[0_14px_45px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:inset-x-auto sm:start-1/2 sm:w-[min(440px,calc(100%-1rem))] sm:-translate-x-1/2 rtl:sm:translate-x-1/2 lg:hidden">
        {mobileNavigation.slice(0, 2).map((item) => (
          <NavigationLink item={item} key={item.href} mobile />
        ))}
        <Link
          href="/subscriptions/new"
          aria-label={t.addSubscriptionAria}
          className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-[0_9px_22px_rgba(109,63,242,.32)]"
        >
          <Plus size={20} strokeWidth={2.5} />
        </Link>
        {mobileNavigation.slice(2).map((item) => (
          <NavigationLink item={item} key={item.href} mobile />
        ))}
        <button type="button" aria-label={t.more} aria-expanded={mobileMoreOpen} onClick={() => setMobileMoreOpen(value => !value)} className={`flex h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-semibold transition ${mobileMoreOpen || mobileMoreActive ? "text-blue-600" : "text-slate-400"}`}>
          <span className={`grid h-8 w-10 place-items-center rounded-xl ${mobileMoreOpen || mobileMoreActive ? "bg-blue-50" : ""}`}><MoreHorizontal size={19} strokeWidth={mobileMoreOpen || mobileMoreActive ? 2.4 : 1.8}/></span>
          <span className="w-full truncate text-center leading-none">{t.more}</span>
        </button>
      </nav>
    </div>
  );
}

function NavigationLoading({ label }: { label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-blue-100"
    >
      <span className="block h-full w-1/3 animate-navigation-progress rounded-full bg-blue-600" />
    </div>
  );
}
