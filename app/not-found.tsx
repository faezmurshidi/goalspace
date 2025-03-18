import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

export default function NotFound() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <h1 className="text-9xl font-extrabold tracking-widest text-primary">404</h1>
        <div className="bg-primary px-2 text-sm rounded rotate-12 absolute text-white">
          Page Not Found
        </div>
        <div className="mt-8">
          <p className="text-2xl font-semibold md:text-3xl mb-8">
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