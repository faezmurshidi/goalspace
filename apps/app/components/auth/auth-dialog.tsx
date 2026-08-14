'use client';

import { Dialog, DialogContent } from "@goalspace/ui";
import { AuthForm } from "@/components/auth-form";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <AuthForm />
      </DialogContent>
    </Dialog>
  );
} 