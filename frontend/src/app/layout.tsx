import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HCGA TEAM',
  description: 'Portal Internal HCGA TEAM',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
