import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function Page() {
  const t = getDictionary(await getLocale()).checkEmail;
  return (
    <AuthShell mode="signup">
      <div className="flex flex-1 flex-col text-center">
        <span className="mx-auto mt-20 grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-200 lg:mt-0"><MailCheck size={48} /></span>
        <h1 className="mt-9 text-[30px] font-bold tracking-tight">{t.title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-6 text-slate-500">{t.desc}</p>
        <Link href="/login" className="mt-auto flex min-h-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-700 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-blue-200 lg:mt-12">{t.signIn}</Link>
      </div>
    </AuthShell>
  );
}
