'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { createClient } from '@/lib/supabase/client';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setLoading(true);
    const supabase = createClient();
    const result = mode === 'login' ? await supabase.auth.signInWithPassword({ email: email.trim(), password }) : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    if (mode === 'signup' && !result.data.session) { router.push('/check-email'); return; }
    router.push('/dashboard'); router.refresh();
  }

  return <div className="flex min-h-screen w-full bg-white">
    <aside className="hidden w-96 shrink-0 flex-col justify-between bg-gradient-to-br from-blue-600 to-blue-800 p-10 lg:flex">
      <Brand inverse />
      <div><blockquote className="mb-4 text-lg font-medium leading-relaxed text-white/90">&ldquo;Mirqo gives me peace of mind. I always know what&apos;s renewing and when.&rdquo;</blockquote><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-xs font-bold text-white">SC</span><div><p className="text-sm font-semibold text-white">Sarah Chen</p><p className="text-xs text-white/60">Product Designer</p></div></div></div>
      <div className="flex gap-1">{Array.from({ length: 5 }, (_, index) => <span key={index} className="h-1 flex-1 rounded-full bg-white/30" />)}</div>
    </aside>
    <main className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16"><div className="w-full max-w-sm">
      <div className="mb-8 lg:hidden"><Brand /></div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-950">Welcome back</h1><p className="mb-8 mt-1 text-sm text-slate-500">Sign in to your Mirqo account</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="auth-input pl-10" /></div></Field>
        <div><Field label="Password"><div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required minLength={6} autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="auth-input px-10" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></Field><div className="mt-1.5 flex justify-end"><Link href="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">Forgot password?</Link></div></div>
        {error && <p role="alert" className="flex gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="shrink-0" />{error}</p>}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:opacity-60">{loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign in'}</button>
      </form>
      <div className="relative my-5"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">or continue with</span></div></div>
      <button type="button" disabled title="Google sign-in is not enabled yet" className="w-full cursor-not-allowed rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-400 opacity-70">Continue with Google</button>
      <p className="mt-6 text-center text-sm text-slate-500">Don&apos;t have an account? <Link href="/signup" className="font-semibold text-blue-600 hover:underline">Sign up free</Link></p>
    </div></main>
    <style jsx>{`.auth-input{width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:12px 16px;font-size:14px;color:#0f172a;outline:none}.auth-input:focus{border-color:#2563eb;background:white;box-shadow:0 0 0 3px rgba(37,99,235,.15)}`}</style>
  </div>;
}

function Brand({ inverse = false }: { inverse?: boolean }) { return <Logo compact href="/" inverse={inverse} />; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">{label}{children}</label>; }
