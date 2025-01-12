'use client';

import { useState } from 'react';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { LayoutDashboard, Target, Settings, LogOut, Moon, Sun, Brain } from 'lucide-react';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from "next-themes";
import { Button } from '@/components/ui/button';

interface Link {
  label: string;
  href: string;
  icon: JSX.Element;
  onClick?: () => void | Promise<void>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { spaces } = useSpaceStore();

  const mainLinks: Link[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
    },
  ];

  const bottomLinks: Link[] = [
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Logout",
      href: "#",
      icon: <LogOut className="h-5 w-5 flex-shrink-0" />,
      onClick: async () => {
        await signOut();
        router.push('/auth');
      },
    },
  ];

  return (
    <div className="h-screen flex bg-background">
      <motion.div
        onMouseEnter={() => !open && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{ width: open || isHovered ? 256 : 64 }}
        transition={{ duration: 0.2 }}
      >
        <Sidebar open={open || isHovered} setOpen={setOpen} className="h-screen">
          <SidebarBody className="flex flex-col h-full">
            <div className="flex-1">
              <Logo open={open || isHovered} />
              <div className="mt-8 flex flex-col gap-2">
                {mainLinks.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
              {spaces.length > 0 && (
                <>
                  <div className="mt-8 mb-4 px-2">
                    <h2 className={cn(
                      "text-xs uppercase text-muted-foreground font-semibold",
                      !(open || isHovered) && "sr-only"
                    )}>
                      Your Spaces
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2">
                    {spaces.map((space) => (
                      <SidebarLink
                        key={space.id}
                        link={{
                          label: space.title,
                          href: `/space/${space.id}`,
                          icon: <Brain className="h-5 w-5 flex-shrink-0" style={{ color: space.space_color?.main }} />,
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="border-t pt-4">
              <div className="flex flex-col gap-2">
                {bottomLinks.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="rounded-lg"
                  >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                  {(open || isHovered) && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm font-medium"
                    >
                      {theme === "light" ? "Dark" : "Light"} mode
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          </SidebarBody>
        </Sidebar>
      </motion.div>
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

const Logo = ({ open }: { open: boolean }) => {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="h-8 w-8 rounded-lg bg-primary" />
      {open && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-semibold text-xl"
        >
          GoalSpace
        </motion.span>
      )}
    </div>
  );
};
