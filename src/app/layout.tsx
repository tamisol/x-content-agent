import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "X Content Agent — AI posts for crypto natives",
  description:
    "Generate X posts, replies, quote tweets and threads in your own voice. Built for Web3 and crypto users.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-zinc-950 font-sans text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
