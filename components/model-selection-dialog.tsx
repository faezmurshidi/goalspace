'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FancyButton } from './ui/fancy-button';

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

  const getButtonColors = () => {
    if (spaceColor) {
      return {
        top: spaceColor.main,
        middle: spaceColor.main,
        bottom: spaceColor.accent,
      };
    }
    return category === 'learning' ? {
      top: '#3B82F6',
      middle: '#2563EB',
      bottom: '#1D4ED8',
    } : {
      top: '#22C55E',
      middle: '#16A34A',
      bottom: '#15803D',
    };
  };

  const getButtonStroke = () => {
    if (spaceColor) {
      return {
        color: spaceColor.accent,
        opacity: 0.75,
        width: 0.5,
      };
    }
    return {
      color: category === 'learning' ? '#2563EB' : '#16A34A',
      opacity: 0.75,
      width: 0.5,
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div>
          <FancyButton
            text={buttonText}
            className="gap-2"
            fillColors={getButtonColors()}
            stroke={getButtonStroke()}
            textColor="#FFFFFF"
          >
            <Brain className="h-4 w-4" />
          </FancyButton>
        </div>
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
          <div>
            <FancyButton
              text={isGenerating ? "Generating..." : "Generate"}
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full gap-2"
              fillColors={getButtonColors()}
              stroke={getButtonStroke()}
              textColor="#FFFFFF"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
            </FancyButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 