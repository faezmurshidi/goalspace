'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Brain,
  ChevronRight,
  Info,
  Loader2,
  MessageSquare,
  PlusCircle,
  Send,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSpaceStore } from '@/lib/store';
import type { Message } from '@/lib/store';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './markdown-content';

interface ChatWithMentorProps {
  spaceId: string;
  onClose?: () => void;
}

interface QuestionWithAnswers {
  question: string;
  answers: string[];
}

// Predefined questions and their possible answers
const PREDEFINED_QA = {
  learning: [
    {
      question: 'Can you explain this topic in simpler terms?',
      answers: [
        'Yes, please break it down step by step',
        'I need a real-world analogy',
        'Can you use visual examples?',
        "Explain it like I'm a beginner",
      ],
    },
    {
      question: 'What are the key concepts I should focus on?',
      answers: [
        'Show me the most important points',
        'What are the fundamental principles?',
        'Which parts will be used most often?',
        "What's essential for beginners?",
      ],
    },
    {
      question: 'How can I practice this effectively?',
      answers: [
        'What exercises do you recommend?',
        'Are there any online platforms to practice?',
        'Can you suggest some projects?',
        "What's the best way to start practicing?",
      ],
    },
    {
      question: 'What are common mistakes to avoid?',
      answers: [
        'What do beginners often get wrong?',
        'What are the typical pitfalls?',
        'How can I prevent these mistakes?',
        'What should I watch out for?',
      ],
    },
  ],
  goal: [
    {
      question: 'How can I break this goal into smaller steps?',
      answers: [
        'What should be my first milestone?',
        'How do I prioritize the steps?',
        "What's a realistic timeline?",
        'Which steps are most critical?',
      ],
    },
    {
      question: 'What are potential obstacles I might face?',
      answers: [
        'What are the common challenges?',
        'How can I prepare for setbacks?',
        'What should I plan for?',
        'What resources might I need?',
      ],
    },
    {
      question: 'How can I measure my progress?',
      answers: [
        'What are good success metrics?',
        'How often should I evaluate progress?',
        'What milestones should I set?',
        "How do I know I'm on track?",
      ],
    },
    {
      question: 'How can I stay motivated?',
      answers: [
        'What are effective motivation techniques?',
        'How do I maintain momentum?',
        'What if I feel stuck?',
        'How do I celebrate progress?',
      ],
    },
  ],
};

export function ChatWithMentor({ spaceId, onClose }: ChatWithMentorProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    getSpaceById,
    chatMessages,
    addMessage,
    clearChat,
    addDocument,
    faezInChat,
    toggleFaez,
    updateTodoList,
    loadMessages,
    isLoadingMessages,
    hasMoreMessages,
  } = useSpaceStore();

  const space = getSpaceById(spaceId);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithAnswers | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const messages = chatMessages[spaceId] || [];

  // Load initial messages
  useEffect(() => {
    if (!isInitialized && spaceId) {
      loadMessages(spaceId);
      setIsInitialized(true);
    }
  }, [spaceId, isInitialized, loadMessages]);

  // Load more messages when scrolling to top
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (element.scrollTop === 0 && !isLoadingMessages[spaceId] && hasMoreMessages[spaceId]) {
      loadMessages(spaceId, 50, messages.length);
    }
  };

  // If space is not found, show error state
  if (!space) {
    return (
      <Card className="flex h-[600px] flex-col">
        <CardHeader>
          <CardTitle className="text-xl">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Space not found</p>
        </CardContent>
      </Card>
    );
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addFaezToChat = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:
            "Hi, I'm Faez. I've been analyzing your progress and I'd like to join this conversation to help provide additional insights and guidance. Would that be helpful?",
          spaceId,
          mentor: space.mentor,
          context: {
            title: space.title,
            description: space.description,
            objectives: space.objectives,
            prerequisites: space.prerequisites,
            plan: space.plan,
            to_do_list: space.to_do_list,
          },
          isFaezPresent: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to add Faez');

      const data = await response.json();
      addMessage(spaceId, {
        role: 'assistant',
        content: data.message,
        isFaez: true,
      });
      toggleFaez(spaceId);
    } catch (error) {
      console.error('Error adding Faez:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string, isPreset = false) => {
    if (!content.trim()) return;

    setIsLoading(true);
    if (!isPreset) {
      setShowSuggestions(true);
      setSelectedQuestion(null);
    }

    try {
      // Add user message
      await addMessage(spaceId, {
        role: 'user',
        content,
      });

      // Get recent message history for context
      const recentMessages = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      console.log('recentMessages', recentMessages);

      const response = await fetch('/api/chat-with-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          spaceId,
          mentor: space.mentor,
          context: {
            title: space.title,
            description: space.description,
            objectives: space.objectives,
            prerequisites: space.prerequisites,
            plan: space.plan,
            to_do_list: space.to_do_list,
          },
          messageHistory: recentMessages,
          isFaezPresent: faezInChat[spaceId],
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Add assistant message
      await addMessage(spaceId, {
        role: 'assistant',
        content: data.message,
        isFaez: false,
      });

      // If Faez is present and has a response
      if (faezInChat[spaceId] && data.faezMessage) {
        await addMessage(spaceId, {
          role: 'assistant',
          content: data.faezMessage,
          isFaez: true,
        });
      }

      // If document was created, add it to knowledge base
      if (data.document) {
        addDocument(spaceId, data.document);
      }

      // If to-do list was updated
      if (data.to_do_list) {
        updateTodoList(spaceId, data.to_do_list);

        await addMessage(spaceId, {
          role: 'assistant',
          content:
            "I've updated the to-do list based on our discussion. You can check the new tasks in the to-do list section.",
        });
      }

      setInputMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && inputMessage.trim()) {
      sendMessage(inputMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Chat with {space.mentor.name}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">{space.mentor.name}</h4>
                  <p className="text-sm italic text-muted-foreground">
                    "{space.mentor.introduction}"
                  </p>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Teaching style: </span>
                    {space.mentor.personality}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Expertise: </span>
                    {space.mentor.expertise.join(', ')}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </CardTitle>
          <div className="flex items-center gap-2">
            {!faezInChat[spaceId] && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={addFaezToChat}
                disabled={isLoading}
              >
                <UserPlus className="h-4 w-4" />
                Add Faez
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearChat(spaceId)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        <ScrollArea className="flex-1 pr-4" onScroll={handleScroll}>
          {isLoadingMessages[spaceId] && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2 text-sm',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2',
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.isFaez
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800'
                  )}
                >
                  <MarkdownContent content={message.content} />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Suggestions */}
        {showSuggestions &&
          !selectedQuestion &&
          PREDEFINED_QA[space.category as keyof typeof PREDEFINED_QA] && (
            <div className="flex-none space-y-2">
              <p className="text-sm text-gray-500">Suggested questions:</p>
              <div className="grid grid-cols-2 gap-2">
                {PREDEFINED_QA[space.category as keyof typeof PREDEFINED_QA].map((qa, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto justify-start py-2 text-left"
                    onClick={() => setSelectedQuestion(qa)}
                  >
                    <span className="truncate">{qa.question}</span>
                    <ChevronRight className="ml-auto h-4 w-4 flex-none" />
                  </Button>
                ))}
              </div>
            </div>
          )}

        {/* Answer options */}
        {selectedQuestion && (
          <div className="flex-none space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0"
                onClick={() => setSelectedQuestion(null)}
              >
                ← Back
              </Button>
              <p className="text-sm text-gray-500">{selectedQuestion.question}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {selectedQuestion.answers.map((answer, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto justify-start py-2 text-left"
                  onClick={() => sendMessage(answer, true)}
                >
                  {answer}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex flex-none items-center gap-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !inputMessage.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
