import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/header";

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cafe",
  description: "Cà phê thơm ngon, những khoảnh khắc thật trọn vẹn.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", figtree.variable)}
    >
      <body className="min-h-full flex flex-col">
        <Suspense
          fallback={
            <header className="h-[65px] border-b bg-card" aria-hidden="true" />
          }
        >
          <Header />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
