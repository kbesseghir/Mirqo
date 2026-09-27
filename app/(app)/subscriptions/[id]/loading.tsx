import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function Loading() {
  const t = getDictionary(await getLocale()).loadingPage;
  return (
    <div className="mx-auto max-w-3xl animate-pulse" role="status">
      <div className="h-9 w-28 rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800">
        <div className="flex gap-4 p-5 sm:p-8">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="flex-1">
            <div className="h-7 w-48 max-w-full rounded bg-slate-100 dark:bg-slate-800" />
            <div className="mt-3 h-4 w-28 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
        <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 sm:p-8 dark:border-slate-800">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-24 rounded-2xl bg-slate-50 dark:bg-slate-900"
            />
          ))}
        </div>
      </div>
      <span className="sr-only">{t.loading}</span>
    </div>
  );
}
