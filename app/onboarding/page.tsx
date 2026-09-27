import Link from 'next/link';
import { ArrowRight, Keyboard, Mail, RefreshCw, ScanLine } from 'lucide-react';
import { getLocale } from '@/lib/i18n/get-locale';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function Page() {
  const t = getDictionary(await getLocale()).onboarding;
  return (
    <main className="min-h-screen bg-white px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-white"><RefreshCw size={14} /></span>
          <span className="font-bold">Mirqo</span>
        </div>
        <div className="mt-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">{t.welcome}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t.howStart}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">{t.lead}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Method href="/subscriptions/new" icon={Keyboard} title={t.addManually} text={t.addManuallyDesc} active />
          <Method href="/smart-detection" icon={Mail} title={t.pasteEmail} text={t.pasteEmailDesc} />
          <Method href="/smart-detection" icon={ScanLine} title={t.uploadScreenshot} text={t.uploadScreenshotDesc} />
        </div>
        <Link href="/dashboard" className="mx-auto mt-10 flex w-fit items-center gap-2 text-sm font-semibold text-slate-500">{t.skipForNow} <ArrowRight size={14} className="rtl:rotate-180" /></Link>
      </div>
    </main>
  );
}

function Method({ href, icon: Icon, title, text, active = false }: { href: string; icon: typeof Mail; title: string; text: string; active?: boolean }) {
  return (
    <Link href={href} className={`rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-lg ${active ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200'}`}>
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-600 shadow-sm"><Icon size={20} /></span>
      <h2 className="mt-5 font-bold">{title}</h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
    </Link>
  );
}
