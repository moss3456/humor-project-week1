import type { Metadata } from "next";
import { Navigation } from "@/app/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Humor Department",
  description: "A Supabase-powered joke archive with a members-only green room.",
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
