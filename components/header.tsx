'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  {
    href: '/',
    label: 'Simple Upload',
  },
  {
    href: '/multipart-file-upload',
    label: 'Multi Upload',
  },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <div className='flex items-center gap-5 text-sky-500'>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'text-2xl font-bold',
            pathname === link.href && 'underline'
          )}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
