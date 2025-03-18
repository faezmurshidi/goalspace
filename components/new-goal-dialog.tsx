'use client';

import * as React from 'react';
import { useAppTranslations } from '@/lib/hooks/use-translations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface NewGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewGoalDialog({ open, onOpenChange }: NewGoalDialogProps) {
  const { t } = useAppTranslations();
  
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
          {/* TODO: Re-implement GoalForm with proper translations */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
