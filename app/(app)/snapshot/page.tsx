import { createClient } from "@/lib/supabase/server";
import { MonthlySnapshotCard, type SnapshotEntry } from "@/components/dashboard/monthly-snapshot-card";

export default async function SnapshotPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = await createClient();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month ?? "") ? searchParams.month! : currentMonth;
  const start = `${month}-01`;
  const next = new Date(`${start}T12:00:00`);
  next.setMonth(next.getMonth() + 1);
  const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: profile } = await supabase.from("profiles").select("preferred_currency").maybeSingle();
  const currency = profile?.preferred_currency ?? "USD";
  const [incomeResult, spendingResult, commitmentsResult, paymentsResult] = await Promise.all([
    supabase.from("monthly_income").select("amount").eq("month", start).eq("currency", currency).maybeSingle(),
    supabase.from("spending_entries").select("id,amount,currency,category,spent_at,note").eq("currency", currency).gte("spent_at", start).lt("spent_at", end).order("spent_at", { ascending: false }),
    supabase.from("subscriptions").select("id,amount,billing_cycle,billing_interval_months,commitment_type,debt_direction").eq("currency", currency).in("status", ["active", "trial"]),
    supabase.from("commitment_payments").select("amount,subscription_id").eq("currency",currency).gte("paid_at",start).lt("paid_at",end),
  ]);
  const outgoingCommitments=(commitmentsResult.data??[]).filter(row=>row.commitment_type!=="debt"||row.debt_direction!=="owed_to_me");
  const outgoingIds=new Set(outgoingCommitments.map(row=>row.id));
  const recurring = outgoingCommitments.reduce((sum, row) => sum + Number(row.amount) / (row.billing_cycle === "yearly" ? 12 : row.billing_interval_months || 1), 0);
  const actualPaid = (paymentsResult.data ?? []).filter(row=>outgoingIds.has(row.subscription_id)).reduce((sum,row)=>sum+Number(row.amount),0);
  const loadError = incomeResult.error || spendingResult.error || commitmentsResult.error || paymentsResult.error
    ? "Some amounts couldn't be loaded. Please refresh before relying on this snapshot." : undefined;
  return <MonthlySnapshotCard key={month} currency={currency} income={Number(incomeResult.data?.amount ?? 0)}
    spending={(spendingResult.data ?? []) as SnapshotEntry[]} recurring={recurring} actualPaid={actualPaid} selectedMonth={month} loadError={loadError} />;
}
