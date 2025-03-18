'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { X, Search, BookOpen, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

type DocumentType = 'tutorial' | 'guide' | 'reference' | 'exercise';

const documentTypes: Record<DocumentType, string> = {
  tutorial: 'Tutorial',
  guide: 'Guide',
  reference: 'Reference',
  exercise: 'Exercise'
};

interface KnowledgeBaseProps {
  spaceId: string;
  onClose?: () => void;
  onDocumentSelect: (document: { title: string; content: string }) => void;
}

export function KnowledgeBase({ spaceId, onClose, onDocumentSelect }: KnowledgeBaseProps) {
  const { getSpaceById, getDocuments, loadDocuments } = useSpaceStore();
  const space = getSpaceById(spaceId);
  const documents = getDocuments(spaceId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTypes, setSelectedTypes] = useState<DocumentType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Use useCallback to memoize fetchDocuments
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await loadDocuments(spaceId);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [spaceId, loadDocuments]);

  // Load documents when component mounts
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const allTags = new Set(documents.flatMap(doc => doc.tags || []));

  const toggleType = (type: DocumentType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const resetTypes = () => setSelectedTypes([]);
  const resetTags = () => setSelectedTags([]);

  const filteredDocuments = documents.filter(doc => {
    const matchesType = selectedTypes.length === 0 || (doc.type && selectedTypes.includes(doc.type as DocumentType));
    const matchesTags = selectedTags.length === 0 || (doc.tags && selectedTags.every(tag => doc.tags.includes(tag)));
    const matchesSearch = !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesTags && matchesSearch;
  });

  return (
    <Card className="h-[calc(50vh-4rem)] bg-gradient-to-b from-background to-muted/30">
      <CardContent className="space-y-4 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              Loading documents...
            </div>
          </div>
        ) : error ? (
          <div className="text-center text-destructive">
            {error}
            <Button
              variant="outline"
              onClick={() => fetchDocuments()}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Search input with icon */}
            {/* <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 bg-background/50 backdrop-blur-sm border-muted"
                />
              </div>
              <Button
                onClick={() => setShowFilters(prev => !prev)}
                variant="outline"
                size="default"
                className="hover:scale-105 transition-transform"
              >
                Filters
                {showFilters ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
            </div> */}

            {/* Filters section */}
            {/* {showFilters && (
              <div className="space-y-3">

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="w-4 h-4" />
                    <span>Document Types</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(documentTypes).map(([type, label]) => (
                      <Button
                        key={type}
                        onClick={() => toggleType(type as DocumentType)}
                        variant={selectedTypes.includes(type as DocumentType) ? "default" : "secondary"}
                        size="sm"
                        className={cn(
                          "transition-all duration-200",
                          selectedTypes.includes(type as DocumentType) ? "scale-105" : "opacity-75 hover:opacity-100"
                        )}
                      >
                        {label}
                      </Button>
                    ))}
                    {selectedTypes.length > 0 && (
                      <Button
                        onClick={resetTypes}
                        variant="destructive"
                        size="sm"
                        className="hover:scale-105 transition-transform"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>


                {allTags.size > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="w-4 h-4" />
                      <span>Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(allTags).map((tag) => (
                        <Button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          variant={selectedTags.includes(tag) ? "default" : "secondary"}
                          size="sm"
                          className={cn(
                            "transition-all duration-200",
                            selectedTags.includes(tag) ? "scale-105" : "opacity-75 hover:opacity-100"
                          )}
                        >
                          {tag}
                        </Button>
                      ))}
                      {selectedTags.length > 0 && (
                        <Button
                          onClick={resetTags}
                          variant="destructive"
                          size="sm"
                          className="hover:scale-105 transition-transform"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )} */}

            {/* Document list */}
            <div className={cn(
              "space-y-2 overflow-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent h-full",
              "max-h-[calc(100%-2rem)]" // Adjust for CardContent padding
            )}>
              {filteredDocuments.map((doc, index) => (
                <div
                  key={index}
                  onClick={() => onDocumentSelect(doc)}
                  className="p-4 rounded-lg bg-background/50 hover:bg-accent/10 cursor-pointer transition-all duration-200 hover:scale-[1.02] border border-muted hover:border-accent/50 group"
                >
                  <h3 className="font-medium mb-2 group-hover:text-primary transition-colors">{doc.title}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {doc.type}
                    </span>
                    {doc.tags?.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {filteredDocuments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-background/50 rounded-lg border border-dashed border-muted">
                  No documents found
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
