import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CreditCard, ReceiptText, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/subscriptions";
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import type { CommitmentPayment, Subscription } from "@/types/database";

export default async function PaymentDetailsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data } = await supabase.from("commitment_payments").select("*").eq("id", params.id).eq("user_id", user.id).maybeSingle();
  if (!data) notFound();
  const payment = data as CommitmentPayment;
  const { data: subscriptionData } = await supabase.from("subscriptions").select("*").eq("id", payment.subscription_id).eq("user_id", user.id).maybeSingle();
  const subscription = subscriptionData as Subscription | null;
  const date = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(`${value}T12:00:00`)) : "—";

  return <div className="mx-auto max-w-4xl pb-16">
    <Link href="/payments" className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"><ArrowLeft size={16}/>Payment history</Link>
    <section className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,.06)]">
      <div className="border-b border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_100%)] p-6 text-slate-950 sm:p-8">
        <div className="flex items-center gap-4">{subscription ? <ServiceLogo name={subscription.service_name} className="size-14 rounded-2xl"/> : <span className="grid size-14 place-items-center rounded-2xl bg-white text-blue-600 ring-1 ring-blue-100"><ReceiptText/></span>}<div><p className="text-sm font-semibold text-blue-700">Payment receipt</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{subscription?.service_name ?? "Deleted commitment"}</h1></div></div>
        <p className="mt-8 text-4xl font-black tracking-tight">{formatMoney(Number(payment.amount), payment.currency)}</p>
        <p className="mt-1 text-sm text-slate-500">Recorded on {date(payment.paid_at)}</p>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        <Detail icon={CalendarDays} label="Paid on" value={date(payment.paid_at)}/>
        <Detail icon={CalendarDays} label="Due period" value={date(payment.due_date)}/>
        <Detail icon={CreditCard} label="Currency" value={payment.currency}/>
        <Detail icon={Tag} label="Type" value={subscription?.commitment_type ?? "—"}/>
      </div>
      {payment.note && <div className="mx-5 mb-5 rounded-2xl bg-slate-50 p-5 sm:mx-6 sm:mb-6"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Note</p><p className="mt-2 text-sm leading-6 text-slate-700">{payment.note}</p></div>}
      {subscription && <div className="border-t border-slate-100 p-5 sm:p-6"><Link href={`/subscriptions/${subscription.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">Open commitment</Link></div>}
    </section>
  </div>;
}

function Detail({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={17}/></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div></div>;
}
