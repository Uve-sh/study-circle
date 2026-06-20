import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNavigation from "@/components/BottomNavigation";
import FocusTimer from "@/components/FocusTimer";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Study Circle",
  description: "Accountability tracking for study groups",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Study Circle",
  },
  formatDetection: { telephone: false },
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let theme = 'dark';
  if (user) {
    const { data: settings } = await supabase.from('user_settings').select('theme').eq('user_id', user.id).single();
    if (settings?.theme) {
      theme = settings.theme;
    }
  }

  return (
    <html lang="en" className={theme}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="mobile-container">
          <main className="min-h-full pb-20">
            {children}
          </main>
          <FocusTimer userId={user?.id ?? null} />
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
