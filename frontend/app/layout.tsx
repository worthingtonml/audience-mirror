// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Audience Mirror",
  description: "Prescriptive campaigns",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Base text size + line-height */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased text-[1rem] leading-7 md:text-[1.0625rem]`}>
        {children}
      </body>
    </html>
  );
}


