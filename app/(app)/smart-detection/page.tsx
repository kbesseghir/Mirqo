import { redirect } from "next/navigation";

export default function Page({
  searchParams,
}: {
  searchParams: { method?: string };
}) {
  redirect(
    searchParams.method === "email"
      ? "/subscriptions/new?method=paste"
      : "/subscriptions/new?method=scan",
  );
}
