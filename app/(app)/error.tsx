'use client';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict } = useLocale();
  const t = dict.errorPage;
  return (
    <div className="mx-auto grid min-h-[55vh] max-w-md place-items-center text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950"><AlertTriangle size={23} /></span>
        <h1 className="mt-5 text-xl font-bold">{t.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{t.desc}</p>
        <button onClick={reset} className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"><RefreshCw size={15} />{t.tryAgain}</button>
      </div>
    </div>
  );
}
