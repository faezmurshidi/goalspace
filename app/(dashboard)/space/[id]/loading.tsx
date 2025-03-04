import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function SpaceLoading() {
  return (
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-slate-900">
      {/* Header Skeleton */}
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-slate-200 bg-white backdrop-blur-lg shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto pl-[60px] lg:pl-[72px]">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center gap-5 w-full">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex flex-col gap-2 w-full">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout Skeleton */}
      <div className="grid h-[calc(100vh-4rem)] grid-cols-12 gap-6 px-6 pt-20">
        {/* Content Area Skeleton */}
        <div className="col-span-7 h-full overflow-y-auto pb-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
            
            <Card className="rounded-xl border p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-11/12" />
                <Skeleton className="h-6 w-10/12" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-9/12" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-10/12" />
                <Skeleton className="h-6 w-11/12" />
              </div>
            </Card>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="col-span-5 h-full">
          <div className="sticky top-[4rem] h-[calc(100vh-4rem)]">
            <Card className="flex h-full flex-col border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
              {/* Tabs Skeleton */}
              <div className="w-full border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50 p-3">
                <div className="flex gap-3">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>

              {/* Content Skeleton */}
              <div className="flex-1 p-4">
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>

              {/* Chat Skeleton */}
              <div className="h-[300px] border-t border-slate-200 dark:border-slate-800 p-4">
                <div className="flex flex-col h-full justify-end space-y-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-20 w-[80%] rounded-lg" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}