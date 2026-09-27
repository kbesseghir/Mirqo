"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, dict, setLocale } = useLocale();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
      }
    >
      <Languages size={14} />
      {dict.appShell.language}
    </button>
  );
}
