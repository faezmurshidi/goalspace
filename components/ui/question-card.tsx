import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface Question {
  id: string;
  question: string;
  purpose: string;
}

interface QuestionCardProps {
  questions: Question[];
  answers: { [key: string]: string };
  onAnswerChange: (questionId: string, answer: string) => void;
}

export function QuestionCard({ questions, answers, onAnswerChange }: QuestionCardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 1;
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const currentQuestions = questions.slice(
    currentPage * questionsPerPage,
    (currentPage + 1) * questionsPerPage
  );

  // Calculate progress
  const progress = (Object.keys(answers).length / questions.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Help us understand your goal
              </CardTitle>
              <CardDescription>
                Question {currentPage + 1} of {questions.length}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-2 w-[60px]" />
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentQuestions.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-medium">{q.question}</h3>
                <p className="text-sm text-muted-foreground">{q.purpose}</p>
              </div>
              <div className="relative">
                <Input
                  value={answers[q.id] || ''}
                  onChange={(e) => onAnswerChange(q.id, e.target.value)}
                  placeholder="Your answer..."
                  className="min-h-[100px] resize-none rounded-lg border-border bg-background/50 p-4 text-base backdrop-blur-xl focus:ring-2 focus:ring-purple-500/50"
                />
                <div className="pointer-events-none absolute bottom-3 right-3 opacity-50">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </motion.div>
          ))}

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentPage === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }).map((_, index) => (
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
                  onClick={() => setCurrentPage(index)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentPage === totalPages - 1}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
