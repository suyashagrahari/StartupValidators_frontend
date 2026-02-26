import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Does the World Need Your Startup?",
  description: "Validate your startup idea using real Twitter data — trend scans, demand checks, early adopters, and investors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} font-sans bg-[#080808] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
