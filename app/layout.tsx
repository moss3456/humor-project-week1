import type { Metadata } from "next";
import { Navigation } from "@/app/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Humor Department",
  description:
    "An AI-powered comedy lab where people submit images and vote on generated captions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Navigation />
        {children}
        <footer className="site-footer">
          <p>Humor Department · Powered by Next.js + Supabase</p>
          <p>Laugh responsibly.</p>
        </footer>
      </body>
    </html>
  );
}
