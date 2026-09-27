import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getLocale } from '@/lib/i18n/get-locale';
import { dirFor } from '@/lib/i18n/locale';
import { LocaleProvider } from '@/components/locale-provider';
export const metadata: Metadata = { title: {default:'MYRQO — Know Before You’re Charged',template:'%s · MYRQO'}, description:'Track subscriptions, renewal dates and recurring payments in one clear place with MYRQO.', metadataBase:new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), alternates:{canonical:'/'}, openGraph:{title:'MYRQO — Know Before You’re Charged',description:'Track subscriptions, renewal dates and recurring payments in one clear place with MYRQO.',type:'website',siteName:'MYRQO'}, twitter:{card:'summary_large_image',title:'MYRQO — Know Before You’re Charged',description:'Track subscriptions, renewal dates and recurring payments in one clear place with MYRQO.'}, manifest:'/manifest.webmanifest', appleWebApp:{capable:true,title:'MYRQO',statusBarStyle:'default'},icons:{icon:'/brand/myrqo-mark-new.png',shortcut:'/brand/myrqo-mark-new.png',apple:'/brand/myrqo-mark-new.png'} };
export const viewport: Viewport = { themeColor:'#2563EB', width:'device-width', initialScale:1 };
export default async function RootLayout({children}:{children:React.ReactNode}){
  const locale = await getLocale();
  return <html lang={locale} dir={dirFor(locale)} suppressHydrationWarning><body><LocaleProvider locale={locale}>{children}</LocaleProvider></body></html>;
}
