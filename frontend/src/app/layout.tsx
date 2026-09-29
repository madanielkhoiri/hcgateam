import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HCGA CONNECT',
  description: 'HCGA CONNECT',
  icons: {
    icon: '/logos/Logo_PPA_Official_nw.png',
    shortcut: '/logos/Logo_PPA_Official_nw.png',
    apple: '/logos/Logo_PPA_Official_nw.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}


