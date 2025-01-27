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
  Bot,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSpaceStore } from '@/lib/store';
import type { Message } from '@/lib/store';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './ui/markdown-content';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  timestamp: Date;
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  // Load initial messages
  useEffect(() => {
    if (!isInitialized && spaceId) {
      loadMessages(spaceId);
      setIsInitialized(true);
    }
  }, [spaceId, isInitialized, loadMessages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          spaceId
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.content,
        id: crypto.randomUUID(),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        id: crypto.randomUUID(),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-100 dark:bg-slate-900">
      {/* Chat Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-800">
        <Bot className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">AI Mentor</span>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="space-y-4 py-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-3 text-sm",
                  message.role === 'assistant' ? "items-start" : "items-start justify-end"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="mt-0.5 rounded-full bg-slate-200 p-1.5 dark:bg-slate-700">
                    <Bot className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </div>
                )}
                <div className={cn(
                  "rounded-2xl px-4 py-2 max-w-[80%]",
                  message.role === 'assistant' 
                    ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" 
                    : "bg-slate-600 text-slate-50 dark:bg-slate-600"
                )}>
                  <MarkdownContent content={message.content} id={message.id} />
                </div>
                {message.role === 'user' && (
                  <div className="mt-0.5 rounded-full bg-slate-600 p-1.5 dark:bg-slate-600">
                    <User className="h-4 w-4 text-slate-50" />
                  </div>
                )}
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 text-sm"
              >
                <div className="mt-0.5 rounded-full bg-slate-200 p-1.5 dark:bg-slate-700">
                  <Bot className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex gap-1 rounded-2xl bg-slate-200 px-4 py-2 dark:bg-slate-700">
                  <motion.div
                    className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your mentor anything..."
            className="flex-1 bg-slate-100 border-slate-300 focus:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-slate-500 dark:placeholder:text-slate-400"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={isLoading || !input.trim()}
            className="bg-slate-600 hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
