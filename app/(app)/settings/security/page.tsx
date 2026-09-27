import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function Page() {
  const t = getDictionary(await getLocale()).security;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");
  return (
    <div className="mx-auto max-w-2xl">
      <header className="relative text-center">
        <Link href="/settings" aria-label={t.backToAccount} className="absolute start-0 top-1 grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><ArrowLeft size={21} className="rtl:rotate-180" /></Link>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
      </header>
      <ChangePasswordForm email={user.email} />
    </div>
  );
}
