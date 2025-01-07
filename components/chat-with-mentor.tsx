'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Loader2, PlusCircle, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpaceStore } from '@/lib/store';
import type { Message } from '@/lib/store';
import { MarkdownContent } from './markdown-content';

interface ChatWithMentorProps {
  spaceId: string;
}

export function ChatWithMentor({ spaceId }: ChatWithMentorProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    getSpaceById, 
    chatMessages, 
    addMessage, 
    clearChat, 
    addDocument,
    faezInChat,
    toggleFaez 
  } = useSpaceStore();
  
  const space = getSpaceById(spaceId);
  const messages = chatMessages[spaceId] || [];
  const isFaezPresent = faezInChat[spaceId] || false;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading || !space) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    // Add user message to chat
    addMessage(spaceId, {
      role: 'user',
      content: userMessage,
    });

    try {
      const response = await fetch('/api/chat-with-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          spaceId,
          mentor: space.mentor,
          context: {
            title: space.title,
            description: space.description,
            objectives: space.objectives,
            prerequisites: space.prerequisites,
            plan: space.plan,
          },
          isFaezPresent,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Add assistant message to chat
      addMessage(spaceId, {
        role: 'assistant',
        content: data.message,
      });

      // If Faez is present and has a response
      if (isFaezPresent && data.faezMessage) {
        addMessage(spaceId, {
          role: 'faez',
          content: data.faezMessage,
        });
      }

      // If document was created, add it to knowledge base
      if (data.document) {
        addDocument(spaceId, data.document);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage(spaceId, {
        role: 'assistant',
        content: "I apologize, but I encountered an error. Please try again.",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleAddToKnowledgeBase = (message: Message) => {
    addDocument(spaceId, {
      title: `Chat: ${message.content.slice(0, 50)}...`,
      content: message.content,
      type: 'reference',
      tags: ['chat', message.role],
    });
  };

  return (
    <Card className="flex flex-col h-[800px]">
      <CardHeader className="flex-none border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Brain className="h-5 w-5" style={{ color: space?.space_color?.main }} />
            Chat with {space?.mentor.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={isFaezPresent ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFaez(spaceId)}
              className="gap-2"
              style={isFaezPresent && space?.space_color ? {
                backgroundColor: space.space_color.main,
                borderColor: space.space_color.main,
                color: 'white',
                '--hover-bg': space.space_color.tertiary,
              } as any : undefined}
            >
              <Brain className="h-4 w-4" />
              {isFaezPresent ? 'Remove Faez' : 'Add Faez'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => clearChat(spaceId)}
              className="h-8 w-8 text-gray-500 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  msg.role === 'user' ? "justify-end" : "justify-start",
                  "w-full group"
                )}
              >
                {msg.role !== 'user' && (
                  <div className="flex-none">
                    <Brain className={cn(
                      "h-6 w-6",
                      msg.role === 'faez' ? "text-green-500" : "text-blue-500"
                    )} style={{ color: msg.role === 'faez' ? space?.space_color?.tertiary : space?.space_color?.main }} />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm max-w-[85%] break-words overflow-hidden relative",
                    msg.role === 'user'
                      ? "text-white"
                      : msg.role === 'faez'
                      ? "bg-green-100 dark:bg-green-900/20"
                      : "bg-gray-100 dark:bg-gray-800"
                  )}
                  style={msg.role === 'user' ? {
                    backgroundColor: space?.space_color?.main,
                  } : msg.role === 'faez' ? {
                    backgroundColor: `${space?.space_color?.tertiary}20`,
                  } : undefined}
                >
                  <div className="flex justify-between items-start gap-2">
                    <MarkdownContent content={msg.content} />
                    {msg.role !== 'user' && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                        onClick={() => handleAddToKnowledgeBase(msg)}
                        title="Add to Knowledge Base"
                      >
                        <PlusCircle className="h-4 w-4" style={{ color: space?.space_color?.main }} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="flex-none">
                  <Brain className="h-6 w-6" style={{ color: space?.space_color?.main }} />
                </div>
                <div className="rounded-lg px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>
      <div className="flex-none p-4 border-t bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || isLoading}
            size="icon"
            style={{
              backgroundColor: space?.space_color?.main,
              borderColor: space?.space_color?.main,
              '--hover-bg': space?.space_color?.tertiary,
            } as any}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
} 