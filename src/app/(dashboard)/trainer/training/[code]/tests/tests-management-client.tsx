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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileText,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TestsManagementClientProps {
  training: any;
}

export default function TestsManagementClient({
  training
}: TestsManagementClientProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for new test
  const [newTest, setNewTest] = useState({
    title: '',
    description: '',
    passingScore: 70,
    timeLimit: 0
  });

  const handleCreateTest = async () => {
    setIsCreating(true);

    try {
      const response = await fetch(`/api/trainings/${training.id}/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newTest,
          timeLimit: newTest.timeLimit > 0 ? newTest.timeLimit : null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba při vytváření testu');
      }

      await response.json();
      toast.success('Test byl úspěšně vytvořen');

      // Refresh page to get updated data
      router.refresh();
      setIsCreateOpen(false);
      setNewTest({
        title: '',
        description: '',
        passingScore: 70,
        timeLimit: 0
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Chyba při vytváření testu'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (testId: number, currentState: boolean) => {
    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !currentState
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba při změně stavu');
      }

      toast.success(
        currentState ? 'Test byl deaktivován' : 'Test byl aktivován'
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Chyba při změně stavu testu'
      );
    }
  };

  const handleDeleteTest = async (testId: number) => {
    if (!confirm('Opravdu chcete smazat tento test? Tato akce je nevratná.')) {
      return;
    }

    setIsDeleting(testId);

    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba při mazání testu');
      }

      toast.success('Test byl úspěšně smazán');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Chyba při mazání testu'
      );
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'd. M. yyyy', { locale: cs });
    } catch {
      return '-';
    }
  };

  return (
    <PageContainer>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Správa testů</h1>
            <p className='text-muted-foreground'>
              Školení: <span className='font-semibold'>{training.name}</span> (
              {training.code})
            </p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' asChild>
              <Link href='/trainer'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Zpět na přehled
              </Link>
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className='mr-2 h-4 w-4' />
                  Nový test
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-2xl'>
                <DialogHeader>
                  <DialogTitle>Vytvořit nový test</DialogTitle>
                  <DialogDescription>
                    Vytvořte nový test pro školení {training.name}
                  </DialogDescription>
                </DialogHeader>
                <div className='grid gap-4 py-4'>
                  <div className='grid gap-2'>
                    <Label htmlFor='title'>Název testu</Label>
                    <Input
                      id='title'
                      value={newTest.title}
                      onChange={(e) =>
                        setNewTest({ ...newTest, title: e.target.value })
                      }
                      placeholder='Např. Závěrečný test'
                      required
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor='description'>Popis testu</Label>
                    <Textarea
                      id='description'
                      value={newTest.description}
                      onChange={(e) =>
                        setNewTest({ ...newTest, description: e.target.value })
                      }
                      placeholder='Popis účelu a obsahu testu'
                      rows={3}
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='grid gap-2'>
                      <Label htmlFor='passingScore'>
                        Minimální úspěšnost (%)
                      </Label>
                      <Input
                        id='passingScore'
                        type='number'
                        min='0'
                        max='100'
                        value={newTest.passingScore}
                        onChange={(e) =>
                          setNewTest({
                            ...newTest,
                            passingScore: parseInt(e.target.value) || 70
                          })
                        }
                      />
                    </div>
                    <div className='grid gap-2'>
                      <Label htmlFor='timeLimit'>Časový limit (minuty)</Label>
                      <Input
                        id='timeLimit'
                        type='number'
                        min='0'
                        value={newTest.timeLimit}
                        onChange={(e) =>
                          setNewTest({
                            ...newTest,
                            timeLimit: parseInt(e.target.value) || 0
                          })
                        }
                        placeholder='0 = bez limitu'
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={() => setIsCreateOpen(false)}
                    disabled={isCreating}
                  >
                    Zrušit
                  </Button>
                  <Button
                    onClick={handleCreateTest}
                    disabled={isCreating || !newTest.title}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Vytvářím...
                      </>
                    ) : (
                      'Vytvořit test'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tests table */}
        <Card>
          <CardHeader>
            <CardTitle>Seznam testů</CardTitle>
            <CardDescription>Všechny testy pro toto školení</CardDescription>
          </CardHeader>
          <CardContent>
            {training.tests.length === 0 ? (
              <div className='text-muted-foreground py-8 text-center'>
                Zatím nejsou vytvořeny žádné testy
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Název testu</TableHead>
                    <TableHead>Popis</TableHead>
                    <TableHead>Úspěšnost</TableHead>
                    <TableHead>Časový limit</TableHead>
                    <TableHead>Otázky</TableHead>
                    <TableHead>Pokusy</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Vytvořeno</TableHead>
                    <TableHead>Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {training.tests.map((test: any) => (
                    <TableRow key={test.id}>
                      <TableCell className='font-medium'>
                        {test.title}
                      </TableCell>
                      <TableCell>{test.description || '-'}</TableCell>
                      <TableCell>{test.passingScore}%</TableCell>
                      <TableCell>
                        {test.timeLimit
                          ? `${test.timeLimit} min`
                          : 'Bez limitu'}
                      </TableCell>
                      <TableCell>
                        <Badge variant='secondary'>
                          {test._count.questions}
                        </Badge>
                      </TableCell>
                      <TableCell>{test._count.testAttempts}</TableCell>
                      <TableCell>
                        <Switch
                          checked={test.isActive}
                          onCheckedChange={() =>
                            handleToggleActive(test.id, test.isActive)
                          }
                        />
                      </TableCell>
                      <TableCell>{formatDate(test.createdAt)}</TableCell>
                      <TableCell>
                        <div className='flex gap-1'>
                          <Button size='sm' variant='ghost' asChild>
                            <Link href={`/trainer/test/${test.id}/edit`}>
                              <Edit className='h-4 w-4' />
                            </Link>
                          </Button>
                          <Button size='sm' variant='ghost' asChild>
                            <Link href={`/trainer/test/${test.id}/questions`}>
                              <FileText className='h-4 w-4' />
                            </Link>
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => handleDeleteTest(test.id)}
                            disabled={isDeleting === test.id}
                          >
                            {isDeleting === test.id ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <Trash2 className='h-4 w-4 text-red-500' />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info card */}
        <Card>
          <CardHeader>
            <CardTitle>Informace o testech</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <p className='text-muted-foreground text-sm'>
              • Každé školení může mít libovolný počet testů
            </p>
            <p className='text-muted-foreground text-sm'>
              • Zaměstnanci musí splnit <strong>všechny aktivní testy</strong>{' '}
              pro dokončení školení
            </p>
            <p className='text-muted-foreground text-sm'>
              • Deaktivované testy se nezobrazují zaměstnancům
            </p>
            <p className='text-muted-foreground text-sm'>
              • Po vytvoření testu nezapomeňte přidat otázky
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
