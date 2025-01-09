'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelSelectionDialogProps {
  title: string;
  description: string;
  onGenerate: (model: string) => Promise<void>;
  buttonText: string;
  spaceColor?: {
    main: string;
    accent: string;
  };
  category?: string;
}

export function ModelSelectionDialog({
  title,
  description,
  onGenerate,
  buttonText,
  spaceColor,
  category = 'learning'
}: ModelSelectionDialogProps) {
  const [selectedModel, setSelectedModel] = useState('gpt');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const models = [
    { id: 'gpt', name: 'GPT-4 Turbo', description: 'Latest GPT-4 model with enhanced capabilities' },
    { id: 'claude', name: 'Claude 3.5', description: 'Advanced reasoning and analysis capabilities' },
    { id: 'perplexity', name: 'Perplexity', description: 'Specialized in research and academic content' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(selectedModel);
      setIsOpen(false);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            "gap-2 transition-colors duration-200",
            spaceColor 
              ? `bg-[${spaceColor.main}] hover:bg-[${spaceColor.accent}]`
              : category === 'learning'
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-green-500 hover:bg-green-600"
          )}
          style={spaceColor ? {
            backgroundColor: spaceColor.main,
            '--hover-bg': spaceColor.accent
          } as any : undefined}
        >
          <Brain className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <RadioGroup
            value={selectedModel}
            onValueChange={setSelectedModel}
            className="flex flex-col space-y-3"
          >
            {models.map((model) => (
              <div key={model.id} className="flex items-start space-x-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <RadioGroupItem value={model.id} id={model.id} className="mt-1" />
                <div className="flex flex-col">
                  <Label htmlFor={model.id} className="font-medium">{model.name}</Label>
                  <span className="text-sm text-muted-foreground">{model.description}</span>
                </div>
              </div>
            ))}
          </RadioGroup>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={cn(
              "w-full gap-2",
              spaceColor 
                ? `bg-[${spaceColor.main}] hover:bg-[${spaceColor.accent}]`
                : category === 'learning'
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-green-500 hover:bg-green-600"
            )}
            style={spaceColor ? {
              backgroundColor: spaceColor.main,
              '--hover-bg': spaceColor.accent
            } as any : undefined}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 