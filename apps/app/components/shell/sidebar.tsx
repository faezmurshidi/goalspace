'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Sheet, SheetContent, SheetTitle, cn, useIsMobile } from '@goalspace/ui';

/**
 * shadcn's sidebar, trimmed to what this product uses and reskinned.
 *
 * The structure is worth borrowing: a provider, a rail that collapses, a sheet
 * below the breakpoint. The skin is not — this app is built on hairline rules
 * and warm paper, not cards and neutral gray, so nothing here carries a
 * shadow, a radius, or a filled active state.
 *
 * Sub-menus, inputs, skeletons, and the floating/inset variants are omitted.
 * They are not in the design and an unused variant is a thing that rots.
 */

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used inside <SidebarProvider>');
  return context;
}

export function SidebarProvider({
  defaultOpen = true,
  onOpenChange,
  className,
  children,
}: {
  defaultOpen?: boolean;
  /** Called on every change so the host can persist it. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [open, setOpenState] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);

  const setOpen = React.useCallback(
    (next: boolean) => {
      setOpenState(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  // On mobile the sheet is the sidebar, so the same control has to drive it.
  const toggle = React.useCallback(() => {
    if (isMobile) setOpenMobile((previous) => !previous);
    else setOpen(!open);
  }, [isMobile, open, setOpen]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({ open, setOpen, toggle, isMobile, openMobile, setOpenMobile }),
    [open, setOpen, toggle, isMobile, openMobile]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div className={cn('flex min-h-svh w-full bg-paper', className)}>{children}</div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  label,
  className,
  children,
}: {
  /** Accessible name for the navigation landmark. Required, not optional. */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { isMobile, openMobile, setOpenMobile, open } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="w-72 border-r border-rule-strong bg-paper p-0 shadow-none"
        >
          {/* Radix requires a title for the dialog's accessible name. It is
              visually hidden because the sheet already shows the project. */}
          <SheetTitle className="sr-only">{label}</SheetTitle>
          <nav aria-label={label} className="flex h-full flex-col">
            {children}
          </nav>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <nav
      aria-label={label}
      data-state={open ? 'open' : 'collapsed'}
      className={cn(
        'sticky top-0 hidden h-svh shrink-0 flex-col border-r border-rule bg-paper md:flex',
        open ? 'w-64' : 'w-14',
        className
      )}
    >
      {children}
    </nav>
  );
}

export function SidebarHeader({ className, children }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex h-14 items-center border-b border-rule px-3', className)}>
      {children}
    </div>
  );
}

export function SidebarContent({ className, children }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1 overflow-y-auto py-3', className)}>{children}</div>;
}

export function SidebarGroup({ className, children }: React.ComponentProps<'div'>) {
  return <div className={cn('px-2 py-1', className)}>{children}</div>;
}

export function SidebarMenu({ className, children }: React.ComponentProps<'ul'>) {
  return <ul className={cn('flex flex-col gap-0.5', className)}>{children}</ul>;
}

export function SidebarMenuItem({ className, children }: React.ComponentProps<'li'>) {
  return <li className={cn('list-none', className)}>{children}</li>;
}

/**
 * One destination.
 *
 * Active state is a left rule in `oxide` plus a colour change — the existing
 * bottom-border idiom rotated 90°, not a filled pill. Never colour alone:
 * `aria-current` carries it for anyone who cannot see the edge.
 */
export const SidebarMenuButton = React.forwardRef<
  HTMLAnchorElement,
  {
    asChild?: boolean;
    isActive?: boolean;
    className?: string;
    children: React.ReactNode;
  } & React.ComponentPropsWithoutRef<'a'>
>(function SidebarMenuButton({ asChild, isActive, className, children, ...props }, ref) {
  const Component = asChild ? Slot : 'a';

  return (
    <Component
      ref={ref}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'label unstyled flex h-9 items-center gap-3 border-l-2 px-3 transition-colors',
        isActive
          ? 'border-oxide bg-paper-shade text-ink'
          : 'border-transparent text-ink-soft hover:bg-paper-shade hover:text-ink',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

export function SidebarTrigger({
  label,
  className,
}: {
  /** Accessible name. The control is an icon at every width. */
  label: string;
  className?: string;
}) {
  const { toggle } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className={cn(
        'label flex h-9 w-9 items-center justify-center border border-rule text-ink-soft transition-colors hover:bg-paper-shade hover:text-ink',
        className
      )}
    >
      <span aria-hidden="true">☰</span>
    </button>
  );
}
