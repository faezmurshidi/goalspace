'use client';

import { Sidebar } from '@/components/sidebar';
import { SiteHeader } from '@/components/site-header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="flex">
        <Sidebar className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" />
        <main className="flex-1 pt-16">
          <div className="container mx-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 