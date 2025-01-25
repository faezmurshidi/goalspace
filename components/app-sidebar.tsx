"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  Target,
} from "lucide-react"
import { useTheme } from "next-themes"

import { GoalSwitcher } from "@/components/goal-switcher"
import type { Goal } from "@/components/goal-switcher"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { signOut } from "@/lib/auth"
import { useSpaceStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { space } from "postcss/lib/list"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  goals: Goal[]
  onGoalSelect: (goal: Goal) => void
  onCreateGoal: () => void
  initialGoalId?: string
  children: React.ReactNode
}

export function AppSidebar({ goals, onGoalSelect, onCreateGoal, initialGoalId, children, className, ...props }: AppSidebarProps) {
  const [open, setOpen] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { spaces } = useSpaceStore()
  const [activeGoal, setActiveGoal] = useState<Goal | undefined>(
    goals.find(g => g.id === initialGoalId) || goals[0]
  )

  const isExpanded = open || isHovered

  const handleGoalSelect = (goal: Goal) => {
    setActiveGoal(goal)
    onGoalSelect(goal)
  }

  const filteredSpaces = spaces.filter((space) => activeGoal?.spaces.includes(space.id))

  const bottomLinks = [
    {
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="h-5 w-5 flex-shrink-0" />,
    },
    {
      label: 'Logout',
      href: '#',
      icon: <LogOut className="h-5 w-5 flex-shrink-0" />,
      onClick: async () => {
        await signOut()
        router.push('/auth')
      },
    },
    {
      label: theme === 'light' ? 'Dark Mode' : 'Light Mode',
      href: '#',
      icon: theme === 'light' ? (
        <Moon className="h-5 w-5 flex-shrink-0" />
      ) : (
        <Sun className="h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => setTheme(theme === 'light' ? 'dark' : 'light'),
    },
  ]

  return (
    <div className="flex min-h-screen">
      <SidebarProvider>
        <motion.div
          className="fixed left-0 top-0 z-40 h-screen"
          onMouseEnter={() => !open && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          animate={{ width: isExpanded ? 256 : 64 }}
          transition={{ duration: 0.2 }}
        >
          <Sidebar collapsible="icon" className={cn("h-full border-r bg-background flex flex-col", className)} {...props}>
            <SidebarHeader>
              <div className="flex items-center justify-between px-4 py-4">
                {/* <Logo open={isExpanded} /> */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOpen(!open)}
                >
                  {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </div>
            </SidebarHeader>
            <SidebarContent className="flex-1">
              {/* Goal Switcher */}
              <div className={cn("mb-2", isExpanded ? "px-4" : "px-2")}>
                {isExpanded ? (
                  <GoalSwitcher
                    goals={goals}
                    onGoalSelect={handleGoalSelect}
                    onCreateGoal={onCreateGoal}
                    initialGoalId={activeGoal?.id}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    className="h-10 w-10 p-2"
                    onClick={() => setOpen(true)}
                  >
                    <Target className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Main Links (Dashboard) */}
              <div className={cn("mb-6", isExpanded ? "px-4" : "px-2")}>
                <NavItem
                  label={isExpanded ? "Dashboard" : ""}
                  href="/dashboard"
                  icon={<LayoutDashboard className="h-5 w-5 flex-shrink-0" />}
                />
              </div>

              {/* Goal Spaces */}
              {filteredSpaces.length > 0 && (
                <div className={cn("space-y-2", isExpanded ? "px-4" : "px-2")} >
                  {isExpanded && (
                    <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Goal Spaces
                    </h2>
                  )}
                  <div className="space-y-1">
                    {filteredSpaces.map((space) => (
                      <NavItem
                        key={space.id}
                        color={space.space_color?.main}
                        label={isExpanded ? space.title : ""}
                        href={`/space/${space.id}`}
                        icon={space.category === "learning" ? (
                          <Brain 
                            className="h-5 w-5 flex-shrink-0" 
                            style={{ color: space.space_color?.main }}
                          />
                        ) : (
                          <Target 
                            className="h-5 w-5 flex-shrink-0" 
                            style={{ color: space.space_color?.main }}
                          />
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </SidebarContent>
            <SidebarFooter>
              {/* Bottom Links */}
              <div className={cn("space-y-1 border-t pt-4", isExpanded ? "px-4" : "px-2")}>
                {bottomLinks.map((link) => (
                  <NavItem
                    key={link.href + link.label}
                    {...link}
                    label={isExpanded ? link.label : ""}
                  />
                ))}
              </div>
            </SidebarFooter>
          </Sidebar>
        </motion.div>
      </SidebarProvider>
      <motion.div
        className="flex-1"
        animate={{
          marginLeft: isExpanded ? "256px" : "64px",
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  )
}

function NavItem({ label, href, icon, color, onClick }: { label: string, href: string, icon: JSX.Element, color?: string, onClick?: () => void }) {
  const router = useRouter()

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (onClick) {
      await onClick()
    } else if (href !== "#") {
      router.push(href)
    }
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start hover:bg-muted",
        label ? "px-3 py-2" : "h-10 w-10 p-2",
        color ? color : "" // Fixed: changed from { color: color } to color
      )}
      onClick={handleClick}
    >
      {icon}
      {label && <span className="ml-2 flex-1 truncate">{label}</span>}
    </Button>
  )
}

function Logo({ open }: { open: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-primary" />
      {open && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-semibold"
        >
          GoalSpace
        </motion.span>
      )}
    </div>
  )
} 