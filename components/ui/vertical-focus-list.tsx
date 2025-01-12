"use client"

import { useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Check } from 'lucide-react'

interface Item {
  id: number
  title: string
  description: string
  completed?: boolean
}

interface FocusListProps {
  items: Item[]
  focusedIndex: number
}

export default function FocusList({ items, focusedIndex }: FocusListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [focusedIndex])

  return (
    <div
      ref={containerRef}
      className="relative flex max-h-[600px] w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-2"
      role="list"
      aria-label="Vertical progress list"
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`relative ${
            item.completed ? "before:absolute before:inset-0 before:z-10 before:backdrop-blur-[2px]" : ""
          }`}
        >
          <Card
            ref={(el) => (itemRefs.current[index] = el)}
            className={`relative transition-all duration-300
              ${
                index === focusedIndex
                  ? "scale-105 border-primary bg-primary/5 shadow-lg"
                  : index < focusedIndex
                  ? "border-muted bg-muted/50"
                  : "opacity-60"
              }
              ${item.completed ? "border-muted" : ""}`}
            role="listitem"
            aria-current={index === focusedIndex ? "true" : "false"}
          >
            <div className="flex items-start gap-4 p-6">
              <div className="relative">
                <div
                  className={`relative z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2
                  ${
                    item.completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : index === focusedIndex
                      ? "border-primary"
                      : "border-muted-foreground"
                  }`}
                >
                  {item.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm">{item.id}</span>
                  )}
                </div>
                {index < items.length - 1 && (
                  <div
                    className={`absolute left-1/2 top-8 h-[calc(2rem+2px)] w-0.5 -translate-x-1/2
                    ${
                      index < focusedIndex
                        ? "bg-primary"
                        : index === focusedIndex
                        ? "bg-gradient-to-b from-primary to-muted-foreground/20"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
              <div className="relative z-20 flex flex-col gap-1">
                <h3
                  className={`text-xl font-semibold
                  ${
                    item.completed
                      ? "text-muted-foreground"
                      : index === focusedIndex
                      ? "text-primary"
                      : ""
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`text-sm ${
                    item.completed || index < focusedIndex
                      ? "text-muted-foreground"
                      : ""
                  }`}
                >
                  {item.description}
                </p>
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}
