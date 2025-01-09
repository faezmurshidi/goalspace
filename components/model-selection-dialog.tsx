'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ModelSelectionDialogProps {
  title: string;
  description: string;
  onGenerate: (model: string) => Promise<void>;
  buttonText: string;
  buttonIcon?: React.ReactNode;
  spaceColor?: {
    main: string;
    accent: string;
    secondary: string;
  } | null;
  category?: string | null;
  className?: string;
}

export function ModelSelectionDialog({ 
  title, 
  description, 
  onGenerate, 
  buttonText,
  buttonIcon,
  spaceColor,
  category,
  className
}: ModelSelectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt4');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(selectedModel);
      setOpen(false);
      toast.success('Generation completed successfully');
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform",
          className
        )}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          buttonIcon
        )}
        <span className="text-sm">{isGenerating ? 'Generating...' : buttonText}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <RadioGroup
              value={selectedModel}
              onValueChange={setSelectedModel}
              className="grid grid-cols-1 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gpt4" id="gpt4" />
                <Label htmlFor="gpt4" className="flex flex-col">
                  <span className="font-medium">GPT-4 Turbo</span>
                  <span className="text-sm text-muted-foreground">Most capable model, best for complex tasks</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="claude" id="claude" />
                <Label htmlFor="claude" className="flex flex-col">
                  <span className="font-medium">Claude 3.5</span>
                  <span className="text-sm text-muted-foreground">Advanced reasoning and analysis capabilities</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="perplexity" id="perplexity" />
                <Label htmlFor="perplexity" className="flex flex-col">
                  <span className="font-medium">Perplexity</span>
                  <span className="text-sm text-muted-foreground">Fast and efficient, good for general tasks</span>
                </Label>
              </div>
            </RadioGroup>
            <Button 
              onClick={handleGenerate} 
              className="w-full"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 