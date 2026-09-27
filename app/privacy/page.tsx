import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "سياسة الخصوصية" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10" dir="rtl">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
        <ArrowLeft size={16} className="rotate-180" /> العودة إلى الرئيسية
      </Link>

      <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>مسودة أولية:</strong> هذا النص مسودة تقنية لتوضيح ما يجمعه التطبيق وكيف يُستخدم. يجب مراجعته من قِبل محامٍ مختص قبل اعتماده كنص قانوني نهائي أو نشره للمستخدمين الفعليين.
      </div>

      <h1 className="text-2xl font-bold tracking-tight">سياسة الخصوصية</h1>
      <p className="mt-2 text-sm text-slate-500">آخر تحديث: 9 أغسطس 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-7 text-slate-700">
        <section>
          <h2 className="text-base font-bold text-slate-950">1. من نحن</h2>
          <p className="mt-2">
            Mirqo تطبيق لتتبع الاشتراكات المتكررة ومواعيد تجديدها. هذه السياسة توضح البيانات التي نجمعها منك، وسبب جمعها، وكيف نحميها.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">2. البيانات التي نجمعها</h2>
          <ul className="mt-2 list-inside list-disc space-y-2">
            <li><strong>بيانات الحساب:</strong> البريد الإلكتروني والاسم الذي تدخله عند إنشاء الحساب، عبر مزوّد المصادقة Supabase.</li>
            <li><strong>بيانات الاشتراكات:</strong> اسم الخدمة، المبلغ، العملة، تاريخ التجديد، ودورة الفوترة التي تُدخلها أو تُكتشف تلقائيًا.</li>
            <li><strong>نص أو لقطات الشاشة للكشف التلقائي:</strong> عند استخدام ميزة الكشف الذكي، يتم تحليل النص المُلصق أو لقطة الشاشة <strong>داخل متصفحك مباشرة</strong> باستخدام مكتبة OCR محلية — لا تُرفع الصورة إلى خوادمنا ولا تُخزَّن؛ فقط البيانات التي تختار حفظها كاشتراك (اسم الخدمة، المبلغ، التاريخ) تُرسل وتُخزَّن.</li>
            <li><strong>ربط تقويم Google (اختياري):</strong> إذا فعّلت المزامنة، نخزّن رموز الوصول (access/refresh tokens) بشكل مشفّر لإنشاء أحداث التجديد في تقويمك. يمكنك إلغاء الربط في أي وقت.</li>
            <li><strong>بيانات الفوترة (عند تفعيلها):</strong> تُعالَج المدفوعات عبر Stripe؛ نحن لا نرى أو نخزّن بيانات بطاقتك البنكية مباشرة.</li>
            <li><strong>بيانات استخدام مجهولة نسبيًا:</strong> أحداث مثل إنشاء حساب أو إضافة اشتراك، لفهم كيفية استخدام التطبيق وتحسينه.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">3. كيف نستخدم بياناتك</h2>
          <p className="mt-2">
            نستخدم بياناتك فقط لتشغيل التطبيق: عرض اشتراكاتك، إرسال تذكيرات التجديد داخل التطبيق، مزامنة تقويم Google عند تفعيلها، معالجة الفوترة عند تفعيلها، وتحسين المنتج بناءً على أنماط الاستخدام. لا نبيع بياناتك لأي طرف ثالث.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">4. مع من نشارك البيانات</h2>
          <ul className="mt-2 list-inside list-disc space-y-2">
            <li><strong>Supabase:</strong> استضافة قاعدة البيانات والمصادقة.</li>
            <li><strong>Google:</strong> فقط إذا فعّلت مزامنة التقويم، ووفق أذونات Google الخاصة بك.</li>
            <li><strong>Stripe:</strong> فقط عند تفعيل الفوترة، لمعالجة الدفع.</li>
          </ul>
          <p className="mt-2">لا تُشارك بياناتك مع أي جهة أخرى دون إذنك.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">5. أمان البيانات</h2>
          <p className="mt-2">
            نطبّق التحكم في الوصول على مستوى قاعدة البيانات (Row Level Security) بحيث لا يمكن لأي مستخدم رؤية بيانات مستخدم آخر، ونشفّر رموز ربط تقويم Google قبل تخزينها.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">6. حقوقك</h2>
          <p className="mt-2">
            يمكنك حذف اشتراكاتك أو حسابك في أي وقت من إعدادات التطبيق، أو بالتواصل معنا. عند حذف الحساب، تُحذف بياناتك الشخصية والمرتبطة به.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">7. تواصل معنا</h2>
          <p className="mt-2">لأي استفسار حول هذه السياسة، راسلنا عبر البريد الإلكتروني المذكور في صفحة التغذية الراجعة داخل التطبيق.</p>
        </section>
      </div>
    </main>
  );
}
