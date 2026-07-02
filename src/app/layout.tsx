import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestão de Frota Infratech",
  description: "Sistema de Gestão de Frota da Infratech.",
  keywords: ["Gestão de Frota", "Infratech", "Veículos"],
  authors: [{ name: "Infratech Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Gestão de Frota Infratech",
    description: "Sistema de Gestão de Frota",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gestão de Frota Infratech",
    description: "Sistema de Gestão de Frota",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
