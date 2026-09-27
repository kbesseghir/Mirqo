import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ContactSupportButton } from "@/components/profile/contact-support-button";
import { FeedbackForm } from "@/components/feedback/feedback-form";

const feedbackUrl =
  process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim() ||
  "mailto:cert.learndz@gmail.com?subject=Mirqo%20beta%20feedback";
const feedbackEmail = feedbackUrl.startsWith("mailto:") ? feedbackUrl.slice(7).split("?")[0] : null;

export default async function Page() {
  const t = getDictionary(await getLocale()).support;
  const faqs = [
    [t.faq1Q, t.faq1A],
    [t.faq2Q, t.faq2A],
    [t.faq3Q, t.faq3A],
    [t.faq4Q, t.faq4A],
    [t.faq5Q, t.faq5A],
    [t.faq6Q, t.faq6A],
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <header className="relative text-center">
        <Link href="/settings" aria-label={t.backToAccount} className="absolute start-0 top-1 grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><ArrowLeft size={21} className="rtl:rotate-180" /></Link>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
      </header>

      <section className="mt-7 overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)] ring-1 ring-slate-200/60">
        <p className="px-5 pt-5 text-xs font-bold uppercase tracking-wider text-slate-400">{t.faqTitle}</p>
        <div className="mt-2 divide-y divide-slate-100">
          {faqs.map(([question, answer]) => (
            <div key={question} className="px-5 py-4">
              <p className="text-sm font-bold text-slate-900">{question}</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[18px] bg-white p-5 text-center shadow-[0_8px_24px_rgba(15,23,42,.05)] ring-1 ring-slate-200/60">
        <p className="text-sm font-bold">{t.contactTitle}</p>
        <p className="mt-1 text-xs text-slate-500">{t.contactDesc}</p>
        {feedbackEmail ? (
          <>
            <ContactSupportButton email={feedbackEmail} mailtoUrl={feedbackUrl} label={t.emailUs} copiedLabel={t.emailCopied} />
            <p className="mt-3 select-all text-xs text-slate-400">{feedbackEmail}</p>
          </>
        ) : (
          <a href={feedbackUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 to-indigo-500 px-5 text-sm font-bold text-white">
            <Mail size={16} />{t.emailUs}
          </a>
        )}
      </section>
      <section className="mt-5 rounded-[18px] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.05)] ring-1 ring-slate-200/60">
        <p className="text-sm font-bold">Help shape the beta</p>
        <p className="mt-1 text-xs text-slate-500">Send a bug, idea, or anything that feels confusing.</p>
        <FeedbackForm />
      </section>
    </div>
  );
}
