'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Zap, Brain, Settings } from 'lucide-react';
import { trackEvent, trackFeatureUsage, trackError } from '@/app/_lib/analytics';

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

// New component for model selection with improved UI
function ModelSelect({ 
  value, 
  onChange 
}: { 
  value: 'openai' | 'anthropic'; 
  onChange: (value: 'openai' | 'anthropic') => void 
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">AI Model</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-1 bg-muted/50 rounded-xl">
        <button
          type="button"
          onClick={() => onChange('openai')}
          className={cn(
            "flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all",
            "hover:bg-background/80 hover:shadow-sm",
            value === 'openai' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground"
          )}
        >
          <Zap className={cn("h-4 w-4", value === 'openai' ? "text-primary" : "text-muted-foreground")} />
          <div className="flex flex-col items-start text-left">
            <span>GPT-3.5</span>
            <span className="text-xs font-normal text-muted-foreground">Fast responses</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange('anthropic')}
          className={cn(
            "flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all",
            "hover:bg-background/80 hover:shadow-sm",
            value === 'anthropic' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground"
          )}
        >
          <Brain className={cn("h-4 w-4", value === 'anthropic' ? "text-primary" : "text-muted-foreground")} />
          <div className="flex flex-col items-start text-left">
            <span>Claude</span>
            <span className="text-xs font-normal text-muted-foreground">Detailed analysis</span>
          </div>
        </button>
      </div>
    </div>
  );
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
      
      // Track question generation start
      trackEvent('goal_analysis_started', {
        goal_length: goalText.length,
        model_provider: modelProvider,
        advanced_mode: isAdvancedMode
      });

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
      
      // Track successful question generation
      trackEvent('questions_generated', {
        question_count: data.questions.length,
        model_provider: modelProvider,
        goal_category: data.category || 'unknown'
      });
    } catch (err) {
      setError('Failed to generate questions. Please try again.');
      console.error(err);
      trackError('goal_analysis_error', 'Failed to generate questions', {
        goal_length: goalText.length,
        model_provider: modelProvider,
        error_message: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeGoal = async (goalText: string, userAnswers: { [key: string]: string }) => {
    try {
      setIsLoading(true);
      setError('');
      
      // Track goal analysis with answers
      trackEvent('goal_analysis_with_answers', {
        goal_length: goalText.length,
        model_provider: modelProvider,
        advanced_mode: isAdvancedMode,
        answer_count: Object.keys(userAnswers).length
      });

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

      // Track successful space generation
      trackFeatureUsage('spaces_generated', {
        space_count: data.spaces.length,
        model_provider: modelProvider,
        advanced_mode: isAdvancedMode,
        goal_type: data.goal_type || 'unknown'
      });

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
      trackError('goal_analysis_error', 'Failed to generate spaces', {
        goal_length: goalText.length,
        model_provider: modelProvider,
        advanced_mode: isAdvancedMode,
        error_message: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
      setShowGoalForm(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    
    // Track form submission
    trackEvent('goal_form_submitted', {
      has_questions: questions.length > 0,
      goal_length: goal.trim().length,
      model_provider: modelProvider,
      advanced_mode: isAdvancedMode
    });

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
                    className="h-7 w-7 rounded-full p-0 hover:bg-accent/50"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsAdvancedMode(!isAdvancedMode);
                    }}
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                  side="left" 
                  className="w-72 p-4 bg-background border-border shadow-md"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Advanced Mode</span>
                      <Checkbox
                        id="advanced-mode"
                        checked={isAdvancedMode}
                        onCheckedChange={(checked) => setIsAdvancedMode(checked as boolean)}
                        className="text-primary border-input"
                      />
                    </div>
                    {isAdvancedMode && (
                      <ModelSelect
                        value={modelProvider}
                        onChange={setModelProvider}
                      />
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
              "bg-background border border-input",
              "placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-1 focus:ring-primary/10",
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
                  'bg-primary hover:bg-primary/90',
                  'text-primary-foreground font-medium',
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
              className="px-4 py-3 rounded-xl bg-destructive/10 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}