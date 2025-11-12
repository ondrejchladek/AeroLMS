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
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface TestEditClientProps {
  test: any;
}

export default function TestEditClient({ test }: TestEditClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState(test.title);
  const [description, setDescription] = useState(test.description || '');
  const [passingScore, setPassingScore] = useState(test.passingScore);
  const [timeLimit, setTimeLimit] = useState(test.timeLimit || 0);
  const [isActive, setIsActive] = useState(test.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/tests/${test.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description,
          passingScore,
          timeLimit: timeLimit > 0 ? timeLimit : null,
          isActive
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba při ukládání');
      }

      toast.success('Test byl úspěšně aktualizován');
      router.push(`/trainer/training/${test.training.code}/tests`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Chyba při ukládání testu'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className='mx-auto max-w-4xl space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Editace testu</h1>
            <p className='text-muted-foreground'>
              Školení: {test.training.name} ({test.training.code})
            </p>
          </div>
          <Button variant='outline' asChild className='cursor-pointer'>
            <Link href={`/trainer/training/${test.training.code}/tests`}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Zpět na testy
            </Link>
          </Button>
        </div>

        {/* Edit form */}
        <Card>
          <CardHeader>
            <CardTitle>Informace o testu</CardTitle>
            <CardDescription>Upravte základní nastavení testu</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-6'>
              {/* Test title */}
              <div className='space-y-2'>
                <Label htmlFor='title'>Název testu</Label>
                <Input
                  id='title'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='Zadejte název testu'
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Description */}
              <div className='space-y-2'>
                <Label htmlFor='description'>Popis testu</Label>
                <Textarea
                  id='description'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='Popište účel a obsah testu'
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                {/* Passing score */}
                <div className='space-y-2'>
                  <Label htmlFor='passingScore'>Minimální úspěšnost (%)</Label>
                  <Input
                    id='passingScore'
                    type='number'
                    min='0'
                    max='100'
                    value={passingScore}
                    onChange={(e) =>
                      setPassingScore(parseInt(e.target.value) || 70)
                    }
                    disabled={isLoading}
                  />
                </div>

                {/* Time limit */}
                <div className='space-y-2'>
                  <Label htmlFor='timeLimit'>Časový limit (minuty)</Label>
                  <Input
                    id='timeLimit'
                    type='number'
                    min='0'
                    value={timeLimit}
                    onChange={(e) =>
                      setTimeLimit(parseInt(e.target.value) || 0)
                    }
                    placeholder='0 = bez limitu'
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Active status */}
              <div className='flex items-center space-x-2'>
                <Switch
                  id='isActive'
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isLoading}
                />
                <Label htmlFor='isActive'>
                  {isActive ? 'Test je aktivní' : 'Test je neaktivní'}
                </Label>
              </div>

              {/* Submit buttons */}
              <div className='flex gap-3'>
                <Button type='submit' disabled={isLoading} className='flex-1 cursor-pointer'>
                  {isLoading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Ukládám...
                    </>
                  ) : (
                    <>
                      <Save className='mr-2 h-4 w-4' />
                      Uložit změny
                    </>
                  )}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() =>
                    router.push(`/trainer/training/${test.training.code}/tests`)
                  }
                  disabled={isLoading}
                  className='cursor-pointer'
                >
                  Zrušit
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info about questions */}
        <Card>
          <CardHeader>
            <CardTitle>Otázky testu</CardTitle>
            <CardDescription>
              Test obsahuje {test.questions.length} otázek
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className='cursor-pointer'>
              <Link href={`/trainer/test/${test.id}/questions`}>
                Upravit otázky
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
