import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: {default:'Mirqo',template:'%s · Mirqo'}, description:'Never miss a renewal again.', manifest:'/manifest.webmanifest', appleWebApp:{capable:true,title:'Mirqo',statusBarStyle:'default'},icons:{icon:'/brand/mirqo-mark-original.png',shortcut:'/brand/mirqo-mark-original.png',apple:'/icons/icon-192.png'} };
export const viewport: Viewport = { themeColor:'#2563EB', width:'device-width', initialScale:1 };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body>{children}</body></html>}
