"use client";

import { useState, useTransition } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { submitFeedback } from '@/features/feedback/actions/submit-feedback';

export function FeedbackForm() {
  const [type, setType] = useState('idea');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  return <form onSubmit={event => { event.preventDefault(); setSent(false); startTransition(async () => { const result = await submitFeedback({ type, message }); if (result.success) { setMessage(''); setSent(true); } }); }} className="mt-4 text-start">
    <label className="block text-xs font-bold text-slate-700">Feedback type<select value={type} onChange={event => setType(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="bug">Bug</option><option value="idea">Idea</option><option value="confusing">Something confusing</option><option value="other">Other</option></select></label>
    <label className="mt-4 block text-xs font-bold text-slate-700">Message<textarea required maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Tell us what would make MYRQO better…" /></label>
    <button disabled={pending} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"><Send size={14} />{pending ? 'Sending…' : 'Send feedback'}</button>
    {sent && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600"><MessageSquare size={14} />Thanks—your feedback was sent.</p>}
  </form>;
}
