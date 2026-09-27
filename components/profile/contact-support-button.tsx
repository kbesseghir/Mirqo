"use client";

import { useState } from "react";
import { Check, Mail } from "lucide-react";

export function ContactSupportButton({ email, mailtoUrl, label, copiedLabel }: {
  email: string;
  mailtoUrl: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API unavailable; the mailto href below still gets a chance to open a mail app.
    }
  }

  return (
    <a
      href={mailtoUrl}
      onClick={handleClick}
      className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 to-indigo-500 px-5 text-sm font-bold text-white"
    >
      {copied ? <Check size={16} /> : <Mail size={16} />}
      {copied ? copiedLabel : label}
    </a>
  );
}
