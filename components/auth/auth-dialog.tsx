'use client';

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "@/components/login-form";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <LoginForm />
      </DialogContent>
    </Dialog>
  );
} 