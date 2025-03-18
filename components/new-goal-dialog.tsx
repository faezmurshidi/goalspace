'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('goals.createNewGoal')}</DialogTitle>
          <DialogDescription>
            {t('goals.goalBreakdown')}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <GoalForm />
        </div>
      </DialogContent>
    </Dialog>
  );
}
