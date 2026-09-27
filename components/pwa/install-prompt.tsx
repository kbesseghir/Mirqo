"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logEvent } from "@/lib/analytics";

declare global { interface Window { __mirqoDeferredInstall?: BeforeInstallPromptEvent; } }
interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

export function PwaInstallPrompt({ compact = false }: { compact?: boolean }) {
  const [installable, setInstallable] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    setInstalled(Boolean(standalone));
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (event: Event) => { event.preventDefault(); window.__mirqoDeferredInstall = event as BeforeInstallPromptEvent; setInstallable(true); };
    const onInstalled = () => { setInstalled(true); setInstallable(false); void createClient().auth.getUser().then(({ data }) => { if (data.user) void logEvent(createClient(), data.user.id, "pwa_installed"); }); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (installed) return null;
  if (ios) return <p className="flex items-center gap-2 text-xs text-slate-500"><Share size={14} className="text-blue-600" /> Install MYRQO: tap Share, then <strong>Add to Home Screen</strong>.</p>;
  if (!installable) return null;
  return <button type="button" onClick={async () => { const prompt = window.__mirqoDeferredInstall; if (!prompt) return; void createClient().auth.getUser().then(({ data }) => { if (data.user) void logEvent(createClient(), data.user.id, "pwa_install_clicked"); }); await prompt.prompt(); window.__mirqoDeferredInstall = undefined; setInstallable(false); }} className={compact ? "inline-flex items-center gap-2 text-xs font-bold text-blue-600" : "inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700"}><Download size={15} /> Install MYRQO</button>;
}
