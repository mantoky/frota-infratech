import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import PwaRegister from "@/components/PwaRegister";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestão de Frota Infratech",
  description: "Sistema de Gestão de Frota da Infratech.",
  keywords: ["Gestão de Frota", "Infratech", "Veículos"],
  authors: [{ name: "Infratech Team" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
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
  themeColor: "#002e4d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}
