'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  User,
  AlertTriangle,
  Send,
  FileSignature,
  HelpCircle
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const { data: session } = useSession();
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState(
    test.timeLimit ? test.timeLimit * 60 : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);

  // Ref for synchronous navigation check (prevents double alert)
  const allowNavigationRef = useRef(false);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        answers
      });
      setTestCompleted(true); // Mark test as successfully completed
      allowNavigationRef.current = true; // Allow navigation after successful submit
    } catch {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, onSubmit]);

  // Timer
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (!prev || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  // PROTECTION: Abandon test if user leaves without submitting
  useEffect(() => {
    // Warn user before leaving page (browser close/refresh)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Skip if test completed OR navigation already confirmed via handleClick
      if (!testCompleted && !allowNavigationRef.current) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return 'Test není dokončen. Pokud opustíte stránku, test bude označen jako neúspěšný.';
      }
    };

    // Mark test as abandoned on page unload
    const handlePageHide = () => {
      // Skip if test completed OR navigation already confirmed via handleClick
      if (!testCompleted && !allowNavigationRef.current) {
        // Use fetch with keepalive for reliable request on page unload
        fetch(`/api/test-attempts/${attemptId}/abandon`, {
          method: 'POST',
          keepalive: true, // Ensures request completes even if page unloads
          headers: {
            'Content-Type': 'application/json'
          }
        }).catch(() => {
          // Silently fail - page is unloading anyway
        });
      }
    };

    // Intercept navigation via links (sidebar, etc.)
    const handleClick = (e: MouseEvent) => {
      if (testCompleted) return;

      // Check if clicked element is a link or inside a link
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href && !link.href.startsWith('javascript:')) {
        // It's a navigation link
        e.preventDefault();
        e.stopPropagation();

        const confirmed = window.confirm(
          'Test není dokončen. Pokud opustíte stránku, test bude automaticky označen jako neúspěšný.\n\nOpravdu chcete odejít?'
        );

        if (confirmed) {
          // User confirmed - set flag to prevent beforeunload double alert
          allowNavigationRef.current = true;

          // Abandon test
          fetch(`/api/test-attempts/${attemptId}/abandon`, {
            method: 'POST',
            keepalive: true,
            headers: {
              'Content-Type': 'application/json'
            }
          }).catch(() => {
            // Silently fail
          });

          // Navigate to the link (won't trigger beforeunload because ref is true)
          window.location.href = link.href;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('click', handleClick, true); // Use capture phase

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('click', handleClick, true);
    };
  }, [testCompleted, attemptId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: number, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleMultipleChoice = (
    questionId: number,
    option: string,
    checked: boolean
  ) => {
    const current = answers[questionId] || [];
    if (checked) {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: [...current, option]
      }));
    } else {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: current.filter((o: string) => o !== option)
      }));
    }
  };

  const calculateProgress = () => {
    const answeredQuestions = Object.keys(answers).filter(
      (key) =>
        answers[parseInt(key)] !== undefined && answers[parseInt(key)] !== ''
    ).length;
    return (answeredQuestions / test.questions.length) * 100;
  };

  const isFormValid = () => {
    // Must have at least one question
    if (test.questions.length === 0) {
      return false;
    }

    // Check required questions
    const requiredQuestions = test.questions.filter((q) => q.required);
    for (const question of requiredQuestions) {
      const answer = answers[question.id];
      if (!answer || (Array.isArray(answer) && answer.length === 0)) {
        return false;
      }
    }

    return true;
  };

  const renderQuestion = (question: Question) => {
    // Filter out empty options before rendering
    const filteredOptions = question.options?.filter((option) => option && option.trim() !== '') || [];

    switch (question.type) {
      case 'single':
        return (
          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
          >
            <div className='space-y-2'>
              {filteredOptions.map((option, i) => (
                <div key={i} className='flex items-center space-x-2'>
                  <RadioGroupItem value={option} id={`q${question.id}-${i}`} />
                  <Label
                    htmlFor={`q${question.id}-${i}`}
                    className='cursor-pointer font-normal'
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      case 'multiple':
        return (
          <div className='space-y-2'>
            {filteredOptions.map((option, i) => (
              <div key={i} className='flex items-center space-x-2'>
                <Checkbox
                  id={`q${question.id}-${i}`}
                  checked={(answers[question.id] || []).includes(option)}
                  onCheckedChange={(checked) =>
                    handleMultipleChoice(
                      question.id,
                      option,
                      checked as boolean
                    )
                  }
                />
                <Label
                  htmlFor={`q${question.id}-${i}`}
                  className='cursor-pointer font-normal'
                >
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
    <div className='w-full space-y-6'>
      {/* Header */}
      <div className='bg-background rounded-lg border p-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-bold'>{test.title}</h2>
            <p className='text-muted-foreground mt-1 text-sm'>
              {test.description}
            </p>
          </div>
          <div className='flex items-center gap-4'>
            {timeLeft && (
              <Badge
                variant={timeLeft < 300 ? 'destructive' : 'outline'}
                className='gap-1'
              >
                <Clock className='h-3 w-3' />
                {formatTime(timeLeft)}
              </Badge>
            )}
            <Badge variant='outline'>
              Minimální úspěšnost: {test.passingScore}%
            </Badge>
          </div>
        </div>
        <Progress value={calculateProgress()} className='mt-4' />

        {/* Warning about leaving test */}
        <Alert className='mt-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20'>
          <AlertTriangle className='h-4 w-4 text-yellow-600' />
          <AlertDescription className='text-yellow-900 dark:text-yellow-100'>
            <strong>Upozornění:</strong> Neopouštějte tuto stránku během testu.
            Pokud zavřete prohlížeč nebo refreshnete stránku před dokončením,
            test bude automaticky označen jako neúspěšný.
          </AlertDescription>
        </Alert>
      </div>

      {/* Content */}
      <div className='mx-auto max-w-4xl space-y-6'>
        {/* Test Header Form */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileSignature className='h-5 w-5' />
              Identifikační údaje
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='code'>
                  <User className='mr-1 inline h-3 w-3' />
                  Osobní číslo
                </Label>
                <Input
                  id='code'
                  value={session?.user?.cislo || ''}
                  disabled
                  className='bg-muted'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='name'>
                  <User className='mr-1 inline h-3 w-3' />
                  Jméno zaměstnance
                </Label>
                <Input
                  id='name'
                  value={`${session?.user?.firstName || ''} ${session?.user?.lastName || ''}`.trim()}
                  disabled
                  className='bg-muted'
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Questions */}
        <div className='space-y-6'>
          {test.questions.map((question, index) => (
            <Card
              key={question.id}
              className={answers[question.id] ? 'border-primary/50' : ''}
            >
              <CardHeader>
                <div className='flex items-start justify-between'>
                  <div className='space-y-1'>
                    <div className='flex items-start gap-2'>
                      <Badge variant='outline'>{index + 1}</Badge>
                      <CardTitle className='text-base'>
                        {question.question}
                      </CardTitle>
                    </div>
                    {question.type === 'multiple' && (
                      <p className='text-muted-foreground flex items-center gap-1 text-xs'>
                        <HelpCircle className='h-3 w-3' />
                        Vyberte všechny správné odpovědi
                      </p>
                    )}
                  </div>
                  <div className='flex items-center gap-2'>
                    {question.required}
                    <Badge variant='secondary' className='text-xs'>
                      {question.points === 1
                        ? 'Jedna správná odpověď'
                        : 'Více správných odpovědí'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>{renderQuestion(question)}</CardContent>
            </Card>
          ))}
        </div>

        {/* Submit */}
        <Card className='border-primary'>
          <CardContent className='pt-6'>
            <div className='space-y-4'>
              {!isFormValid() && (
                <Alert>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription>
                    Vyplňte prosím všechny povinné otázky.
                  </AlertDescription>
                </Alert>
              )}

              <div className='flex items-center justify-between'>
                <div className='text-muted-foreground text-sm'>
                  Zodpovězeno {Object.keys(answers).length} z{' '}
                  {test.questions.length} otázek
                </div>
                <Button
                  size='lg'
                  onClick={handleSubmit}
                  disabled={!isFormValid() || isSubmitting}
                  className='cursor-pointer gap-2'
                >
                  {isSubmitting ? (
                    <>Odesílám...</>
                  ) : (
                    <>
                      <Send className='h-4 w-4' />
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
