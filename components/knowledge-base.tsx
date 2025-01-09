'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './markdown-content';
import { ModelSelectionDialog } from './model-selection-dialog';
import { X } from 'lucide-react';

interface KnowledgeBaseProps {
  spaceId: string;
  onClose?: () => void;
}

export function KnowledgeBase({ spaceId, onClose }: KnowledgeBaseProps) {
  const { getSpaceById, getDocuments, addDocument, setResearch, setPlan } = useSpaceStore();
  const space = getSpaceById(spaceId);
  const documents = getDocuments(spaceId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = Array.from(new Set(documents.flatMap(doc => doc.tags || [])));

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !selectedType || doc.type === selectedType;
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => doc.tags?.includes(tag));

    return matchesSearch && matchesType && matchesTags;
  });

  const generatePlan = async (model: string) => {
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spaceId,
          category: space?.category,
          title: space?.title,
          description: space?.description,
          objectives: space?.objectives,
          prerequisites: space?.prerequisites,
          mentor: space?.mentor,
          model,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate plan');
      
      const data = await response.json();
      setPlan(spaceId, data.plan);
      
      // Save plan to knowledge base
      addDocument(spaceId, {
        title: `Learning Plan: ${space?.title}`,
        content: data.plan,
        type: 'guide',
        tags: ['learning-plan', space?.category || ''],
      });
    } catch (err) {
      console.error('Failed to generate plan:', err);
      throw err;
    }
  };

  const generateResearch = async (model: string) => {
    try {
      const response = await fetch('/api/generate-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spaceId,
          category: space?.category,
          title: space?.title,
          description: space?.description,
          objectives: space?.objectives,
          prerequisites: space?.prerequisites,
          mentor: space?.mentor,
          model,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate research');
      
      const data = await response.json();
      setResearch(spaceId, data.research);
      
      // Save research to knowledge base
      addDocument(spaceId, {
        title: `Research Paper: ${space?.title}`,
        content: data.research,
        type: 'guide',
        tags: ['research-paper', space?.category || ''],
      });
    } catch (err) {
      console.error('Failed to generate research:', err);
      throw err;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Knowledge Base</CardTitle>
          <div className="flex gap-2">
            <ModelSelectionDialog
              title="Generate Learning Plan"
              description="Choose an AI model to generate a detailed learning plan for your space."
              onGenerate={generatePlan}
              buttonText="Generate Plan"
              spaceColor={space?.space_color}
              category={space?.category}
            />
            <ModelSelectionDialog
              title="Generate Research Paper"
              description="Choose an AI model to generate a comprehensive research paper for your space."
              onGenerate={generateResearch}
              buttonText="Generate Research"
              spaceColor={space?.space_color}
              category={space?.category}
            />
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="space-y-4">
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {['tutorial', 'guide', 'reference', 'exercise'].map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(selectedType === type ? null : type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag: string) => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    )}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Document List */}
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="overflow-hidden">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">{doc.title}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                      {doc.type}
                    </span>
                    {doc.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="prose dark:prose-invert max-w-none">
                    <MarkdownContent content={doc.content} />
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredDocuments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No documents found. Try adjusting your search or filters.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 