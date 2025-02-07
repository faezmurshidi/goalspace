'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  X, 
  BookOpen, 
  Lightbulb, 
  FileText, 
  Headphones, 
  Network,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpaceStore } from '@/lib/store';
import { generateContent } from '@/lib/utils/ai-generate';
import { ModelSelectionDialog } from './model-selection-dialog';
import { CustomPodcast } from './custom-podcast';
import { toast } from 'sonner';

interface SpaceToolsProps {
  spaceId: string;
  onClose?: () => void;
}

export function SpaceTools({ spaceId, onClose }: SpaceToolsProps) {
  const [showTools, setShowTools] = useState(true);
  const { getSpaceById, setPlan, setResearch, addDocument } = useSpaceStore();
  const space = getSpaceById(spaceId);

  if (!space) {
    return null;
  }

  const handleGenerate = async (useCase: 'plan' | 'research' | 'mindmap' | 'podcast', model: string) => {
    try {
      const content = await generateContent(
        useCase,
        model as 'gpt' | 'claude' | 'perplexity',
        space
      );

      // Save to knowledge base
      addDocument(spaceId, {
        id: space.id,
        title: `${useCase.charAt(0).toUpperCase() + useCase.slice(1)}: ${space.title}`,
        content,
        type: useCase === 'plan' ? 'guide' : 'tutorial',
        tags: [useCase, space.category],
        space_id: space.id,
      });

      // Update specific state based on use case
      switch (useCase) {
        case 'plan':
          setPlan(spaceId, content);
          break;
        case 'research':
          setResearch(spaceId, content);
          break;
        // Add other cases as needed
      }

      toast.success(`${useCase.charAt(0).toUpperCase() + useCase.slice(1)} generated successfully`);
    } catch (error) {
      console.error(`Error generating ${useCase}:`, error);
      toast.error(`Failed to generate ${useCase}`);
    }
  };

  return (
    <Card className="bg-gradient-to-b from-background to-muted/30">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <ModelSelectionDialog
            title="Generate Learning Plan"
            description="Generate a structured learning plan for this space using AI."
            onGenerate={(model) => handleGenerate('plan', model)}
            buttonText="Learning Plan"
            spaceColor={space.space_color}
            category={space.category}
          />

          <ModelSelectionDialog
            title="Generate Research"
            description="Generate a comprehensive research paper for this topic using AI."
            onGenerate={(model) => handleGenerate('research', model)}
            buttonText="Research Paper"
            spaceColor={space.space_color}
            category={space.category}
          />

          <ModelSelectionDialog
            title="Generate Mind Map"
            description="Generate a visual mind map to understand the topic better."
            onGenerate={(model) => handleGenerate('mindmap', model)}
            buttonText="Mind Map"
            spaceColor={space.space_color}
            category={space.category}
          />

          <ModelSelectionDialog
            title="Generate Podcast Script"
            description="Generate an engaging podcast script about this topic."
            onGenerate={(model) => handleGenerate('podcast', model)}
            buttonText="Podcast Script"
            spaceColor={space.space_color}
            category={space.category}
          />

          <CustomPodcast spaceId={spaceId} content={space.content?.toString() || ''} /> 
        </div>
      </CardContent>
    </Card>
  );
} 