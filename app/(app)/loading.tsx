import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function Loading() {
  const t = getDictionary(await getLocale()).loadingPage;
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse"
      aria-label={t.loading}
      role="status"
    >
      <div className="h-7 w-44 rounded-lg bg-slate-100 dark:bg-slate-800" />
      <div className="mt-2 h-4 w-64 max-w-full rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-48 rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>
      <span className="sr-only">{t.loading}</span>
    </div>
  );
}
