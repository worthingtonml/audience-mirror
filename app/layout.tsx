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

// app/layout.tsx
// app/layout.tsx
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full w-full overflow-x-clip">
      <body className="h-full w-full overflow-x-clip antialiased">
        <div id="__page" className="isolate min-h-dvh w-[100svw] overflow-x-clip">
          {children}
        </div>
      </body>
    </html>
  );
}
