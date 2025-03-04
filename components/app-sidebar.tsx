"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, useMotionValueEvent, useScroll } from "framer-motion"
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
  BookOpen,
  Book,
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

interface NavItemProps {
  label?: string;
  href: string;
  icon: React.ReactNode;
  color?: string;
  onClick?: () => void;
  className?: string;
  state?: 'default' | 'active';
}

// Add these new style variants above the AppSidebar component
const sidebarVariants = cva(
  "fixed left-0 top-0 z-40 h-screen bg-background/95 backdrop-blur-lg border-r border-border/50",
  {
    variants: {
      expanded: {
        true: "shadow-xl",
        false: "shadow-sm"
      },
      mobile: {
        true: "w-full md:w-auto"
      }
    },
    compoundVariants: [
      {
        expanded: false,
        mobile: true,
        class: "w-16"
      }
    ]
  }
)

const navItemVariants = cva(
  "flex items-center transition-all duration-200 rounded-lg group",
  {
    variants: {
      size: {
        compact: "h-10 w-10 p-2 justify-center",
        default: "w-full px-3 py-2.5 justify-start"
      },
      state: {
        default: "hover:bg-accent/50 focus:bg-accent/30",
        active: "bg-accent/80 hover:bg-accent/90 text-primary-foreground"
      }
    },
    defaultVariants: {
      size: "default",
      state: "default"
    }
  }
)

export function AppSidebar({ goals, onGoalSelect, onCreateGoal, initialGoalId, children, className, ...props }: AppSidebarProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [open, setOpen] = useState(!isMobile)
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { spaces } = useSpaceStore()
  const [activeGoal, setActiveGoal] = useState<Goal | undefined>(
    goals.find(g => g.id === initialGoalId) || goals[0]
  )

  const isExpanded = open || isHovered
  const hasMultipleGoals = goals.length > 1

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setOpen(false)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleGoalSelect = (goal: Goal) => {
    setActiveGoal(goal)
    onGoalSelect(goal)
  }

  const filteredSpaces = useMemo(
    () => spaces.filter(space => activeGoal?.spaces?.includes(space.id) || false),
    [spaces, activeGoal?.spaces]
  )

  const bottomLinks = useMemo(() => [
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
      className: 'hover:bg-destructive/20 text-destructive'
    },
    {
      label: theme === 'light' ? 'Dark Mode' : 'Light Mode',
      href: '#',
      icon: theme === 'light' ? <Moon className="h-5 w-5 flex-shrink-0" /> : <Sun className="h-5 w-5 flex-shrink-0" />,
      onClick: () => setTheme(theme === 'light' ? 'dark' : 'light'),
      className: 'dark:text-amber-400 text-slate-800'
    },
    {
      title: 'Blog',
      href: '/blog',
      icon: <Book className="h-5 w-5" />,
      variant: 'ghost',
    },
  ], [theme, router])

  return (
    <div className="flex min-h-screen">
      <SidebarProvider>
        <motion.div
          className={sidebarVariants({ expanded: isExpanded, mobile: isMobile })}
          onMouseEnter={() => !isMobile && !open && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          animate={{
            width: isMobile ? (open ? '100%' : 72) : isExpanded ? 280 : 72
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Sidebar className="h-full flex flex-col" {...props}>
            <SidebarHeader>
              <div className="flex items-center justify-between px-4 py-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:bg-accent/50"
                  onClick={() => setOpen(!open)}
                >
                  {open ? <ChevronLeft /> : <ChevronRight />}
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </div>
            </SidebarHeader>

            <SidebarContent className="flex-1 space-y-6 px-2 py-4">
              {/* Goal Switcher Section */}
              <div className="mb-4">
                <GoalSwitcher
                  goals={goals}
                  onGoalSelect={handleGoalSelect}
                  onCreateGoal={onCreateGoal}
                  initialGoalId={activeGoal?.id}
                />
              </div>

              {/* Main Navigation */}
              <div className="space-y-1">
                <NavItem
                  label={isExpanded ? "Dashboard" : ""}
                  href="/dashboard"
                  icon={<LayoutDashboard className="h-5 w-5 text-foreground/80" />}
                  state="active"
                />
                <NavItem
                  label={isExpanded ? "Knowledge Base" : ""}
                  href="/knowledge-base"
                  icon={<BookOpen className="h-5 w-5 text-foreground/80" />}
                  state="active"
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
                        label={isExpanded ? space.title : ""}
                        href={`/space/${space.id}`}
                        color={space.space_color?.main}
                        icon={
                          <div className="relative">
                            {space.category === "learning" ? (
                              <Brain className="h-5 w-5" />
                            ) : (
                              <Target className="h-5 w-5" />
                            )}
                            {!isExpanded && (
                              <div 
                                className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-background ring-1 ring-foreground/20"
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
            <SidebarFooter className="border-t border-border/30 bg-background/80 backdrop-blur-lg">
              <div className="space-y-1 px-2 py-3">
                {bottomLinks.map((link) => (
                  <NavItem
                    key={link.label}
                    {...link}
                    label={isExpanded ? link.label : ""}
                    icon={React.cloneElement(link.icon, {
                      className: cn(link.icon.props.className, "text-foreground/80")
                    })}
                    className={link.className}
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
          marginLeft: isMobile ? (open ? "100%" : "72px") : isExpanded ? "280px" : "72px"
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  )
}

function NavItem({ label, href, icon, color, onClick, className, state }: NavItemProps) {
  const router = useRouter()
  const dynamicStyle = color ? {
    '--bg-color': `${color}1A`,
    '--active-color': `${color}33`,
    '--text-color': color,
  } : undefined

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    onClick?.() || (href !== "#" && router.push(href))
  }

  return (
    <motion.div whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.95 }}>
      <Button
        variant="ghost"
        className={navItemVariants({
          size: label ? "default" : "compact",
          state: state || "default",
          className: cn(
            "group",
            color && label && "bg-[var(--bg-color)] hover:bg-[var(--active-color)]",
            color && "text-[var(--text-color)]",
            className
          )
        })}
        style={dynamicStyle as React.CSSProperties}
        onClick={handleClick}
      >
        <span className={cn("transition-colors", color && "text-[var(--text-color)]")}>
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