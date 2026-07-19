import Link from "next/link";
import { ArrowLeft, ChevronRight, FileText, ImageUp, Mail } from "lucide-react";

const methods = [
  {
    href: "/subscriptions/new?method=manual",
    icon: FileText,
    title: "Add manually",
    text: "Enter the subscription details yourself.",
  },
  {
    href: "/smart-detection?method=email",
    icon: Mail,
    title: "Paste an email",
    text: "Extract details from a receipt or renewal email.",
  },
  {
    href: "/smart-detection?method=screenshot",
    icon: ImageUp,
    title: "Upload a screenshot",
    text: "Detect details from a PNG, JPG, or WebP image.",
  },
];

export function AddMethodPicker() {
  return (
    <div className="mx-auto max-w-lg pb-16">
      <header className="mb-9 flex items-center gap-3">
        <Link
          href="/subscriptions"
          aria-label="Go back"
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={17} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Add subscription</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Choose how you want to add it
          </p>
        </div>
      </header>
      <div className="mb-7">
        <h2 className="text-lg font-bold">How would you like to start?</h2>
        <p className="mt-1 text-sm text-slate-500">
          You will review everything before it is saved.
        </p>
      </div>
      <div className="space-y-3">
        {methods.map(({ href, icon: Icon, title, text }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950">
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {text}
              </span>
            </span>
            <ChevronRight
              size={17}
              className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
            />
          </Link>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Detection only prefills the form. Mirqo never saves without your
        confirmation.
      </p>
    </div>
  );
}
