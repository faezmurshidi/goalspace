'use client';

import Link from 'next/link';
import { Brain } from 'lucide-react';

export function MainNav() {
  return (
    <div className="mr-4 flex">
      <Link href="/" className="flex items-center space-x-2">
        <Brain className="h-6 w-6" />
        <span className="font-bold">Mentor AI</span>
      </Link>
    </div>
  );
}