'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  User,
  Building,
  Briefcase,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Send,
  FileSignature,
  HelpCircle
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Question {
  id: number;
  order: number;
  type: 'single' | 'multiple';
  question: string;
  options: string[] | null;
  points: number;
  required: boolean;
}

interface TestFormProps {
  test: {
    id: number;
    title: string;
    description: string;
    passingScore: number;
    timeLimit: number | null;
    questions: Question[];
  };
  attemptId: number;
  onSubmit: (data: any) => Promise<void>;
}

export function TestForm({ test, attemptId, onSubmit }: TestFormProps) {
  const { data: session } = useSession();
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [formData, setFormData] = useState({
    signatureData: ''
  });
  const [timeLeft, setTimeLeft] = useState(test.timeLimit ? test.timeLimit * 60 : null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Timer
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (!prev || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: number, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleMultipleChoice = (questionId: number, option: string, checked: boolean) => {
    const current = answers[questionId] || [];
    if (checked) {
      setAnswers(prev => ({
        ...prev,
        [questionId]: [...current, option]
      }));
    } else {
      setAnswers(prev => ({
        ...prev,
        [questionId]: current.filter((o: string) => o !== option)
      }));
    }
  };

  const calculateProgress = () => {
    const answeredQuestions = Object.keys(answers).filter(
      key => answers[parseInt(key)] !== undefined && answers[parseInt(key)] !== ''
    ).length;
    return (answeredQuestions / test.questions.length) * 100;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        answers,
        ...formData
      });
    } catch (error) {
      console.error('Error submitting test:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    // Check required questions
    const requiredQuestions = test.questions.filter(q => q.required);
    for (const question of requiredQuestions) {
      const answer = answers[question.id];
      if (!answer || (Array.isArray(answer) && answer.length === 0)) {
        return false;
      }
    }

    return true;
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'single':
        return (
          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
          >
            <div className="space-y-2">
              {question.options?.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`q${question.id}-${i}`} />
                  <Label htmlFor={`q${question.id}-${i}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      case 'multiple':
        return (
          <div className="space-y-2">
            {question.options?.map((option, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Checkbox
                  id={`q${question.id}-${i}`}
                  checked={(answers[question.id] || []).includes(option)}
                  onCheckedChange={(checked) =>
                    handleMultipleChoice(question.id, option, checked as boolean)
                  }
                />
                <Label htmlFor={`q${question.id}-${i}`} className="font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="border rounded-lg p-4 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{test.title}</h2>
            <p className="text-muted-foreground text-sm mt-1">{test.description}</p>
          </div>
          <div className="flex items-center gap-4">
            {timeLeft && (
              <Badge variant={timeLeft < 300 ? "destructive" : "outline"} className="gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(timeLeft)}
              </Badge>
            )}
            <Badge variant="outline">
              Minimální úspěšnost: {test.passingScore}%
            </Badge>
          </div>
        </div>
        <Progress value={calculateProgress()} className="mt-4" />
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Test Header Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Identifikační údaje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  <User className="h-3 w-3 inline mr-1" />
                  Osobní číslo
                </Label>
                <Input
                  id="code"
                  value={session?.user?.code || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">
                  <User className="h-3 w-3 inline mr-1" />
                  Jméno zaměstnance
                </Label>
                <Input
                  id="name"
                  value={session?.user?.name || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Questions */}
        <div className="space-y-6">
          {test.questions.map((question, index) => (
            <Card key={question.id} className={answers[question.id] ? 'border-primary/50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <CardTitle className="text-base">
                        {question.question}
                      </CardTitle>
                    </div>
                    {question.type === 'multiple' && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        Vyberte všechny správné odpovědi
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {question.required}
                    <Badge variant="secondary" className="text-xs">
                      {question.points} {question.points === 1 ? 'bod' : question.points < 5 ? 'body' : 'bodů'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderQuestion(question)}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit */}
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {!isFormValid() && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Vyplňte prosím všechny povinné otázky.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Zodpovězeno {Object.keys(answers).length} z {test.questions.length} otázek
                </div>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!isFormValid() || isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>Odesílám...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Odeslat test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}