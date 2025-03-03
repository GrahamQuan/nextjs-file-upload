'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  {
    href: '/',
    label: 'Single File Upload',
  },
  {
    href: '/multi-files-upload',
    label: 'multi files upload',
  },
  {
    href: '/multipart-file-upload',
    label: 'multipart large file Upload',
  },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <div className='flex items-center gap-3 text-sky-500'>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'text-lg font-bold text-black bg-white py-1 px-2 rounded',
            pathname === link.href ? 'bg-sky-500 text-white' : 'opacity-60'
          )}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
