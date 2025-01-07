'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Send, Loader2, MessageSquare, ChevronRight, UserPlus } from 'lucide-react';
import { useSpaceStore } from '@/lib/store';
import { MarkdownContent } from './markdown-content';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

interface ChatWithMentorProps {
  spaceId: string;
}

interface QuestionWithAnswers {
  question: string;
  answers: string[];
}

// Predefined questions and their possible answers
const PREDEFINED_QA = {
  learning: [
    {
      question: "Can you explain this topic in simpler terms?",
      answers: [
        "Yes, please break it down step by step",
        "I need a real-world analogy",
        "Can you use visual examples?",
        "Explain it like I'm a beginner"
      ]
    },
    {
      question: "What are the key concepts I should focus on?",
      answers: [
        "Show me the most important points",
        "What are the fundamental principles?",
        "Which parts will be used most often?",
        "What's essential for beginners?"
      ]
    },
    {
      question: "How can I practice this effectively?",
      answers: [
        "What exercises do you recommend?",
        "Are there any online platforms to practice?",
        "Can you suggest some projects?",
        "What's the best way to start practicing?"
      ]
    },
    {
      question: "What are common mistakes to avoid?",
      answers: [
        "What do beginners often get wrong?",
        "What are the typical pitfalls?",
        "How can I prevent these mistakes?",
        "What should I watch out for?"
      ]
    }
  ],
  goal: [
    {
      question: "How can I break this goal into smaller steps?",
      answers: [
        "What should be my first milestone?",
        "How do I prioritize the steps?",
        "What's a realistic timeline?",
        "Which steps are most critical?"
      ]
    },
    {
      question: "What are potential obstacles I might face?",
      answers: [
        "What are the common challenges?",
        "How can I prepare for setbacks?",
        "What should I plan for?",
        "What resources might I need?"
      ]
    },
    {
      question: "How can I measure my progress?",
      answers: [
        "What are good success metrics?",
        "How often should I evaluate progress?",
        "What milestones should I set?",
        "How do I know I'm on track?"
      ]
    },
    {
      question: "How can I stay motivated?",
      answers: [
        "What are effective motivation techniques?",
        "How do I maintain momentum?",
        "What if I feel stuck?",
        "How do I celebrate progress?"
      ]
    }
  ]
};

export function ChatWithMentor({ spaceId }: ChatWithMentorProps) {
  const { chatMessages, addMessage, getSpaceById } = useSpaceStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithAnswers | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isFaezPresent, setIsFaezPresent] = useState(false);
  const messages = chatMessages[spaceId] || [];
  const space = getSpaceById(spaceId);

  const addFaezToChat = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Hi, I'm Faez. I've been analyzing your progress and I'd like to join this conversation to help provide additional insights and guidance. Would that be helpful?",
          spaceId,
          isFaez: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to add Faez');

      const data = await response.json();
      addMessage(spaceId, {
        role: 'assistant',
        content: data.message,
        isFaez: true,
      });
      setIsFaezPresent(true);
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
    }

    // Add user message
    addMessage(spaceId, {
      role: 'user',
      content,
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          spaceId,
          isFaez: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Add assistant message
      addMessage(spaceId, {
        role: 'assistant',
        content: data.message,
        isFaez: false,
      });

      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetMessage = (question: string, answer: string) => {
    const content = `${question}\n\nMy response: ${answer}`;
    setSelectedQuestion(null);
    sendMessage(content, true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Chat with {space?.mentor.name}
        </CardTitle>
        {!isFaezPresent && (
          <Button
            variant="outline"
            size="sm"
            onClick={addFaezToChat}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Faez to Chat
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Suggested Questions */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <p className="text-sm text-gray-500 font-medium mb-3">Suggested Questions:</p>
            {!selectedQuestion ? (
              <div className="grid grid-cols-1 gap-2">
                {PREDEFINED_QA[space?.category as keyof typeof PREDEFINED_QA]?.map((qa, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-between text-left h-auto py-2 px-3 group"
                    onClick={() => setSelectedQuestion(qa)}
                    disabled={isLoading}
                  >
                    <span className="flex-1">{qa.question}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 font-medium">{selectedQuestion.question}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedQuestion(null)}
                    className="text-sm text-gray-500"
                  >
                    Back to questions
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {selectedQuestion.answers.map((answer, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto py-2 px-3"
                      onClick={() => handlePresetMessage(selectedQuestion.question, answer)}
                      disabled={isLoading}
                    >
                      {answer}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="space-y-4 mb-4 min-h-[300px] max-h-[400px] overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-2 p-2 rounded-lg",
                  message.role === 'user'
                    ? "bg-blue-500 text-white ml-auto max-w-[80%]"
                    : message.isFaez
                    ? "bg-yellow-50 dark:bg-yellow-900/20 max-w-[80%]"
                    : "bg-gray-100 dark:bg-gray-800 max-w-[80%]"
                )}
              >
                {message.role === 'assistant' && (
                  message.isFaez ? (
                    <UserPlus className="h-5 w-5 text-yellow-500 shrink-0 mt-1" />
                  ) : (
                    <Brain className="h-5 w-5 text-blue-500 shrink-0 mt-1" />
                  )
                )}
                <div className="flex-1">
                  <MarkdownContent content={message.content} />
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !inputMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
} 