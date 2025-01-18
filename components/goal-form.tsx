'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QuestionCard } from '@/components/ui/question-card';

interface Question {
  id: string;
  question: string;
  purpose: string;
}

const questions: Question[] = [
  {
    id: 'goal',
    question: 'What is your goal?',
    purpose: 'Help us understand what you want to achieve',
  },
  {
    id: 'timeline',
    question: 'When do you want to achieve this goal?',
    purpose: 'Set a realistic timeline for your goal',
  },
  {
    id: 'motivation',
    question: 'Why is this goal important to you?',
    purpose: 'Understanding your motivation helps you stay committed',
  },
];

export interface GoalFormProps {
  onSubmit: (answers: { [key: string]: string }) => void;
  isLoading?: boolean;
}

export function GoalForm({ onSubmit, isLoading }: GoalFormProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});

  const handleNext = () => {
    if (currentPage < questions.length - 1) {
      setCurrentPage((prev) => prev + 1);
    } else {
      onSubmit(answers);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleAnswerChange = (answer: string) => {
    const currentQuestion = questions[currentPage];
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  // Calculate progress
  const progress = (Object.keys(answers).length / questions.length) * 100;

  const currentQuestion = questions[currentPage];
  const currentAnswer = answers[currentQuestion.id] || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <div className="flex items-center justify-between px-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Create a New Goal
          </h2>
          <p className="text-sm text-muted-foreground">
            Question {currentPage + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-2 w-[60px]" />
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        answer={currentAnswer}
        onAnswerChange={handleAnswerChange}
        isLoading={isLoading}
      />

      <div className="flex items-center justify-between px-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentPage === 0 || isLoading}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="flex gap-1">
          {questions.map((_, index) => (
            <motion.div
              key={index}
              className={`h-1.5 w-1.5 rounded-full ${
                index === currentPage
                  ? 'bg-primary'
                  : index < currentPage
                    ? 'bg-primary/30'
                    : 'bg-muted'
              }`}
              whileHover={{ scale: 1.2 }}
              onClick={() => !isLoading && setCurrentPage(index)}
              style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
            />
          ))}
        </div>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={!currentAnswer || isLoading}
          className="flex items-center gap-2"
        >
          {currentPage === questions.length - 1 ? 'Submit' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
