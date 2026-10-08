import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getLocale } from '@/lib/i18n/get-locale';
import { dirFor } from '@/lib/i18n/locale';
import { LocaleProvider } from '@/components/locale-provider';
export const metadata: Metadata = { title: {default:'Myrqo — Know Before You’re Charged',template:'%s · Myrqo'}, description:'Track subscriptions, renewal dates and recurring payments in one clear place with Myrqo.', metadataBase:new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), alternates:{canonical:'/'}, openGraph:{title:'Myrqo — Know Before You’re Charged',description:'Track subscriptions, renewal dates and recurring payments in one clear place with Myrqo.',type:'website',siteName:'Myrqo'}, twitter:{card:'summary_large_image',title:'Myrqo — Know Before You’re Charged',description:'Track subscriptions, renewal dates and recurring payments in one clear place with Myrqo.'}, manifest:'/manifest.webmanifest', appleWebApp:{capable:true,title:'Myrqo',statusBarStyle:'black-translucent'},icons:{icon:'/icons/myrqo-32.png',shortcut:'/icons/myrqo-32.png',apple:'/icons/myrqo-180.png'} };
export const viewport: Viewport = { themeColor:'#11183F', width:'device-width', initialScale:1 };
export default async function RootLayout({children}:{children:React.ReactNode}){
  const locale = await getLocale();
  return <html lang={locale} dir={dirFor(locale)} suppressHydrationWarning><body><LocaleProvider locale={locale}>{children}</LocaleProvider></body></html>;
}
