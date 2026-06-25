import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DentFlow Workspace',
  description: 'Friendly workspace for treatment plan control teams'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
