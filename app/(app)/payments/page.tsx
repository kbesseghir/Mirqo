import { createClient } from "@/lib/supabase/server";
import { PaymentHistoryView } from "@/components/payments/payment-history-view";
import type { CommitmentPayment, Subscription } from "@/types/database";

export default async function Page() {
  const supabase=await createClient();
  const [{data:payments},{data:subscriptions}]=await Promise.all([
    supabase.from("commitment_payments").select("*").order("paid_at",{ascending:false}).order("created_at",{ascending:false}),
    supabase.from("subscriptions").select("*")
  ]);
  return <PaymentHistoryView payments={(payments??[]) as CommitmentPayment[]} subscriptions={(subscriptions??[]) as Subscription[]}/>;
}
