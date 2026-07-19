"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({
  className = "text-sm font-semibold text-slate-600 hover:text-red-600",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    if (loading) return;
    setLoading(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setLoading(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={signOut}
      className={"inline-flex items-center gap-2 disabled:opacity-60 " + className}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}