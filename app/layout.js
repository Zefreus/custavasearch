import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { generateMetadata as genMeta } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'] });

export const metadata = genMeta({
  title: 'Custava Search - Busca de Preços NF-e',
  description: 'Portal público de busca de preços baseado em notas fiscais eletrônicas. Compare preços de produtos, veja histórico completo e encontre as melhores ofertas do mercado.',
  keywords: ['busca de preços', 'comparador de preços', 'NF-e', 'nota fiscal', 'melhor preço', 'histórico de preços']
});

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#9333ea" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
