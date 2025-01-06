'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Search, Book, FileText, Code, Dumbbell, Tag, X, FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpaceStore } from '@/lib/store';
import { MarkdownContent } from './markdown-content';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const { getDocuments, getSpaceById } = useSpaceStore();
  const documents = getDocuments(spaceId);
  const space = getSpaceById(spaceId);

  // Get all unique tags
  const allTags = Array.from(
    new Set(documents.flatMap((doc) => doc.tags))
  ).sort();

  // Filter documents based on search, type, and tags
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || doc.type === selectedType;
    
    const matchesTags = 
      selectedTags.length === 0 ||
      selectedTags.every((tag) => doc.tags.includes(tag));

    return matchesSearch && matchesType && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const selectedDocument = documents.find((doc) => doc.id === selectedDoc);

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="flex-none border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            Knowledge Base
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-none p-4 border-b">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {documents.length > 0 && (
            <>
              <div className="flex gap-2 mb-4">
                {Object.entries(typeIcons).map(([type, Icon]) => (
                  <Button
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Button
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleTag(tag)}
                      className="gap-2"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {documents.length > 0 ? (
          <div className="flex-1 flex">
            <div className="w-1/3 border-r">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {filteredDocs.map((doc) => {
                    const Icon = typeIcons[doc.type];
                    return (
                      <div
                        key={doc.id}
                        className={cn(
                          "p-4 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800",
                          selectedDoc === doc.id && "bg-gray-100 dark:bg-gray-800"
                        )}
                        onClick={() => setSelectedDoc(doc.id)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-blue-500" />
                          <h3 className="font-medium">{doc.title}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {doc.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            <div className="flex-1">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {selectedDocument ? (
                    <>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">{selectedDocument.title}</h2>
                        <div className="flex flex-wrap gap-2">
                          {selectedDocument.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <MarkdownContent content={selectedDocument.content} />
                    </>
                  ) : (
                    <div className="text-center text-gray-500 mt-8">
                      Select a document to view its content
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="space-y-4">
              <FileQuestion className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No Documents Yet</p>
                <p className="text-sm text-gray-500">
                  Chat with your mentor to generate knowledge documents.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 