'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from 'ai/react';
import { type Message } from 'ai';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './ui/markdown-content';
import { toast } from './ui/use-toast';
import { type Space } from '@/lib/types/space';
import { getSession } from '@/lib/auth';
import { createClient } from '@/utils/supabase/client';



interface ChatWithMentorProps {
  spaceId: string;
  className?: string;
  inputClassName?: string;
}

export function ChatWithMentor({ spaceId, className, inputClassName }: ChatWithMentorProps) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<any>(null);

  const { 
    getSpaceById, 
    chatMessages, 
    loadMessages, 
    isLoadingMessages, 
    hasMoreMessages,
    addMessage 
  } = useSpaceStore();
  
  const space = getSpaceById(spaceId);

  
  

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: '/api/chat',
    body: {
      space,
      session,
    },
    onFinish(message: Message) {
      try {
        // Store the message in our database
        if (message.role === 'assistant' || message.role === 'user') {
          addMessage(spaceId, {
            role: message.role,
            content: message.content,
          }).catch(console.error);
        }

        // Check if the message content is a JSON string containing a special command
        const data = JSON.parse(message.content);
        if (data.type === 'document' || data.type === 'tasks') {
          if (data.type === 'document') {
            toast({
              title: 'Document Created',
              description: 'A new document has been added to your knowledge base.',
            });
          } else if (data.type === 'tasks') {
            toast({
              title: 'Tasks Created',
              description: 'New tasks have been added to your list.',
            });
          }
        }
      } catch (e) {
        // Not a JSON string, regular message - still store it
        if (message.role === 'assistant' || message.role === 'user') {
          addMessage(spaceId, {
            role: message.role,
            content: message.content,
          }).catch(console.error);
        }
      }
    },
    onError(error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to get response from mentor. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Custom submit handler to store user messages
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Store user message first
    await addMessage(spaceId, {
      role: 'user',
      content: input.trim(),
    });

    // Then proceed with original submit
    originalHandleSubmit(e);
  };

  // Load previous messages when component mounts
  useEffect(() => {
    // Create memoized version of this function with useCallback
    const loadPreviousMessages = async () => {
      try {
        console.log("loadPreviousMessages");
        await loadMessages(spaceId);
        // Convert stored messages to the format expected by useChat
        // Get a stable reference to chatMessages
        const messagesForSpace = chatMessages[spaceId] || [];
        setMessages(
          messagesForSpace.map((msg) => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            createdAt: new Date(msg.timestamp),
          }))
        );
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load previous messages.',
          variant: 'destructive',
        });
      }
    };
    
    const userSession = async () => {
      console.log("userSession");
      const session = await getSession();
      console.log("userSession", session);
      setSession(session);
    };

    userSession();
    loadPreviousMessages();
    
    // Only rerun when spaceId or loadMessages changes
    // chatMessages and setMessages have stable identities
  }, [spaceId, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // If space is not found, show error state
  if (!space) {
    return (
      <Card className="flex h-[600px] flex-col">
        <div className="p-4">
          <p>Space not found</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("flex h-full flex-col bg-slate-100 dark:bg-slate-900", className)}>
      {/* Chat Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-800">
        <Bot className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{space.mentor.name}</span>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {isLoadingMessages && (
            <div className="flex justify-center">
              <span className="text-sm text-muted-foreground">Loading messages...</span>
            </div>
          )}
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
            onChange={handleInputChange}
            placeholder="Ask your mentor anything..."
            className={cn(
              "flex-1 bg-slate-100 border-slate-300 focus:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-slate-500 dark:placeholder:text-slate-400",
              inputClassName
            )}
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
