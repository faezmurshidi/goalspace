'use client';

import { motion } from 'framer-motion';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export interface QuestionCardProps {
  question: {
    id: string;
    question: string;
    purpose: string;
  };
  answer: string;
  onAnswerChange: (answer: string) => void;
  isLoading?: boolean;
}

export function QuestionCard({ question, answer, onAnswerChange, isLoading }: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{question.question}</CardTitle>
          <CardDescription>{question.purpose}</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isLoading}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
