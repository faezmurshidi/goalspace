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
import { ModelSelectionDialog } from './model-selection-dialog';

interface SpaceToolsProps {
  spaceId: string;
  onClose: () => void;
}

export function SpaceTools({ spaceId, onClose }: SpaceToolsProps) {
  const [showTools, setShowTools] = useState(true);
  const { getSpaceById, addDocument, setContent } = useSpaceStore();
  const space = getSpaceById(spaceId);

  // Ensure we have required space data
  if (!space || !space.title) {
    return null;
  }

  const generateInitialContent = async (model: string) => {
    if (!space) return;
    try {
      const response = await fetch('/api/generate-initial-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spaceDetails: space,
          model 
        }),
      });

      if (!response.ok) throw new Error('Failed to generate content');
      
      const data = await response.json();
      setContent(spaceId, data.content);
      
      // Save to knowledge base
      addDocument(spaceId, {
        title: `Initial Content: ${space.title}`,
        content: data.content,
        type: 'guide',
        tags: ['initial-content', space.category || ''],
      });
    } catch (err) {
      console.error('Failed to generate content:', err);
      throw err;
    }
  };

  const generatePlan = async (model: string) => {
    if (!space) return;
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spaceId,
          category: space.category,
          title: space.title,
          description: space.description,
          objectives: space.objectives,
          prerequisites: space.prerequisites,
          mentor: space.mentor,
          model,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate plan');
      
      const data = await response.json();
      
      // Save plan to knowledge base
      addDocument(spaceId, {
        title: `Learning Plan: ${space.title}`,
        content: data.plan,
        type: 'guide',
        tags: ['learning-plan', space.category || ''],
      });
    } catch (err) {
      console.error('Failed to generate plan:', err);
      throw err;
    }
  };

  const generateResearch = async (model: string) => {
    if (!space) return;
    try {
      const response = await fetch('/api/generate-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spaceId,
          category: space.category,
          title: space.title,
          description: space.description,
          objectives: space.objectives,
          prerequisites: space.prerequisites,
          mentor: space.mentor,
          model,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate research');
      
      const data = await response.json();
      
      // Save research to knowledge base
      addDocument(spaceId, {
        title: `Research Paper: ${space.title}`,
        content: data.research,
        type: 'guide',
        tags: ['research-paper', space.category || ''],
      });
    } catch (err) {
      console.error('Failed to generate research:', err);
      throw err;
    }
  };

  const generatePodcast = async (model: string) => {
    if (!space) return;
    try {
      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spaceId,
          category: space.category,
          title: space.title,
          description: space.description,
          objectives: space.objectives,
          prerequisites: space.prerequisites,
          mentor: space.mentor,
          model,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate podcast');
      
      const data = await response.json();
      
      // Save podcast to knowledge base
      addDocument(spaceId, {
        title: `Podcast Script: ${space.title}`,
        content: data.podcast,
        type: 'guide',
        tags: ['podcast', space.category || ''],
      });
    } catch (err) {
      console.error('Failed to generate podcast:', err);
      throw err;
    }
  };

  const generateMindMap = async (model: string) => {
    if (!space) return;
    try {
      const response = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spaceId,
          category: space.category,
          title: space.title,
          description: space.description,
          objectives: space.objectives,
          prerequisites: space.prerequisites,
          mentor: space.mentor,
          model,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate mind map');
      
      const data = await response.json();
      
      // Save mind map to knowledge base
      addDocument(spaceId, {
        title: `Mind Map: ${space.title}`,
        content: data.mindmap,
        type: 'guide',
        tags: ['mind-map', space.category || ''],
      });
    } catch (err) {
      console.error('Failed to generate mind map:', err);
      throw err;
    }
  };

  return (
    <Card className="bg-gradient-to-b from-background to-muted/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Tools
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowTools(prev => !prev)}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            {showTools ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {showTools && (
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <ModelSelectionDialog
              title="Generate Initial Content"
              description="Choose an AI model to generate initial content for your space."
              onGenerate={generateInitialContent}
              buttonIcon={<Lightbulb className="h-6 w-6" />}
              buttonText="Generate Content"
              spaceColor={space.space_color}
              category={space.category}
              className="h-24"
            />
            <ModelSelectionDialog
              title="Generate Learning Plan"
              description="Choose an AI model to generate a detailed learning plan for your space."
              onGenerate={generatePlan}
              buttonIcon={<BookOpen className="h-6 w-6" />}
              buttonText="Learning Plan"
              spaceColor={space.space_color}
              category={space.category}
              className="h-24"
            />
            <ModelSelectionDialog
              title="Generate Research Paper"
              description="Choose an AI model to generate a comprehensive research paper for your space."
              onGenerate={generateResearch}
              buttonIcon={<FileText className="h-6 w-6" />}
              buttonText="Research Paper"
              spaceColor={space.space_color}
              category={space.category}
              className="h-24"
            />
            <ModelSelectionDialog
              title="Generate Podcast"
              description="Choose an AI model to generate a podcast script for your space."
              onGenerate={generatePodcast}
              buttonIcon={<Headphones className="h-6 w-6" />}
              buttonText="Podcast"
              spaceColor={space.space_color}
              category={space.category}
              className="h-24"
            />
            <ModelSelectionDialog
              title="Generate Mind Map"
              description="Choose an AI model to generate a mind map for your space."
              onGenerate={generateMindMap}
              buttonIcon={<Network className="h-6 w-6" />}
              buttonText="Mind Map"
              spaceColor={space.space_color}
              category={space.category}
              className="h-24 col-span-2"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
} 