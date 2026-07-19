'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { createClient } from '@/lib/supabase/client';

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const strength = password.length === 0 ? 0 : Math.min(4, Math.max(1, Math.floor(password.length / 3)));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const result = await createClient().auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${location.origin}/auth/callback`, data: { full_name: name.trim() } } });
    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    if (!result.data.session) { router.push('/check-email'); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return <div className="flex min-h-screen w-full bg-white">
    <aside className="hidden w-96 shrink-0 flex-col justify-between bg-gradient-to-br from-blue-600 to-blue-800 p-10 lg:flex">
      <Brand inverse />
      <div><blockquote className="mb-4 text-lg font-medium leading-relaxed text-white/90">&ldquo;I was paying for subscriptions I had completely forgotten about. Mirqo gave me control again.&rdquo;</blockquote><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-xs font-bold text-white">SC</span><div><p className="text-sm font-semibold text-white">Sarah Chen</p><p className="text-xs text-white/60">Product Designer</p></div></div></div>
      <div className="flex gap-1">{Array.from({ length: 5 }, (_, index) => <span key={index} className="h-1 flex-1 rounded-full bg-white/30" />)}</div>
    </aside>
    <main className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16"><div className="w-full max-w-sm">
      <div className="mb-8 lg:hidden"><Brand /></div>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1><p className="mb-8 mt-1 text-sm text-slate-500">Start tracking subscriptions for free - no card needed</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name"><input required autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Jordan Davis" className="auth-input" /></Field>
        <Field label="Email"><div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="auth-input pl-10" /></div></Field>
        <Field label="Password"><div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required minLength={6} autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Choose a strong password" className="auth-input px-10" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></Field>
        {password && <div className="flex gap-1" aria-label={`Password strength ${strength} of 4`}>{Array.from({ length: 4 }, (_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index < strength ? 'bg-emerald-400' : 'bg-slate-100'}`} />)}</div>}
        {error && <p role="alert" className="flex gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="shrink-0" />{error}</p>}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:opacity-60">{loading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : 'Create account'}</button>
      </form>
      <div className="relative my-5"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">or</span></div></div>
      <button type="button" disabled title="Google signup is not enabled yet" className="w-full cursor-not-allowed rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-400">Sign up with Google</button>
      <p className="mt-5 text-center text-xs text-slate-400">By creating an account you agree to our Terms and Privacy Policy.</p><p className="mt-3 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-blue-600">Sign in</Link></p>
    </div></main>
    <style jsx>{`.auth-input{width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:12px 16px;font-size:14px;outline:none}.auth-input:focus{border-color:#2563eb;background:white;box-shadow:0 0 0 3px rgba(37,99,235,.15)}`}</style>
  </div>;
}

function Brand({ inverse = false }: { inverse?: boolean }) { return <Logo compact href="/" inverse={inverse} />; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">{label}{children}</label>; }
