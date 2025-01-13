'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
    <div className="relative">
      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.length === 0 && (
          <div className="flex flex-col gap-4">
            <div className="group relative">
              <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-cyan-500/20 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200" />
              <Input
                placeholder="Enter your goal (e.g., Learn Python for Data Science)"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="relative h-14 border-border bg-background/50 text-lg shadow-lg ring-1 ring-border backdrop-blur-xl transition-all duration-300 focus:ring-2 focus:ring-purple-500/50"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center space-x-6">
                <motion.div whileHover={{ scale: 1.05 }} className="flex items-center space-x-2">
                  <Checkbox
                    id="advanced-mode"
                    checked={isAdvancedMode}
                    onCheckedChange={(checked) => setIsAdvancedMode(checked as boolean)}
                    className="border-border"
                  />
                  <label
                    htmlFor="advanced-mode"
                    className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Wand2 className="h-4 w-4" />
                    Advanced Mode
                  </label>
                </motion.div>

                <div className="flex items-center space-x-6 border-l border-border pl-6">
                  <motion.div whileHover={{ scale: 1.05 }} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="openai"
                      value="openai"
                      checked={modelProvider === 'openai'}
                      onChange={(e) => setModelProvider(e.target.value as 'openai' | 'anthropic')}
                      className="h-4 w-4 accent-purple-500"
                    />
                    <label
                      htmlFor="openai"
                      className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      GPT-3.5
                    </label>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="anthropic"
                      value="anthropic"
                      checked={modelProvider === 'anthropic'}
                      onChange={(e) => setModelProvider(e.target.value as 'openai' | 'anthropic')}
                      className="h-4 w-4 accent-cyan-500"
                    />
                    <label
                      htmlFor="anthropic"
                      className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Claude
                    </label>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        )}

        {questions.length > 0 && (
          <QuestionCard
            questions={questions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity:
              questions.length === 0 || Object.keys(answers).length === questions.length ? 1 : 0,
            y: questions.length === 0 || Object.keys(answers).length === questions.length ? 0 : 20,
          }}
          transition={{ duration: 0.3 }}
          className={cn(
            questions.length > 0 && Object.keys(answers).length < questions.length && 'hidden'
          )}
        >
          <Button
            type="submit"
            className={cn(
              'h-14 w-full text-lg font-medium text-primary-foreground shadow-lg backdrop-blur-xl',
              isAdvancedMode
                ? 'border border-border bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-500/90 hover:to-purple-500/90'
                : 'border border-border bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 hover:from-emerald-500/90 hover:to-cyan-500/90'
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {questions.length === 0 ? 'Analyzing Goal...' : 'Generating Plan...'}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                {questions.length === 0 ? 'Get AI Guidance' : 'Generate Learning Plan'}
              </>
            )}
          </Button>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive backdrop-blur-xl"
          >
            {error}
          </motion.div>
        )}
      </form>
    </div>
  );
}
