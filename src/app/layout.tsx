import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import PwaRegister from '@/components/PwaRegister';

// Inter auto-hospedada em vez de next/font/google.
//
// `next/font/google` baixa a fonte de fonts.googleapis.com em TEMPO DE BUILD.
// Isso transforma um servico externo em dependencia dura da esteira: se a rede
// do CI falhar, se houver proxy corporativo ou allowlist de rede, o build
// inteiro quebra com "Failed to fetch `Inter` from Google Fonts" - e nao ha
// nada no codigo para corrigir, so esperar a rede voltar.
//
// O arquivo aqui e exatamente o subset latin que o proprio next/font/google
// vinha baixando: fonte variavel de 100 a 900, 230 glifos, cobrindo todos os
// acentos de pt-BR e es (á ã ç é õ ú ñ ¿ ¡). 48 KB, um unico arquivo.
//
// Ganhos: build reprodutivel e offline, uma requisicao a menos no primeiro
// carregamento, e nenhum dado de usuario indo para servidores do Google -
// relevante para o cenario corporativo e para LGPD.
const inter = localFont({
  src: './fonts/inter-latin-variable.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Gestão de Frota Infratech',
  description: 'Sistema de Gestão de Frota da Infratech.',
  keywords: ['Gestão de Frota', 'Infratech', 'Veículos'],
  authors: [{ name: 'Infratech Team' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Gestão de Frota Infratech',
    description: 'Sistema de Gestão de Frota',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestão de Frota Infratech',
    description: 'Sistema de Gestão de Frota',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00594c',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}
