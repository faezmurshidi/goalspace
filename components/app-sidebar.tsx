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
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

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
import { space } from "postcss/lib/list"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  goals: Goal[]
  onGoalSelect: (goal: Goal) => void
  onCreateGoal: () => void
  initialGoalId?: string
  children: React.ReactNode
}

// Add these new style variants above the AppSidebar component
const sidebarVariants = cva(
  "fixed left-0 top-0 z-40 h-screen bg-background/95 backdrop-blur-lg border-r border-border/50",
  {
    variants: {
      expanded: {
        true: "shadow-xl",
        false: "shadow-sm"
      }
    }
  }
)

const navItemVariants = cva(
  "flex items-center transition-all duration-200 hover:bg-accent/50 rounded-lg",
  {
    variants: {
      size: {
        compact: "h-10 w-10 p-2 justify-center",
        default: "w-full px-3 py-2.5 justify-start"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

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
          className={sidebarVariants({ expanded: isExpanded })}
          onMouseEnter={() => !open && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          animate={{ width: isExpanded ? 280 : 72 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Sidebar className="h-full flex flex-col" {...props}>
            <SidebarHeader>
              <div className="flex items-center justify-between px-4 py-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isExpanded ? 1 : 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/80" />
                  <span className="text-lg font-semibold tracking-tight">GoalSpace</span>
                </motion.div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:bg-accent/50"
                  onClick={() => setOpen(!open)}
                >
                  {open ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </div>
            </SidebarHeader>

            <SidebarContent className="flex-1 space-y-6 px-2 py-4">
              {/* Goal Switcher Section */}
              <div className="mb-4">
                {isExpanded ? (
                  <GoalSwitcher
                    goals={goals}
                    onGoalSelect={handleGoalSelect}
                    onCreateGoal={onCreateGoal}
                    initialGoalId={activeGoal?.id}
                  />
                ) : (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      className="h-11 w-11 p-2 hover:bg-accent/50"
                      onClick={() => setOpen(true)}
                    >
                      <Target className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Main Navigation */}
              <div className="space-y-1">
                <NavItem
                  label={isExpanded ? "Dashboard" : ""}
                  href="/dashboard"
                  icon={<LayoutDashboard className="h-5 w-5 text-foreground/80" />}
                />
              </div>

              {/* Goal Spaces Section */}
              {filteredSpaces.length > 0 && (
                <div className="space-y-2">
                  {isExpanded && (
                    <h2 className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Active Spaces
                    </h2>
                  )}
                  <div className="space-y-1">
                    {filteredSpaces.map((space) => (
                      <NavItem
                        key={space.id}
                        color={space.space_color?.main}
                        label={isExpanded ? space.title : ""}
                        href={`/space/${space.id}`}
                        icon={
                          <div className="relative">
                            {space.category === "learning" ? (
                              <Brain className="h-5 w-5" />
                            ) : (
                              <Target className="h-5 w-5" />
                            )}
                            {!isExpanded && (
                              <div 
                                className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-background"
                                style={{ backgroundColor: space.space_color?.main }}
                              />
                            )}
                          </div>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </SidebarContent>

            {/* Updated Footer Section */}
            <SidebarFooter className="border-t border-border/30">
              <div className="space-y-1 px-2 py-4">
                {bottomLinks.map((link) => (
                  <NavItem
                    key={link.href + link.label}
                    {...link}
                    label={isExpanded ? link.label : ""}
                    icon={React.cloneElement(link.icon, {
                      className: cn(link.icon.props.className, "text-foreground/80")
                    })}
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
          marginLeft: isExpanded ? "280px" : "72px",
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
    <motion.div whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.95 }}>
      <Button
        variant="ghost"
        className={navItemVariants({
          size: label ? "default" : "compact",
          className: cn(
            "group",
            color && label && `bg-[${color}/10] hover:bg-[${color}/20]`,
            color && `text-[${color}]`
          )
        })}
        onClick={handleClick}
      >
        <span className={cn("transition-colors", color && `text-[${color}]`)}>
          {icon}
        </span>
        {label && (
          <span className="ml-3 flex-1 truncate text-sm font-medium">
            {label}
          </span>
        )}
      </Button>
    </motion.div>
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