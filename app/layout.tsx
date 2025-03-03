import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/header';

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
      <body className='min-h-dvh w-full max-w-5xl flex flex-col mx-auto items-center'>
        <Header />
        {children}
      </body>
    </html>
  );
}
