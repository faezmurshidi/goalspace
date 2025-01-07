'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Search, Book, FileText, Code, Dumbbell, Tag, X, FileQuestion, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpaceStore } from '@/lib/store';
import { MarkdownContent } from './markdown-content';
import { Badge } from '@/components/ui/badge';
import type { Document } from '@/lib/store';

interface KnowledgeBaseProps {
  spaceId: string;
}

const typeIcons = {
  tutorial: Book,
  guide: FileText,
  reference: Code,
  exercise: Dumbbell,
};

export function KnowledgeBase({ spaceId }: KnowledgeBaseProps) {
  const { getDocuments } = useSpaceStore();
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const documents = getDocuments(spaceId);

  // Get unique tags from all documents
  const allTags = Array.from(new Set(
    documents.flatMap(doc => doc.tags || [])
  ));

  // Filter documents based on search, type, and tags
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = !selectedType || doc.type === selectedType;

    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => doc.tags?.includes(tag));

    return matchesSearch && matchesType && matchesTags;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Knowledge Base
        </CardTitle>
        <CardDescription>
          Search and filter documents
        </CardDescription>
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
          <div className="space-y-2">
            {filteredDocs.map((doc) => (
              <Card 
                key={doc.id}
                className={cn(
                  "cursor-pointer hover:bg-accent transition-colors",
                  selectedDoc?.id === doc.id && "bg-accent"
                )}
                onClick={() => setSelectedDoc(doc)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        {doc.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Badge variant="outline">{doc.type}</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Document Content */}
          {selectedDoc && (
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg">{selectedDoc.title}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {selectedDoc.tags?.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedDoc.type}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDoc(null)}
                      className="h-8 w-8 text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <MarkdownContent content={selectedDoc.content} />
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 