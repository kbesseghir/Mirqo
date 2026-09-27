import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "شروط الاستخدام" };

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10" dir="rtl">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
        <ArrowLeft size={16} className="rotate-180" /> العودة إلى الرئيسية
      </Link>

      <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>مسودة أولية:</strong> هذا النص مسودة تقنية أولية. يجب مراجعته من قِبل محامٍ مختص قبل اعتماده كنص قانوني نهائي أو نشره للمستخدمين الفعليين.
      </div>

      <h1 className="text-2xl font-bold tracking-tight">شروط الاستخدام</h1>
      <p className="mt-2 text-sm text-slate-500">آخر تحديث: 9 أغسطس 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-7 text-slate-700">
        <section>
          <h2 className="text-base font-bold text-slate-950">1. قبول الشروط</h2>
          <p className="mt-2">باستخدامك تطبيق Mirqo فإنك توافق على هذه الشروط. إذا كنت لا توافق، يرجى عدم استخدام التطبيق.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">2. وصف الخدمة</h2>
          <p className="mt-2">
            Mirqo أداة لتتبع الاشتراكات المتكررة ومواعيد تجديدها ومساعدتك على متابعة إنفاقك. حاليًا في نسخة تجريبية خاصة (بيتا)، وقد تتغير الميزات أو تتوقف مؤقتًا دون إشعار مسبق طويل.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">3. حسابك</h2>
          <p className="mt-2">أنت مسؤول عن الحفاظ على سرية بيانات دخولك، وعن دقة المعلومات التي تُدخلها (مثل مبالغ الاشتراكات ومواعيدها).</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">4. حدود الباقة المجانية</h2>
          <p className="mt-2">تدعم الباقة المجانية حتى 3 اشتراكات نشطة. الترقية إلى Pro تفتح تتبعًا غير محدود، وفق الشروط المعروضة داخل التطبيق وقت الترقية.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">5. دقة الكشف التلقائي</h2>
          <p className="mt-2">
            ميزة الكشف من النص أو لقطات الشاشة تعتمد على تقنية OCR وقواعد تحليل تقريبية، وقد لا تكون دقيقة دائمًا. راجع دائمًا التفاصيل المكتشفة (اسم الخدمة، المبلغ، التاريخ) قبل الحفظ.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">6. إخلاء مسؤولية</h2>
          <p className="mt-2">
            Mirqo أداة تنظيمية مساعدة ولا تُعد نصيحة مالية. نحن غير مسؤولين عن أي رسوم أو تجديدات فعلية تحدث في حساباتك الخارجية (البنك، الخدمات المشترك بها) بناءً على معلومات غير دقيقة تم إدخالها أو اكتشافها.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">7. إنهاء الحساب</h2>
          <p className="mt-2">يمكنك حذف حسابك في أي وقت. نحتفظ بحق تعليق أو إنهاء الحسابات التي تسيء استخدام الخدمة.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-950">8. التعديلات على الشروط</h2>
          <p className="mt-2">قد نحدّث هذه الشروط من وقت لآخر. سنُعلمك بالتغييرات الجوهرية عبر التطبيق أو البريد الإلكتروني.</p>
        </section>
      </div>
    </main>
  );
}
