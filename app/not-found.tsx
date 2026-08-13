import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@goalspace/ui';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-9xl font-extrabold tracking-widest text-primary">404</h1>
        <div className="absolute rotate-12 rounded bg-primary px-2 text-sm text-white">
          Page Not Found
        </div>
        <div className="mt-8">
          <p className="mb-8 text-2xl font-semibold md:text-3xl">
            Oops! The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/">
            <Button className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </Suspense>
  );
}
