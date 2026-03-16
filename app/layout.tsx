import type { Metadata } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-devanagari",
});

export const metadata: Metadata = {
  title: "मोदी चैटबॉट — Modi Chatbot",
  description:
    "A tone-aware chatbot responding in Hindi as Narendra Modi, with dynamic color-coded messages.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={noto.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
