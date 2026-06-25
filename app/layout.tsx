import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DentFlow HQ',
  description:
    'Modern AI workspace for treatment planning and dental team collaboration.'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
