'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  MoveUp,
  MoveDown
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface QuestionsManagementClientProps {
  test: any;
}

type QuestionType = 'single' | 'multiple';

interface Question {
  id?: number;
  order: number;
  type: QuestionType;
  question: string;
  options: string[] | null;
  correctAnswer: any;
  points: number;
  required: boolean;
}

export default function QuestionsManagementClient({
  test
}: QuestionsManagementClientProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(
    test.questions.map((q: any) => {
      const options = q.options ? JSON.parse(q.options) : null;
      let correctAnswer = q.correctAnswer || '';

      // Parse correctAnswer if it's a JSON string
      try {
        if (typeof correctAnswer === 'string' && correctAnswer.startsWith('[')) {
          correctAnswer = JSON.parse(correctAnswer);
        }
      } catch {
        // Keep as string if parse fails
      }

      return {
        ...q,
        options,
        correctAnswer
      };
    })
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Helper function to save questions to API
  const saveQuestionsToApi = async (questionsToSave: Question[]) => {
    try {
      const response = await fetch(`/api/tests/${test.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questions: questionsToSave.map((q) => ({
            ...q,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer
              ? typeof q.correctAnswer === 'object'
                ? JSON.stringify(q.correctAnswer)
                : q.correctAnswer
              : ''
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba při ukládání');
      }

      toast.success('Změny byly automaticky uloženy');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Chyba při ukládání změn'
      );
      throw error;
    }
  };

  // Form state for new/edit question
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    order: questions.length,
    type: 'single',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 1,
    required: true
  });

  const handleAddQuestion = () => {
    setCurrentQuestion({
      order: questions.length,
      type: 'single',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      required: true
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditQuestion = (index: number) => {
    const q = questions[index];
    const options = q.options || ['', '', '', ''];

    // Convert correctAnswer from option values back to indices for UI
    let correctAnswerIndices: any = q.correctAnswer;
    if (q.options) {
      if (q.type === 'single') {
        // Find index of the correct option value
        const optionIndex = options.indexOf(q.correctAnswer);
        correctAnswerIndices = optionIndex !== -1 ? optionIndex.toString() : '';
      } else if (q.type === 'multiple') {
        // Find indices of all correct option values
        if (Array.isArray(q.correctAnswer)) {
          correctAnswerIndices = q.correctAnswer
            .map((val: string) => options.indexOf(val))
            .filter((idx: number) => idx !== -1)
            .map((idx: number) => idx.toString());
        }
      }
    }

    setCurrentQuestion({
      ...q,
      options,
      correctAnswer: correctAnswerIndices
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!currentQuestion.question.trim()) {
      toast.error('Otázka musí být vyplněna');
      return;
    }

    // Validate correct answers are selected
    if (currentQuestion.type === 'single') {
      if (!currentQuestion.correctAnswer || currentQuestion.correctAnswer === '') {
        toast.error('Musíte vybrat správnou odpověď');
        return;
      }
    } else if (currentQuestion.type === 'multiple') {
      if (!Array.isArray(currentQuestion.correctAnswer) || currentQuestion.correctAnswer.length === 0) {
        toast.error('Musíte vybrat alespoň jednu správnou odpověď');
        return;
      }
    }

    // Filter out empty options before saving
    const filteredOptions = currentQuestion.options
      ? currentQuestion.options.filter((opt) => opt && opt.trim() !== '')
      : null;

    // Convert correctAnswer from indices to actual option values
    let correctAnswerValue: any = currentQuestion.correctAnswer;
    if (currentQuestion.options && filteredOptions) {
      if (currentQuestion.type === 'single') {
        // Convert single index to option value
        const index = parseInt(currentQuestion.correctAnswer);
        if (!isNaN(index) && currentQuestion.options[index]) {
          correctAnswerValue = currentQuestion.options[index];
        }
      } else if (currentQuestion.type === 'multiple') {
        // Convert array of indices to array of option values
        if (Array.isArray(currentQuestion.correctAnswer)) {
          correctAnswerValue = currentQuestion.correctAnswer
            .map((idx: string) => {
              const index = parseInt(idx);
              return !isNaN(index) && currentQuestion.options
                ? currentQuestion.options[index]
                : null;
            })
            .filter((val) => val !== null && val.trim() !== '');
        }
      }
    }

    // AUTO-SET POINTS: Based on number of correct answers
    let autoPoints = currentQuestion.points;
    if (currentQuestion.type === 'multiple' && Array.isArray(correctAnswerValue)) {
      // For multiple choice: 1 point per correct answer
      autoPoints = correctAnswerValue.length || 1;
    } else if (currentQuestion.type === 'single') {
      // For single choice: always 1 point
      autoPoints = 1;
    }

    const questionToSave = {
      ...currentQuestion,
      options: filteredOptions,
      correctAnswer: correctAnswerValue,
      points: autoPoints, // Override with auto-calculated points
      required: true // All questions are always required
    };

    const newQuestions = [...questions];
    if (editingIndex !== null) {
      newQuestions[editingIndex] = questionToSave;
    } else {
      newQuestions.push(questionToSave);
    }

    // Update order
    newQuestions.forEach((q, i) => (q.order = i));

    setQuestions(newQuestions);
    setIsDialogOpen(false);

    // Auto-save changes
    await saveQuestionsToApi(newQuestions);
  };

  const handleDeleteQuestion = async (index: number) => {
    if (confirm('Opravdu chcete smazat tuto otázku?')) {
      const newQuestions = questions.filter((_, i) => i !== index);
      newQuestions.forEach((q, i) => (q.order = i));
      setQuestions(newQuestions);

      // Auto-save changes
      await saveQuestionsToApi(newQuestions);
    }
  };

  const handleMoveQuestion = async (
    index: number,
    direction: 'up' | 'down'
  ) => {
    const newQuestions = [...questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < newQuestions.length) {
      [newQuestions[index], newQuestions[newIndex]] = [
        newQuestions[newIndex],
        newQuestions[index]
      ];
      newQuestions.forEach((q, i) => (q.order = i));
      setQuestions(newQuestions);

      // Auto-save changes
      await saveQuestionsToApi(newQuestions);
    }
  };

  const getQuestionTypeLabel = (type: QuestionType) => {
    const labels = {
      single: 'Jedna odpověď',
      multiple: 'Více odpovědí'
    };
    return labels[type];
  };

  return (
    <PageContainer>
      <div className='w-full max-w-full min-w-0 space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Správa otázek</h1>
            <p className='text-muted-foreground'>
              Test: {test.title} | Školení: {test.training.name}
            </p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' asChild className='cursor-pointer'>
              <Link href={`/trainer/training/${test.training.code}/tests`}>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Zpět na testy
              </Link>
            </Button>
            <Button onClick={handleAddQuestion} className='cursor-pointer'>
              <Plus className='mr-2 h-4 w-4' />
              Nová otázka
            </Button>
          </div>
        </div>

        {/* Questions table */}
        <Card className="min-w-0 max-w-full">
          <CardHeader>
            <CardTitle>Seznam otázek</CardTitle>
            <CardDescription>
              Celkem {questions.length} otázek,{' '}
              {questions.reduce((sum, q) => sum + q.points, 0)} bodů
            </CardDescription>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className='text-muted-foreground py-8 text-center'>
                Zatím nejsou vytvořeny žádné otázky
              </div>
            ) : (
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-12'>#</TableHead>
                      <TableHead>Otázka</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Body</TableHead>
                      <TableHead>Povinná</TableHead>
                      <TableHead>Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className='max-w-md truncate'>
                          {question.question}
                        </TableCell>
                        <TableCell>
                          {getQuestionTypeLabel(question.type)}
                        </TableCell>
                        <TableCell>{question.points}</TableCell>
                        <TableCell>{question.required ? 'Ano' : 'Ne'}</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className='flex gap-1'>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    className='cursor-pointer'
                                    onClick={() => handleMoveQuestion(index, 'up')}
                                    disabled={index === 0}
                                  >
                                    <MoveUp className='h-4 w-4 mr-1' />
                                    <span>Nahoru</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Posunout otázku nahoru</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    className='cursor-pointer'
                                    onClick={() => handleMoveQuestion(index, 'down')}
                                    disabled={index === questions.length - 1}
                                  >
                                    <MoveDown className='h-4 w-4 mr-1' />
                                    <span>Dolů</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Posunout otázku dolů</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    className='cursor-pointer'
                                    onClick={() => handleEditQuestion(index)}
                                  >
                                    <Edit className='h-4 w-4 mr-1' />
                                    <span>Editovat</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Upravit otázku</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    className='cursor-pointer'
                                    onClick={() => handleDeleteQuestion(index)}
                                  >
                                    <Trash2 className='h-4 w-4 text-red-500 mr-1' />
                                    <span>Smazat</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Smazat otázku</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>

        {/* Question dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className='max-h-[90vh] max-w-3xl overflow-y-auto'>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Upravit otázku' : 'Nová otázka'}
              </DialogTitle>
              <DialogDescription>
                Vytvořte nebo upravte testovou otázku
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='type'>Typ otázky</Label>
                <Select
                  value={currentQuestion.type}
                  onValueChange={(value: QuestionType) =>
                    setCurrentQuestion({ ...currentQuestion, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='single'>Jedna odpověď</SelectItem>
                    <SelectItem value='multiple'>Více odpovědí</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='question'>Text otázky</Label>
                <Textarea
                  id='question'
                  value={currentQuestion.question}
                  onChange={(e) =>
                    setCurrentQuestion({
                      ...currentQuestion,
                      question: e.target.value
                    })
                  }
                  placeholder='Zadejte znění otázky'
                  rows={3}
                />
              </div>

              {/* Options for single/multiple choice */}
              {(currentQuestion.type === 'single' ||
                currentQuestion.type === 'multiple') && (
                <div className='grid gap-2'>
                  <Label>Možnosti odpovědí</Label>
                  {currentQuestion.options?.map((option, i) => (
                    <div key={i} className='flex items-center gap-2'>
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [
                            ...(currentQuestion.options || [])
                          ];
                          newOptions[i] = e.target.value;
                          setCurrentQuestion({
                            ...currentQuestion,
                            options: newOptions
                          });
                        }}
                        placeholder={`Možnost ${i + 1}`}
                      />
                      {currentQuestion.type === 'single' ? (
                        <Checkbox
                          checked={
                            currentQuestion.correctAnswer === i.toString()
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCurrentQuestion({
                                ...currentQuestion,
                                correctAnswer: i.toString()
                              });
                            }
                          }}
                        />
                      ) : (
                        <Checkbox
                          checked={
                            Array.isArray(currentQuestion.correctAnswer) &&
                            currentQuestion.correctAnswer.includes(i.toString())
                          }
                          onCheckedChange={(checked) => {
                            const current = Array.isArray(
                              currentQuestion.correctAnswer
                            )
                              ? currentQuestion.correctAnswer
                              : [];
                            if (checked) {
                              setCurrentQuestion({
                                ...currentQuestion,
                                correctAnswer: [...current, i.toString()]
                              });
                            } else {
                              setCurrentQuestion({
                                ...currentQuestion,
                                correctAnswer: current.filter(
                                  (x) => x !== i.toString()
                                )
                              });
                            }
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className='grid gap-2'>
                <Label htmlFor='points'>Body za otázku</Label>
                {currentQuestion.type === 'multiple' ? (
                  <>
                    <Input
                      id='points'
                      type='number'
                      value={
                        Array.isArray(currentQuestion.correctAnswer)
                          ? currentQuestion.correctAnswer.length
                          : 0
                      }
                      disabled
                      className='bg-muted'
                    />
                    <p className='text-muted-foreground text-xs'>
                      Automaticky: 1 bod za každou správnou odpověď
                    </p>
                  </>
                ) : (
                  <>
                    <Input
                      id='points'
                      type='number'
                      value={
                        currentQuestion.correctAnswer && currentQuestion.correctAnswer !== ''
                          ? 1
                          : 0
                      }
                      disabled
                      className='bg-muted'
                    />
                    <p className='text-muted-foreground text-xs'>
                      Automaticky: 1 bod za správnou odpověď
                    </p>
                  </>
                )}
                <p className='text-muted-foreground text-xs mt-2'>
                  ℹ️ Všechny otázky jsou automaticky povinné
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setIsDialogOpen(false)} className='cursor-pointer'>
                Zrušit
              </Button>
              <Button onClick={handleSaveQuestion} className='cursor-pointer'>
                {editingIndex !== null ? 'Uložit změny' : 'Přidat otázku'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
