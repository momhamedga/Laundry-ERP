import type { Metadata } from "next";
import { Cairo, Geist_Mono } from "next/font/google";
import { APP_NAME, APP_NAME_AR } from "@/constants/config";
import { Providers } from "./providers";
import "@/styles/globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME_AR} | ${APP_NAME}`,
    template: `%s | ${APP_NAME}`,
  },
  description: "نظام إدارة المغاسل الاحترافي - لوحة التحكم",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
