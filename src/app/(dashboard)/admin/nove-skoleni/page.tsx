'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import './editor.css';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Trash2,
  Save,
  BookOpen,
  FileQuestion,
  AlertCircle,
  CheckCircle,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link,
  Image
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import UnderlineExtension from '@tiptap/extension-underline';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

// TipTap Editor Toolbar Component
function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;

  return (
    <div className="border-b p-2 flex gap-1 flex-wrap">
      <Button
        size="sm"
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBold().run()}
        type="button"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        type="button"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        type="button"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-8" />
      <Button
        size="sm"
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        type="button"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        type="button"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-8" />
      <Button
        size="sm"
        variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        type="button"
      >
        H1
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        type="button"
      >
        H2
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        type="button"
      >
        H3
      </Button>
    </div>
  );
}

export default function NoveSkoleniPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Training form data
  const [trainingData, setTrainingData] = useState({
    name: '',
    description: '',
    content: '',
    url: ''
  });

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      LinkExtension,
      ImageExtension
    ],
    content: '<p>Začněte psát obsah školení...</p>',
    onUpdate: ({ editor }) => {
      setTrainingData(prev => ({ ...prev, content: editor.getHTML() }));
    },
    immediatelyRender: false,
  });

  // Test form data
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    passingScore: 70,
    timeLimit: 30
  });

  // Questions
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 'a',
      points: 1
    }
  ]);

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 'a',
      points: 1
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleQuestionChange = (id: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleSubmit = async () => {
    // Validate form
    if (!trainingData.name || !trainingData.description || !trainingData.content) {
      setError('Vyplňte všechna povinná pole školení');
      return;
    }

    if (!testData.title || !testData.description) {
      setError('Vyplňte název a popis testu');
      return;
    }

    // Validate questions
    for (const question of questions) {
      if (!question.question || question.options.some(opt => !opt)) {
        setError('Vyplňte všechny otázky a odpovědi');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create training
      const trainingResponse = await fetch('/api/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trainingData,
          url: trainingData.url || trainingData.name.toLowerCase().replace(/\s+/g, '-')
        })
      });

      if (!trainingResponse.ok) {
        throw new Error('Nepodařilo se vytvořit školení');
      }

      const { training } = await trainingResponse.json();

      // Create test
      const testResponse = await fetch(`/api/trainings/${training.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testData,
          questions: questions.map((q, index) => ({
            order: index + 1,
            type: 'single',
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points,
            required: true
          }))
        })
      });

      if (!testResponse.ok) {
        throw new Error('Nepodařilo se vytvořit test');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/training/${trainingData.url || trainingData.name.toLowerCase().replace(/\s+/g, '-')}`);
      }, 2000);

    } catch (error) {
      console.error('Error creating training:', error);
      setError(error instanceof Error ? error.message : 'Došlo k chybě při vytváření školení');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nové školení</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Školení bylo úspěšně vytvořeno! Přesměrování...
            </AlertDescription>
          </Alert>
        )}

        {/* Training Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Informace o školení
            </CardTitle>
            <CardDescription>
              Základní údaje o novém školení
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Název školení *</Label>
                <Input
                  id="name"
                  value={trainingData.name}
                  onChange={(e) => setTrainingData({ ...trainingData, name: e.target.value })}
                  placeholder="např. Bezpečnost práce"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL adresa (volitelné)</Label>
                <Input
                  id="url"
                  value={trainingData.url}
                  onChange={(e) => setTrainingData({ ...trainingData, url: e.target.value })}
                  placeholder="např. bezpecnost-prace"
                />
                <p className="text-xs text-muted-foreground">
                  Pokud nevyplníte, vygeneruje se automaticky
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Popis školení *</Label>
              <Textarea
                id="description"
                value={trainingData.description}
                onChange={(e) => setTrainingData({ ...trainingData, description: e.target.value })}
                placeholder="Stručný popis školení..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Obsah školení *</Label>
              <div className="border rounded-md">
                <EditorToolbar editor={editor} />
                <EditorContent
                  editor={editor}
                  className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Test Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              Test ke školení
            </CardTitle>
            <CardDescription>
              Nastavení testu a otázky
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test-title">Název testu *</Label>
                <Input
                  id="test-title"
                  value={testData.title}
                  onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                  placeholder="např. Test z bezpečnosti práce"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passing-score">Minimální úspěšnost (%)</Label>
                  <Input
                    id="passing-score"
                    type="number"
                    value={testData.passingScore}
                    onChange={(e) => setTestData({ ...testData, passingScore: parseInt(e.target.value) || 70 })}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time-limit">Časový limit (minuty)</Label>
                  <Input
                    id="time-limit"
                    type="number"
                    value={testData.timeLimit}
                    onChange={(e) => setTestData({ ...testData, timeLimit: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-description">Popis testu *</Label>
              <Textarea
                id="test-description"
                value={testData.description}
                onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                placeholder="Instrukce pro test..."
                rows={2}
              />
            </div>

            <Separator className="my-6" />

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Otázky</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddQuestion}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Přidat otázku
                </Button>
              </div>

              {questions.map((question, qIndex) => (
                <Card key={question.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Otázka {qIndex + 1}</Badge>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`points-${question.id}`} className="text-sm">Body:</Label>
                          <Input
                            id={`points-${question.id}`}
                            type="number"
                            value={question.points}
                            onChange={(e) => handleQuestionChange(question.id, 'points', parseInt(e.target.value) || 1)}
                            className="w-16 h-8"
                            min="1"
                          />
                        </div>
                        {questions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Znění otázky</Label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => handleQuestionChange(question.id, 'question', e.target.value)}
                        placeholder="Zadejte znění otázky..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Možnosti odpovědí</Label>
                      {['a', 'b', 'c', 'd'].map((letter, index) => (
                        <div key={letter} className="flex items-center gap-2">
                          <Badge variant="secondary" className="w-8">{letter})</Badge>
                          <Input
                            value={question.options[index]}
                            onChange={(e) => handleOptionChange(question.id, index, e.target.value)}
                            placeholder={`Odpověď ${letter}`}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label>Správná odpověď</Label>
                      <RadioGroup
                        value={question.correctAnswer}
                        onValueChange={(value) => handleQuestionChange(question.id, 'correctAnswer', value)}
                      >
                        <div className="flex gap-6">
                          {['a', 'b', 'c', 'd'].map((letter) => (
                            <div key={letter} className="flex items-center space-x-2">
                              <RadioGroupItem value={letter} id={`correct-${question.id}-${letter}`} />
                              <Label htmlFor={`correct-${question.id}-${letter}`}>{letter}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2"
            size="lg"
          >
            {isSubmitting ? (
              <>Ukládání...</>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Uložit školení
              </>
            )}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}