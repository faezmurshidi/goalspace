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
  const handleSubmit = async (answers: { [key: string]: string }) => {
    // Here you can handle the form submission
    // For now, we'll just close the dialog
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
          <DialogDescription>
            Let's break down your goal into actionable learning spaces.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <GoalForm onSubmit={handleSubmit} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
