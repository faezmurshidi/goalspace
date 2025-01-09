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

interface SpaceToolsProps {
  spaceId: string;
  onClose: () => void;
}

export function SpaceTools({ spaceId, onClose }: SpaceToolsProps) {
  const [showTools, setShowTools] = useState(true);

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
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <Lightbulb className="h-6 w-6" />
              <span className="text-sm">Generate Content</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-sm">Learning Plan</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">Research Paper</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <Headphones className="h-6 w-6" />
              <span className="text-sm">Podcast</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform col-span-2"
            >
              <Network className="h-6 w-6" />
              <span className="text-sm">Mind Map</span>
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 