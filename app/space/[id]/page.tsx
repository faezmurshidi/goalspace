'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Brain, Target, List, Clock, ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { MarkdownContent } from '@/components/markdown-content';
import { ChatWithMentor } from '@/components/chat-with-mentor';
import { KnowledgeBase } from '@/components/knowledge-base';
import { SpaceContentEditor } from '@/components/space-content-editor';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;
  
  const { getSpaceById, todoStates, toggleTodo, setPlan: setStorePlan, setResearch, addDocument } = useSpaceStore();
  const space = getSpaceById(spaceId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingResearch, setIsGeneratingResearch] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('gpt');
  const [selectedPlanModel, setSelectedPlanModel] = useState('gpt');
  const [isPlanCollapsed, setIsPlanCollapsed] = useState(false);
  const [isResearchCollapsed, setIsResearchCollapsed] = useState(false);

  const generatePlan = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
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
          model: selectedPlanModel,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate plan');
      
      const data = await response.json();
      setStorePlan(spaceId, data.plan);
      
      // Save plan to knowledge base
      addDocument(spaceId, {
        title: `Learning Plan: ${space?.title}`,
        content: data.plan,
        type: 'guide',
        tags: ['learning-plan', space?.category || ''],
      });
    } catch (err) {
      setError('Failed to generate plan. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateResearch = async () => {
    try {
      setIsGeneratingResearch(true);
      setResearchError(null);
      
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
          model: selectedModel,
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
      setResearchError('Failed to generate research. Please try again.');
      console.error(err);
    } finally {
      setIsGeneratingResearch(false);
    }
  };

  if (!space) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <SiteHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <Button 
              variant="ghost" 
              className="mb-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Space Not Found</h1>
              <p className="text-gray-500">This space doesn't exist or has been removed.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SiteHeader />
      <main className="container-fluid mx-auto px-4 py-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <span className={cn(
              "text-sm px-3 py-1 rounded-full font-medium",
              space.category === 'learning'
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            )}>
              {space.category.charAt(0).toUpperCase() + space.category.slice(1)}
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-10">
            {/* Main Content */}
            <div className="lg:col-span-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {space.category === 'learning' ? (
                      <Brain className="h-6 w-6 text-blue-500" />
                    ) : (
                      <Target className="h-6 w-6 text-green-500" />
                    )}
                    {space.title}
                  </CardTitle>
                  <CardDescription className="text-base">
                    <MarkdownContent content={space.description} />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SpaceContentEditor 
                    space={space}
                    editable={true}
                    onUpdate={(content) => {
                      console.log('Content updated:', content);
                      // TODO: Implement content update logic
                    }}
                  />
                </CardContent>
              </Card>

               {/* Knowledge Base */}
               <KnowledgeBase spaceId={spaceId} />

               {/* Learning Plan Section */}
               <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsPlanCollapsed(!isPlanCollapsed)}>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-500" />
                        Learning Plan
                      </CardTitle>
                      {space.plan && (
                        <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                          {isPlanCollapsed ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          )}
                        </Button>
                      )}
                    </div>
                    {!space.plan && (
                      <div className="flex items-center gap-4">
                        <RadioGroup
                          value={selectedPlanModel}
                          onValueChange={setSelectedPlanModel}
                          className="flex items-center space-x-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="gpt" id="plan-gpt" />
                            <Label htmlFor="plan-gpt">GPT-4</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="perplexity" id="plan-perplexity" />
                            <Label htmlFor="plan-perplexity">Perplexity</Label>
                          </div>
                        </RadioGroup>
                        <Button
                          onClick={generatePlan}
                          disabled={isGenerating}
                          className={cn(
                            "gap-2",
                            space.category === 'learning'
                              ? "bg-blue-500 hover:bg-blue-600 text-white"
                              : "bg-green-500 hover:bg-green-600 text-white"
                          )}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Brain className="h-4 w-4" />
                              Generate Plan
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className={cn(
                  "transition-all duration-200",
                  isPlanCollapsed ? "h-0 overflow-hidden p-0" : ""
                )}>
                  {error && (
                    <div className="text-red-500 text-sm mb-4">
                      {error}
                    </div>
                  )}
                  {space.plan ? (
                    <MarkdownContent content={space.plan} />
                  ) : !isGenerating && (
                    <div className="text-center py-8 text-gray-500">
                      Click "Generate Plan" to have your AI mentor create a detailed learning plan.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Research Paper Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsResearchCollapsed(!isResearchCollapsed)}>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-500" />
                        Research Paper
                      </CardTitle>
                      {space.research && (
                        <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                          {isResearchCollapsed ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          )}
                        </Button>
                      )}
                    </div>
                    {!space.research && (
                      <div className="flex items-center gap-4">
                        <RadioGroup
                          value={selectedModel}
                          onValueChange={setSelectedModel}
                          className="flex items-center space-x-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="gpt" id="gpt" />
                            <Label htmlFor="gpt">GPT-4</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="perplexity" id="perplexity" />
                            <Label htmlFor="perplexity">Perplexity</Label>
                          </div>
                        </RadioGroup>
                        <Button
                          onClick={generateResearch}
                          disabled={isGeneratingResearch}
                          className={cn(
                            "gap-2",
                            space.category === 'learning'
                              ? "bg-blue-500 hover:bg-blue-600 text-white"
                              : "bg-green-500 hover:bg-green-600 text-white"
                          )}
                        >
                          {isGeneratingResearch ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Brain className="h-4 w-4" />
                              Generate Research
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className={cn(
                  "transition-all duration-200",
                  isResearchCollapsed ? "h-0 overflow-hidden p-0" : ""
                )}>
                  {researchError && (
                    <div className="text-red-500 text-sm mb-4">
                      {researchError}
                    </div>
                  )}
                  {space.research ? (
                    <MarkdownContent content={space.research} />
                  ) : !isGeneratingResearch && (
                    <div className="text-center py-8 text-gray-500">
                      Click "Generate Research" to have your AI mentor create a detailed research paper.
                    </div>
                  )}
                </CardContent>
              </Card>

             
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Mentor Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-500" />
                    Your AI Mentor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="font-medium">{space.mentor.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                      "{space.mentor.introduction}"
                    </p>
                    <p className="text-sm text-gray-500">
                      Teaching style: {space.mentor.personality}
                    </p>
                    <div className="text-sm">
                      <span className="text-gray-500">Expert in: </span>
                      {space.mentor.expertise.join(', ')}
                    </div>
                  </div>
                </CardContent>
              </Card>

             

              {/* Chat Section */}
              <div className="lg:sticky lg:top-8">
                <ChatWithMentor spaceId={spaceId} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 