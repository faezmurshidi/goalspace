'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Wand2, BrainCircuit, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { QuestionCard } from '@/components/ui/question-card';
import { useSpaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question: string;
  purpose: string;
}

export function GoalForm() {
  const router = useRouter();
  const [goal, setGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [modelProvider, setModelProvider] = useState<'openai' | 'anthropic'>('openai');
  const [showGoalForm, setShowGoalForm] = useState(true);
  const { setSpaces, setCurrentGoal, setTodoStates } = useSpaceStore();

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const getQuestions = async (goalText: string) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/analyze-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goalText,
          modelProvider,
        }),
      });

      if (!response.ok) throw new Error('Failed to get questions');

      const data = await response.json();
      setQuestions(data.questions);
    } catch (err) {
      setError('Failed to generate questions. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeGoal = async (goalText: string, userAnswers: { [key: string]: string }) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/analyze-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goalText,
          answers: userAnswers,
          isAdvancedMode,
          modelProvider,
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze goal');

      const data = await response.json();

      // Update local state
      setSpaces(data.spaces);
      setCurrentGoal(goalText);

      // Initialize todo states for new spaces
      const initialTodoStates: { [key: string]: { [key: string]: boolean } } = {};
      data.spaces.forEach((space: any) => {
        initialTodoStates[space.id] = {};
        space.to_do_list.forEach((_: string, index: number) => {
          initialTodoStates[space.id][index.toString()] = false;
        });
      });
      setTodoStates(initialTodoStates);
    } catch (err) {
      setError('Failed to analyze goal. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setShowGoalForm(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    if (questions.length === 0) {
      getQuestions(goal.trim());
    } else if (Object.keys(answers).length === questions.length) {
      // Only proceed if all questions are answered
      analyzeGoal(goal.trim(), answers);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-4 py-12"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Input Section */}
        <motion.section 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Settings Button */}
          <div className="absolute right-3 top-3 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-[#F5F5F5]"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsAdvancedMode(!isAdvancedMode);
                    }}
                  >
                    <Settings2 className="h-4 w-4 text-[#969FA2]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                  side="left" 
                  className="w-64 p-4 bg-white border-0 shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#969FA2]">Advanced Mode</span>
                      <Checkbox
                        id="advanced-mode"
                        checked={isAdvancedMode}
                        onCheckedChange={(checked) => setIsAdvancedMode(checked as boolean)}
                        className="border-[#EBEBEB] data-[state=checked]:bg-[#969FA2] data-[state=checked]:border-[#969FA2]"
                      />
                    </div>
                    {isAdvancedMode && (
                      <div className="space-y-2">
                        <span className="text-xs text-[#969FA2]">AI Model</span>
                        <div className="grid grid-cols-2 gap-2">
                          {['openai', 'anthropic'].map((provider) => (
                            <button
                              key={provider}
                              type="button"
                              onClick={() => setModelProvider(provider as 'openai' | 'anthropic')}
                              className={cn(
                                'px-3 py-1.5 text-xs rounded-lg transition-all',
                                modelProvider === provider
                                  ? 'bg-[#F5F5F5] text-[#969FA2]'
                                  : 'text-[#969FA2]/80 hover:bg-[#F5F5F5]'
                              )}
                            >
                              {provider === 'openai' ? 'GPT-3.5' : 'Claude'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Main Input */}
          <Textarea
            placeholder="What would you like to learn or achieve? Be as specific as you can..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className={cn(
              "w-full min-h-[140px] px-6 py-5 rounded-2xl",
              "text-xl leading-relaxed resize-none",
              "bg-white border border-[#EBEBEB]",
              "placeholder:text-[#969FA2]/60",
              "focus:outline-none focus:ring-1 focus:ring-[#EBEBEB]",
              "transition-all duration-200"
            )}
            disabled={isLoading}
          />
        </motion.section>

        {/* Question Cards */}
        <AnimatePresence mode="wait">
          {questions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <QuestionCard
                questions={questions}
                answers={answers}
                onAnswerChange={handleAnswerChange}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <AnimatePresence mode="wait">
          {(questions.length === 0 || Object.keys(answers).length === questions.length) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Button
                type="submit"
                className={cn(
                  'w-full h-12 text-base rounded-xl transition-all duration-200',
                  'bg-[#2D2D2D] hover:bg-[#1A1A1A]',
                  'text-white font-normal',
                  'disabled:opacity-50'
                )}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{questions.length === 0 ? 'Analyzing...' : 'Generating...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm">{questions.length === 0 ? 'Get Started' : 'Generate Plan'}</span>
                  </div>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 py-3 rounded-xl bg-[#F5F5F5] text-sm text-[#969FA2]"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}