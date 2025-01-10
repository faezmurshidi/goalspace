'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Wand2, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useSpaceStore } from '@/lib/store';
import { motion } from 'framer-motion';

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

  const getQuestions = async (goalText: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/analyze-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          goal: goalText,
          modelProvider 
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
          modelProvider
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
    } else {
      analyzeGoal(goal.trim(), answers);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full relative"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-cyan-500/20 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <Input
              placeholder="Enter your goal (e.g., Learn Python for Data Science)"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="relative h-14 text-lg bg-background/50 backdrop-blur-xl border-white/10 shadow-lg ring-1 ring-white/10 focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 shadow-lg">
            <div className="flex items-center space-x-6">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id="advanced-mode"
                  checked={isAdvancedMode}
                  onCheckedChange={(checked) => setIsAdvancedMode(checked as boolean)}
                  className="border-white/20"
                />
                <label
                  htmlFor="advanced-mode"
                  className="text-sm font-medium text-white/70 hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Wand2 className="h-4 w-4" />
                  Advanced Mode
                </label>
              </motion.div>

              <div className="flex items-center space-x-6 border-l border-white/10 pl-6">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="radio"
                    id="openai"
                    value="openai"
                    checked={modelProvider === 'openai'}
                    onChange={(e) => setModelProvider(e.target.value as 'openai' | 'anthropic')}
                    className="h-4 w-4 accent-purple-500"
                  />
                  <label htmlFor="openai" className="text-sm font-medium text-white/70 hover:text-white cursor-pointer">
                    GPT-3.5
                  </label>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="radio"
                    id="anthropic"
                    value="anthropic"
                    checked={modelProvider === 'anthropic'}
                    onChange={(e) => setModelProvider(e.target.value as 'openai' | 'anthropic')}
                    className="h-4 w-4 accent-cyan-500"
                  />
                  <label htmlFor="anthropic" className="text-sm font-medium text-white/70 hover:text-white cursor-pointer">
                    Claude
                  </label>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {questions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 p-6 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 shadow-lg"
          >
            <h3 className="text-xl font-medium text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Help us understand your context better
            </h3>
            {questions.map((q) => (
              <div key={q.id} className="space-y-3">
                <label className="block text-white/90">
                  {q.question}
                  <p className="text-sm text-white/50 mt-1">{q.purpose}</p>
                </label>
                <Input
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Your answer..."
                  className="bg-white/5 backdrop-blur-xl border-white/10 focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            ))}
          </motion.div>
        )}

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button 
            type="submit" 
            className={cn(
              "w-full h-14 text-lg font-medium shadow-lg backdrop-blur-xl",
              isAdvancedMode
                ? "bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-500/90 hover:to-purple-500/90 border border-white/10"
                : "bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 hover:from-emerald-500/90 hover:to-cyan-500/90 border border-white/10"
            )}
            disabled={isLoading || (questions.length > 0 && Object.keys(answers).length < questions.length)}
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
            className="text-red-400 text-sm p-4 bg-red-500/10 backdrop-blur-xl rounded-lg border border-red-500/20"
          >
            {error}
          </motion.div>
        )}
      </form>
    </motion.div>
  );
}