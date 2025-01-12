"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

const SidebarContext = React.createContext<{ open: boolean }>({ open: true });

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  setOpen: (open: boolean) => void;
  children?: React.ReactNode;
}

export function Sidebar({ open, setOpen, className, children }: SidebarProps) {
  return (
    <SidebarContext.Provider value={{ open }}>
      <aside
        className={cn(
          "h-full relative border-r border-neutral-200 dark:border-neutral-700 bg-gray-100/40 dark:bg-neutral-800/40 backdrop-blur-xl",
          open ? "w-64" : "w-16",
          className
        )}
      >
        <button
          onClick={() => setOpen(!open)}
          className="h-6 w-6 absolute -right-3 top-5 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
        >
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            className="w-4 h-4 flex items-center justify-center"
          >
            <ChevronIcon />
          </motion.div>
        </button>
        {children}
      </aside>
    </SidebarContext.Provider>
  );
}

interface SidebarBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function SidebarBody({ className, children }: SidebarBodyProps) {
  return (
    <div
      className={cn(
        "h-full flex flex-col p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SidebarLinkProps {
  link: {
    label: string;
    href: string;
    icon: React.ReactNode;
    onClick?: () => void;
  };
}

export function SidebarLink({ link }: SidebarLinkProps) {
  const { open } = React.useContext(SidebarContext);

  return (
    <Link
      href={link.href}
      onClick={link.onClick}
      className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200 px-2 py-2 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
    >
      {link.icon}
      {open && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-medium whitespace-pre overflow-hidden"
        >
          {link.label}
        </motion.span>
      )}
    </Link>
  );
}

const ChevronIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-3 w-3"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
};
