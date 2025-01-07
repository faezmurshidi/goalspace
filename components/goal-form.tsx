'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Brain, Loader2, Target, List, Clock, CheckCircle2, Circle, ChartBar } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useSpaceStore, type Space } from '@/lib/store';

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
  
  const { spaces, setSpaces, setCurrentGoal, todoStates, setTodoStates, toggleTodo } = useSpaceStore();

  const getQuestions = async (goalText: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/analyze-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalText }),
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
        body: JSON.stringify({ goal: goalText, answers: userAnswers }),
      });

      if (!response.ok) throw new Error('Failed to analyze goal');
      
      const data = await response.json();
      setSpaces(data.spaces);
      setCurrentGoal(goalText);
      
      // Initialize todo states for new spaces
      const initialTodoStates: { [key: string]: { [key: string]: boolean } } = {};
      data.spaces.forEach((space: Space) => {
        initialTodoStates[space.id] = {};
        space.to_do_list.forEach((_: string, index: number) => {
          initialTodoStates[space.id][index.toString()] = false;
        });
      });
      setTodoStates(initialTodoStates);

      // Redirect to dashboard after spaces are created
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to analyze goal. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
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

  const handleStartSpace = (spaceId: string) => {
    router.push(`/space/${spaceId}`);
  };

  const handleReset = () => {
    setSpaces([]);
    setGoal('');
    setTodoStates({});
    setQuestions([]);
    setAnswers({});
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <Input
          placeholder="Enter your goal (e.g., Learn Python for Data Science)"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="h-12 text-lg"
          disabled={isLoading}
        />
        {questions.length > 0 && (
          <div className="space-y-4 mt-4">
            <h3 className="text-lg font-medium">Help us understand your context better</h3>
            {questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {q.question}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{q.purpose}</p>
                </label>
                <Input
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Your answer..."
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        )}
        <Button 
          type="submit" 
          className="h-12 px-8"
          disabled={isLoading || (questions.length > 0 && Object.keys(answers).length < questions.length)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {questions.length === 0 ? 'Analyzing Goal...' : 'Generating Plan...'}
            </>
          ) : (
            questions.length === 0 ? 'Get AI Guidance' : 'Generate Learning Plan'
          )}
        </Button>
      </form>

      {error && (
        <div className="text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      {spaces.length > 0 && (
        <div className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            {spaces.map((space) => (
              <Card 
                key={space.id} 
                className={cn(
                  "flex flex-col border-l-4 shadow-md hover:shadow-lg transition-shadow",
                  space.category === 'learning' 
                    ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/10" 
                    : "border-l-green-500 bg-green-50/50 dark:bg-green-950/10"
                )}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      {space.category === 'learning' ? (
                        <Brain className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Target className="h-5 w-5 text-green-500" />
                      )}
                      {space.title}
                    </CardTitle>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      space.category === 'learning'
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    )}>
                      {space.category.charAt(0).toUpperCase() + space.category.slice(1)}
                    </span>
                  </div>
                  <CardDescription className="mt-2.5">{space.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Mentor Section */}
                  <div className={cn(
                    "p-4 rounded-lg",
                    space.category === 'learning'
                      ? "bg-blue-100/50 dark:bg-blue-900/20"
                      : "bg-green-100/50 dark:bg-green-900/20"
                  )}>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-blue-500" />
                      Your AI Mentor
                    </h3>
                    <div className="space-y-2.5">
                      <p className="font-medium text-sm">{space.mentor.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                        "{space.mentor.introduction}"
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Teaching style: {space.mentor.personality}
                      </p>
                      <div className="text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Expert in: </span>
                        {space.mentor.expertise.join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* System Prompt Section */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2 text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-blue-500" />
                      System Prompt
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{space.mentor.system_prompt}</p>
                  </div>

                  {/* Objectives Section */}
                  <div>
                    <h3 className="font-medium mb-3 text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      Learning Objectives
                    </h3>
                    <ul className="text-sm space-y-2">
                      {space.objectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-500 text-xs mt-1">•</span>
                          <span className="text-gray-600 dark:text-gray-300">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Prerequisites Section */}
                  {space.prerequisites.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3 text-sm flex items-center gap-2">
                        <List className="h-4 w-4 text-orange-500" />
                        Prerequisites
                      </h3>
                      <ul className="text-sm space-y-2">
                        {space.prerequisites.map((prerequisite, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-orange-500 text-xs mt-1">•</span>
                            <span className="text-gray-600 dark:text-gray-300">{prerequisite}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Time to Complete Section */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-300">{space.time_to_complete}</span>
                  </div>

                  {/* To-Do List Section */}
                  <div>
                    <h3 className="font-medium mb-3 text-sm flex items-center gap-2">
                      <List className="h-4 w-4 text-blue-500" />
                      To-Do List
                    </h3>
                    <div className="space-y-2.5">
                      {space.to_do_list.map((task, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <Checkbox
                            id={`${space.id}-todo-${index}`}
                            checked={todoStates[space.id]?.[index] || false}
                            onCheckedChange={() => toggleTodo(space.id, index.toString())}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`${space.id}-todo-${index}`}
                            className={cn(
                              "text-sm flex-1 cursor-pointer",
                              todoStates[space.id]?.[index]
                                ? "line-through text-gray-400"
                                : "text-gray-600 dark:text-gray-300"
                            )}
                          >
                            {task}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Get Started Button */}
                  <div className="pt-4 mt-auto">
                    <Button
                      className={cn(
                        "w-full",
                        space.category === 'learning'
                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      )}
                      onClick={() => handleStartSpace(space.id)}
                    >
                      Let's Get Started
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleReset}
          >
            Set Another Goal
          </Button>
          <Button
            variant="default"
            className="w-full"
            onClick={() => router.push('/dashboard')}
          >
            <ChartBar className="mr-2 h-4 w-4" />
            View Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}