import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "MYT - Design & Sell Custom T-Shirts",
  description:
    "Create AI-generated t-shirt designs and sell them on the MYT marketplace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-primary font-sans">
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} MYT. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
