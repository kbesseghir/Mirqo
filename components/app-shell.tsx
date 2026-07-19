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
  MoreHorizontal,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { Logo } from "./brand/logo";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

const mobileNavigation = [navigation[0], navigation[1], navigation[2]] as const;

function NavigationLink({
  item,
  mobile = false,
  unreadNotifications = 0,
}: {
  item: (typeof navigation)[number];
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
        className={`relative flex min-w-14 flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-semibold transition ${active ? "bg-blue-50 text-blue-600" : "text-slate-400"}`}
      >
        <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
        {item.label === "Subscriptions" ? "Subs" : item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${active ? "bg-blue-50 font-semibold text-blue-700" : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      {active && (
        <span className="absolute left-0 h-5 w-1 rounded-full bg-blue-600" />
      )}
      <Icon size={17} />
      {item.label}
      {item.href === "/notifications" && unreadNotifications > 0 && (
        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadNotifications > 99 ? "99+" : unreadNotifications}
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children, email, isPro = false, unreadNotifications = 0 }: { children: React.ReactNode; email?: string; isPro?: boolean; unreadNotifications?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  return (
    <div className="min-h-screen bg-white" onClickCapture={handleNavigation}>
      {navigating && <NavigationLoading />}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/80 bg-[#fafbfc] lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo compact />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {navigation.map((item) => (
            <NavigationLink item={item} key={item.href} unreadNotifications={unreadNotifications} />
          ))}
        </nav>
        <div className="space-y-2 px-3 pb-5">
          {!isPro && <Link
            href="/upgrade"
            className="flex items-center gap-2.5 rounded-xl bg-blue-50 px-3.5 py-2.5 text-sm font-semibold text-blue-600"
          >
            <span className="grid h-5 w-5 place-items-center rounded-lg bg-blue-600 text-[10px] font-black text-white">
              <ArrowUp size={12} />
            </span>
            Upgrade to Pro
          </Link>}
          <Link
            href="/settings"
            className="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 hover:bg-slate-100"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold capitalize text-slate-900">
                {name}
              </span>
              <span className={`block text-xs ${isPro?"font-semibold text-emerald-600":"text-slate-500"}`}>{isPro?"Pro plan":"Free plan"}</span>
            </span>
            <MoreHorizontal size={14} className="text-slate-400" />
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl lg:ml-64 lg:px-8">
        <div className="lg:hidden">
          <Logo compact />
        </div>
        <form action="/subscriptions" method="get" className="relative hidden w-full max-w-xs lg:block">
          <button type="submit" aria-label="Run search" className="absolute left-1.5 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-blue-600"><Search size={14}/></button>
          <input aria-label="Search subscriptions" placeholder="Search subscriptions..." name="search" defaultValue={searchParams.get("search")??""} className="w-full rounded-xl border border-transparent bg-slate-100/70 py-2 pl-9 pr-10 text-sm outline-none transition focus:border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100" />
        </form>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <Bell size={17} />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            aria-label="Profile"
            className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-[11px] font-bold text-white shadow-sm lg:hidden"
          >
            {initials}
          </Link>
          <Link
            href="/subscriptions/new"
            className="hidden items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 sm:flex"
          >
            <Plus size={15} />
            Add
          </Link>
        </div>
      </header>

      <main className="min-h-[calc(100vh-3.5rem)] bg-white px-4 py-6 pb-32 sm:px-6 lg:ml-64 lg:px-8 lg:pb-10">
        <div className="mx-auto w-full max-w-[1600px] animate-page-enter">
          {children}
        </div>
      </main>

      {mobileMoreOpen && (
        <>
          <button type="button" aria-label="Close more menu" onClick={() => setMobileMoreOpen(false)} className="fixed inset-0 z-30 bg-slate-950/10 lg:hidden" />
          <section aria-label="More navigation" className="fixed bottom-24 right-4 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/20 lg:hidden">
            <Link href="/calendar" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><CalendarDays size={18} className="text-slate-400"/>Calendar</Link>
            <Link href="/notifications" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Bell size={18} className="text-slate-400"/>Notifications{unreadNotifications > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</Link>
            <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Settings size={18} className="text-slate-400"/>Settings</Link>
          </section>
        </>
      )}
      <nav className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-[22px] border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-2xl shadow-slate-900/15 backdrop-blur-2xl lg:hidden">
        {mobileNavigation.slice(0, 2).map((item) => (
          <NavigationLink item={item} key={item.href} mobile />
        ))}
        <Link
          href="/subscriptions/new"
          aria-label="Add subscription"
          className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200"
        >
          <Plus size={20} strokeWidth={2.5} />
        </Link>
        {mobileNavigation.slice(2).map((item) => (
          <NavigationLink item={item} key={item.href} mobile />
        ))}
        <button type="button" aria-label="More" aria-expanded={mobileMoreOpen} onClick={() => setMobileMoreOpen(value => !value)} className={`flex min-w-14 flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-semibold transition ${mobileMoreOpen ? "bg-blue-50 text-blue-600" : "text-slate-400"}`}>
          <MoreHorizontal size={20} strokeWidth={mobileMoreOpen ? 2.5 : 1.75}/>
          More
        </button>
      </nav>
    </div>
  );
}

function NavigationLoading() {
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-blue-100"
    >
      <span className="block h-full w-1/3 animate-navigation-progress rounded-full bg-blue-600" />
    </div>
  );
}
