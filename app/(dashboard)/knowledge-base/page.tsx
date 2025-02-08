'use client';

import { useEffect, useState } from 'react';
import { useSpaceStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, Tag, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Tiptap from '@/components/TipTap';

type DocumentType = 'tutorial' | 'guide' | 'reference' | 'exercise';

const documentTypes: Record<DocumentType, string> = {
  tutorial: 'Tutorial',
  guide: 'Guide',
  reference: 'Reference',
  exercise: 'Exercise'
};

interface Document {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  tags: string[];
  space_id: string;
}

export default function KnowledgeBasePage() {
  const { loadUserData, spaces, loadDocuments, getDocuments } = useSpaceStore();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<DocumentType[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Load all documents from all spaces
  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log('Loading user data...');
        await loadUserData();
        const allDocs: Document[] = [];
        const tagsSet = new Set<string>();

        console.log('Available spaces:', spaces);
        // Load documents from each space
        for (const space of spaces) {
          console.log(`Loading documents for space ${space.id}...`);
          // First load the documents
          await loadDocuments(space.id);
          // Then get them from the store
          const spaceDocs = getDocuments(space.id) as Document[];
          console.log(`Found ${spaceDocs?.length || 0} documents for space ${space.id}:`, spaceDocs);
          
          if (spaceDocs && spaceDocs.length > 0) {
            spaceDocs.forEach((doc: Document) => {
              if (doc.tags) {
                doc.tags.forEach((tag: string) => tagsSet.add(tag));
              }
            });
            allDocs.push(...spaceDocs);
          }
        }

        console.log('Total documents loaded:', allDocs.length);
        console.log('All tags found:', Array.from(tagsSet));
        
        setDocuments(allDocs);
        setAllTags(Array.from(tagsSet));
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading knowledge base:', error);
        setIsLoading(false);
      }
    };

    initializeData();
  }, [loadUserData, spaces, loadDocuments, getDocuments]);

  // Filter documents based on search query, selected tags, and types
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.every(tag => doc.tags?.includes(tag));

    const matchesType = selectedTypes.length === 0 ||
      (doc.type && selectedTypes.includes(doc.type as DocumentType));

    return matchesSearch && matchesTags && matchesType;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleType = (type: DocumentType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const resetFilters = () => {
    setSelectedTags([]);
    setSelectedTypes([]);
    setSearchQuery('');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground">Access and search through all your learning materials</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Search and Documents */}
        <div className={cn(
          "space-y-6",
          selectedDocument ? "col-span-5" : "col-span-12"
        )}>
          {/* Search and Filter Section */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge base..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {(selectedTags.length > 0 || selectedTypes.length > 0 || searchQuery) && (
                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="space-y-4 p-4 rounded-lg border bg-card">
                {/* Document Types */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Document Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(documentTypes).map(([type, label]) => (
                      <Badge
                        key={type}
                        variant={selectedTypes.includes(type as DocumentType) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleType(type as DocumentType)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Tags</h3>
                  <ScrollArea className="w-full whitespace-nowrap pb-2">
                    <div className="flex gap-2">
                      {allTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleTag(tag)}
                        >
                          <Tag className="mr-1 h-3 w-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </Card>
              ))
            ) : filteredDocuments.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No documents found matching your criteria.</p>
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <Card 
                  key={doc.id} 
                  className={cn(
                    "p-4 hover:shadow-md transition-all cursor-pointer",
                    selectedDocument?.id === doc.id ? "ring-2 ring-primary" : ""
                  )}
                  onClick={() => setSelectedDocument(doc)}
                >
                  <h3 className="font-semibold mb-2 line-clamp-1">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {doc.content}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {documentTypes[doc.type as DocumentType] || doc.type}
                    </Badge>
                    {doc.tags?.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Document Viewer */}
        {selectedDocument && (
          <div className="col-span-7">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{selectedDocument.title}</h2>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {documentTypes[selectedDocument.type as DocumentType] || selectedDocument.type}
                    </Badge>
                    {selectedDocument.tags?.map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDocument(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Tiptap 
                  content={selectedDocument.content} 
                  editable={false}
                  className="min-h-[500px]"
                />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 