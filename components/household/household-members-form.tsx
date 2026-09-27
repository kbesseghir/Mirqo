"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { addHouseholdMember, removeHouseholdMember } from "@/features/household/actions/manage-household";
import { useLocale } from "@/components/locale-provider";
import { format } from "@/lib/i18n/format";
import type { HouseholdMember } from "@/types/database";

export function HouseholdMembersForm({ members }: { members: HouseholdMember[] }) {
  const router = useRouter();
  const { dict } = useLocale();
  const t = dict.household;
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adding) return;
    const form = event.currentTarget;
    setAdding(true);
    setError("");
    const result = await addHouseholdMember(new FormData(form));
    setAdding(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    form.reset();
    router.refresh();
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(format(t.confirmRemove, { name }))) return;
    setRemovingId(id);
    const result = await removeHouseholdMember(id);
    setRemovingId(null);
    if (!result.success) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <section className="mt-7 overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)] ring-1 ring-slate-200/60">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-sm font-bold">{t.addMember}</h2>
      </div>
      <form onSubmit={submit} className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto]">
        <input
          name="name"
          required
          maxLength={100}
          placeholder={t.namePlaceholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"
        />
        <input
          name="relation"
          maxLength={60}
          placeholder={t.relationPlaceholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"
        />
        <button
          disabled={adding}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60"
        >
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {adding ? t.adding : t.add}
        </button>
      </form>
      {error && <p role="alert" className="px-5 pb-3 text-xs text-red-600">{error}</p>}
      <div className="border-t border-slate-100">
        {members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Users className="text-slate-300" size={28} />
            <p className="text-sm text-slate-500">{t.noMembers}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white">
                  {member.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{member.name}</p>
                  {member.relation && <p className="truncate text-xs text-slate-500">{member.relation}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(member.id, member.name)}
                  disabled={removingId === member.id}
                  aria-label={t.remove}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  {removingId === member.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
