"use client"

import { useEffect, useState } from "react"
import { Timer, Pause, Play, RotateCcw } from "lucide-react"

export default function DigitalClock() {
  const [time, setTime] = useState(new Date())
  const [isBlinking, setIsBlinking] = useState(true)
  const [isPomodoroMode, setIsPomodoroMode] = useState(false)
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60) // 25 minutes in seconds
  const [isBreak, setIsBreak] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    const blinkTimer = setInterval(() => {
      setIsBlinking((prev) => !prev)
    }, 1000)

    return () => {
      clearInterval(timer)
      clearInterval(blinkTimer)
    }
  }, [])

  // Pomodoro effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPomodoroMode && isRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            setIsBreak((prevBreak) => {
              const audio = new Audio("/notification.mp3")
              audio.play()
              return !prevBreak
            })
            return !isBreak ? 25 * 60 : 5 * 60
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPomodoroMode, isRunning, isBreak, pomodoroTime]) // Added pomodoroTime to dependencies

  const togglePomodoro = () => {
    if (!isPomodoroMode) {
      setPomodoroTime(25 * 60)
      setIsBreak(false)
    }
    setIsPomodoroMode(!isPomodoroMode)
    setIsRunning(false)
  }

  const resetPomodoro = () => {
    setPomodoroTime(isBreak ? 5 * 60 : 25 * 60)
    setIsRunning(false)
  }

  const formatPomodoroTime = () => {
    const minutes = Math.floor(pomodoroTime / 60)
    const seconds = pomodoroTime % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const hours = time.getHours().toString().padStart(2, "0")
  const minutes = time.getMinutes().toString().padStart(2, "0")
  const seconds = time.getSeconds().toString().padStart(2, "0")
  const date = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="relative rounded-lg border border-zinc-200 bg-white p-8 shadow-lg">
        {/* Ambient light effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-zinc-100/50 to-transparent" />

        {/* Main display container */}
        <div className="relative space-y-4">
          {/* Top status bar */}
          <div className="flex items-center justify-between text-[0.65rem] text-zinc-400">
            <span>OP-1</span>
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                isPomodoroMode ? (isBreak ? "bg-blue-500/80" : "bg-orange-500/80") : "bg-orange-500/80"
              }`}
            />
            <span>{isPomodoroMode ? (isBreak ? "BREAK" : "WORK") : date}</span>
          </div>

          {/* Main time display */}
          <div className="flex items-baseline justify-center space-x-2 font-mono tracking-tight">
            {isPomodoroMode ? (
              <div className="text-6xl font-light text-orange-600 [text-shadow:0_0_15px_rgba(234,88,12,0.2)]">
                {formatPomodoroTime()}
              </div>
            ) : (
              <>
                <div className="relative">
                  <span className="text-6xl font-light text-orange-600 [text-shadow:0_0_15px_rgba(234,88,12,0.2)]">
                    {hours}
                  </span>
                </div>
                <span
                  className={`text-5xl font-thin text-orange-600 transition-opacity duration-150 [text-shadow:0_0_15px_rgba(234,88,12,0.2)] ${
                    isBlinking ? "opacity-100" : "opacity-20"
                  }`}
                >
                  :
                </span>
                <div className="relative">
                  <span className="text-6xl font-light text-orange-600 [text-shadow:0_0_15px_rgba(234,88,12,0.2)]">
                    {minutes}
                  </span>
                </div>
                <div className="relative mt-2">
                  <span className="text-2xl font-light text-orange-500/70">{seconds}</span>
                </div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={togglePomodoro}
              className="rounded-full p-2.5 text-zinc-400 transition-colors hover:bg-orange-50 hover:text-orange-600 active:bg-orange-100"
              aria-label={isPomodoroMode ? "Switch to clock" : "Switch to pomodoro"}
            >
              <Timer className="h-5 w-5" />
            </button>
            {isPomodoroMode && (
              <>
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="rounded-full p-2.5 text-zinc-400 transition-colors hover:bg-orange-50 hover:text-orange-600 active:bg-orange-100"
                  aria-label={isRunning ? "Pause timer" : "Start timer"}
                >
                  {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <button
                  onClick={resetPomodoro}
                  className="rounded-full p-2.5 text-zinc-400 transition-colors hover:bg-orange-50 hover:text-orange-600 active:bg-orange-100"
                  aria-label="Reset timer"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Bottom status indicators */}
          <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-wide text-zinc-400">
            <span>LCD</span>
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-orange-500/40" />
              <span className="h-1 w-1 rounded-full bg-orange-500/40" />
              <span className="h-1 w-1 rounded-full bg-orange-500/40" />
            </div>
            <span>{isPomodoroMode ? "POMO" : "24H"}</span>
          </div>

          {/* Scan line effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent bg-[length:100%_10px] [animation:scan_4s_ease-in-out_infinite]" />
        </div>

        {/* Physical design elements */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes scan {
          0% {
            background-position: 0 -100%;
          }
          75%,
          100% {
            background-position: 0 100%;
          }
        }
      `}</style>
    </div>
  )
}

