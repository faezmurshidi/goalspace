'use client';

import * as React from 'react';

import { GoalForm } from '@/components/goal-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface NewGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewGoalDialog({ open, onOpenChange }: NewGoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
          <DialogDescription>
            Let&apos;s break down your goal into actionable learning spaces.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <GoalForm />
        </div>
      </DialogContent>
    </Dialog>
  );
}
