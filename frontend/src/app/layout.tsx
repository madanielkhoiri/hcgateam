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
    icon: '/logos/Logo%20PPA%20Official.png',
    shortcut: '/logos/Logo%20PPA%20Official.png',
    apple: '/logos/Logo%20PPA%20Official.png',
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



