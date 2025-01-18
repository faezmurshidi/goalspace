'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const sidebarMenuButtonVariants = cva(
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        default: 'h-9',
        sm: 'h-8',
        lg: 'h-10',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarMenuButtonVariants> {}

const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, size, ...props }, ref) => (
    <button ref={ref} className={cn(sidebarMenuButtonVariants({ size, className }))} {...props} />
  )
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

const SidebarMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('px-3', className)} {...props} />
);
SidebarMenu.displayName = 'SidebarMenu';

const SidebarMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('pb-1', className)} {...props} />
);
SidebarMenuItem.displayName = 'SidebarMenuItem';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, open = true, setOpen, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        {children}
      </div>
    );
  }
);
Sidebar.displayName = 'Sidebar';

const SidebarBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col', className)} {...props} />
  )
);
SidebarBody.displayName = 'SidebarBody';

interface SidebarLinkProps extends React.HTMLAttributes<HTMLAnchorElement> {
  link: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    onClick?: () => void | Promise<void>;
  };
  onClick?: () => void | Promise<void>;
}

const SidebarLink = React.forwardRef<HTMLAnchorElement, SidebarLinkProps>(
  ({ className, link, onClick, ...props }, ref) => {
    const handleClick = async (e: React.MouseEvent) => {
      if (link.onClick) {
        e.preventDefault();
        await link.onClick();
      }
      if (onClick) {
        await onClick();
      }
    };

    return (
      <a
        ref={ref}
        href={link.href}
        onClick={handleClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
          className
        )}
        {...props}
      >
        {link.icon}
        <span>{link.label}</span>
      </a>
    );
  }
);
SidebarLink.displayName = 'SidebarLink';

const SidebarContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
});

export const useSidebar = () => React.useContext(SidebarContext);

export const SidebarProvider = ({
  children,
  isMobile = false,
}: {
  children: React.ReactNode;
  isMobile?: boolean;
}) => {
  return <SidebarContext.Provider value={{ isMobile }}>{children}</SidebarContext.Provider>;
};

export { Sidebar, SidebarBody, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarLink };
