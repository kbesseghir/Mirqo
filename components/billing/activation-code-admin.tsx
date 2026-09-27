'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, KeyRound, Loader2, ShieldX } from 'lucide-react';
import { createActivationCode, revokeActivationCode } from '@/features/billing/actions/manage-activation-codes';
import { useLocale } from '@/components/locale-provider';
import { format } from '@/lib/i18n/format';

export type ActivationCodeRow = {
  id: string;
  code_hint: string | null;
  duration_days: number;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_by_email: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function ActivationCodeAdmin({ codes }: { codes: ActivationCodeRow[] }) {
  const router = useRouter();
  const { dict, locale } = useLocale();
  const t = dict.admin;
  const [creating, setCreating] = useState(false);
  const [generated, setGenerated] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const form = event.currentTarget;
    setCreating(true);
    setError('');
    const result = await createActivationCode(new FormData(form));
    if (result.success && result.code) {
      setGenerated(result.code);
      form.reset();
      router.refresh();
    } else if (!result.success) setError(result.message);
    setCreating(false);
  }

  async function revoke(id: string) {
    if (!window.confirm(t.confirmRevoke)) return;
    const result = await revokeActivationCode(id);
    if (!result.success) setError(result.message);
    router.refresh();
  }

  return (
    <>
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">{t.createTitle}</h2>
        <p className="mt-1 text-xs text-slate-500">{t.createDesc}</p>
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs font-semibold text-slate-600">{t.proDuration}
            <input name="durationDays" type="number" min="1" max="366" defaultValue="30" required className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" />
          </label>
          <label className="text-xs font-semibold text-slate-600">{t.codeExpires}
            <input name="expiresAt" type="date" required className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" />
          </label>
          <button disabled={creating} className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}{t.create}
          </button>
        </form>
        {generated && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-700">{t.newCodeCopy}</p>
            <div className="mt-2 flex items-center gap-3">
              <code className="min-w-0 flex-1 break-all font-bold text-slate-900">{generated}</code>
              <button type="button" onClick={() => navigator.clipboard.writeText(generated)} aria-label={t.copyCode} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-emerald-700"><Copy size={16} /></button>
            </div>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
      </section>
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold">{t.listTitle}</h2>
          <p className="mt-1 text-xs text-slate-500">{t.listDesc}</p>
        </div>
        {codes.length === 0
          ? <p className="p-8 text-center text-sm text-slate-500">{t.noCodesYet}</p>
          : <div className="divide-y divide-slate-100">
              {codes.map((code) => {
                const status = code.redeemed_at ? t.redeemed : code.revoked_at ? t.revoked : code.expires_at && new Date(code.expires_at) < new Date() ? t.expired : t.available;
                const available = status === t.available;
                return (
                  <article key={code.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <span className={`grid h-9 w-9 place-items-center rounded-full ${available ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{available ? <Check size={16} /> : <ShieldX size={16} />}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">••••-{code.code_hint ?? '----'} <span className="ms-2 text-xs font-medium text-slate-400">{code.duration_days} {t.days}</span></p>
                      <p className="mt-1 truncate text-xs text-slate-500">{code.redeemed_by_email ? format(t.usedBy, { email: code.redeemed_by_email }) : format(t.expires, { date: formatDate(code.expires_at, locale) })}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${available ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{status}</span>
                    {available && <button type="button" onClick={() => revoke(code.id)} className="text-xs font-semibold text-red-500">{t.revoke}</button>}
                  </article>
                );
              })}
            </div>}
      </section>
    </>
  );
}

function formatDate(value: string | null, locale: string) {
  const t = { never: locale === 'ar' ? 'أبدًا' : 'Never' };
  return value ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', { dateStyle: 'medium' }).format(new Date(value)) : t.never;
}
