import { Brain } from "lucide-react"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center">
          <Brain className="h-6 w-6 text-rose-500" />
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500">
            GoalSpace
          </span>
        </div>
        <LoginForm />
      </div>
    </div>
  )
} 