'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { startProTrial } from '@/features/billing/actions/start-trial';
import { useLocale } from '@/components/locale-provider';

export function StartTrialButton() {
  const router = useRouter();
  const { dict } = useLocale();
  const t = dict.startTrial;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setBusy(true);
    const result = await startProTrial();
    setBusy(false);
    if (!result.success) {
      setError(result.message ?? t.unableToStart);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button onClick={start} disabled={busy} className="mt-5 flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-semibold text-blue-600 disabled:opacity-60">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{t.start}
      </button>
      {error && <p className="mt-2 text-xs text-red-100">{error}</p>}
    </div>
  );
}
