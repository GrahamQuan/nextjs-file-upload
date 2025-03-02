import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'File Upload and Download',
  description: 'File Upload and Download',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className='dark' suppressHydrationWarning>
      <body className='antialiased'>{children}</body>
    </html>
  );
}
