'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Label } from '@/components/ui/label';
import {
  Users,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface Trainer {
  id: number;
  cislo: number | null;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface Training {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

interface Assignment {
  id: number;
  trainerId: number;
  trainingId: number;
  assignedAt: string;
  updatedAt: string;
  trainer: {
    id: number;
    cislo: number | null;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  training: {
    id: number;
    code: string;
    name: string;
  };
}

interface AssignmentsClientProps {
  trainers: Trainer[];
  trainings: Training[];
  initialAssignments: Assignment[];
}

export default function AssignmentsClient({
  trainers,
  trainings,
  initialAssignments
}: AssignmentsClientProps) {
  const [assignments, setAssignments] =
    useState<Assignment[]>(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [selectedTraining, setSelectedTraining] = useState<string>('');

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'd. M. yyyy', { locale: cs });
    } catch {
      return '-';
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedTrainer || !selectedTraining) {
      setError('Vyberte školitele a školení');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId: parseInt(selectedTrainer),
          trainingId: parseInt(selectedTraining)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nepodařilo se vytvořit přiřazení');
      }

      const { assignment } = await response.json();
      setAssignments([...assignments, assignment]);
      setSuccess('Přiřazení bylo úspěšně vytvořeno');
      setDialogOpen(false);
      setSelectedTrainer('');
      setSelectedTraining('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Chyba při vytváření přiřazení'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm('Opravdu chcete odstranit toto přiřazení?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/assignments?id=${assignmentId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error('Nepodařilo se odstranit přiřazení');
      }

      setAssignments(assignments.filter((a) => a.id !== assignmentId));
      setSuccess('Přiřazení bylo úspěšně odstraněno');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Chyba při odstraňování přiřazení'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className='w-full space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Správa přiřazení
            </h1>
            <p className='text-muted-foreground'>
              Přiřazování školení školitelům
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className='gap-2'>
            <Plus className='h-4 w-4' />
            Nové přiřazení
          </Button>
        </div>

        {error && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className='h-4 w-4' />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Přehled školitelů */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                Celkem školitelů
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{trainers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                Celkem školení
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{trainings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                Aktivních přiřazení
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{assignments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabulka přiřazení */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Users className='h-5 w-5' />
              Přiřazení školení
            </CardTitle>
            <CardDescription>
              Přehled všech přiřazených školení jednotlivým školitelům
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Školitel</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Školení</TableHead>
                  <TableHead>Přiřazeno</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className='text-muted-foreground text-center'
                    >
                      Žádná přiřazení
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className='font-medium'>
                        {assignment.trainer.firstName} {assignment.trainer.lastName}
                        {assignment.trainer.cislo && (
                          <span className='text-muted-foreground ml-2'>
                            ({assignment.trainer.cislo})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{assignment.trainer.email || '-'}</TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <BookOpen className='text-muted-foreground h-4 w-4' />
                          <span className='font-medium'>
                            {assignment.training.name ||
                              assignment.training.code}
                          </span>
                          <Badge variant='outline' className='ml-2'>
                            {assignment.training.code}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(assignment.assignedAt)}</TableCell>
                      <TableCell>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          disabled={loading}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog pro vytvoření přiřazení */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nové přiřazení</DialogTitle>
              <DialogDescription>
                Přiřaďte školení vybranému školiteli
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='trainer'>Školitel</Label>
                <Select
                  value={selectedTrainer}
                  onValueChange={setSelectedTrainer}
                >
                  <SelectTrigger id='trainer'>
                    <SelectValue placeholder='Vyberte školitele' />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers.map((trainer) => (
                      <SelectItem
                        key={trainer.id}
                        value={trainer.id.toString()}
                      >
                        {trainer.firstName} {trainer.lastName} {trainer.email && `(${trainer.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='training'>Školení</Label>
                <Select
                  value={selectedTraining}
                  onValueChange={setSelectedTraining}
                >
                  <SelectTrigger id='training'>
                    <SelectValue placeholder='Vyberte školení' />
                  </SelectTrigger>
                  <SelectContent>
                    {trainings.map((training) => (
                      <SelectItem
                        key={training.id}
                        value={training.id.toString()}
                      >
                        {training.name || training.code} ({training.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => {
                  setDialogOpen(false);
                  setSelectedTrainer('');
                  setSelectedTraining('');
                }}
              >
                Zrušit
              </Button>
              <Button onClick={handleCreateAssignment} disabled={loading}>
                {loading ? 'Ukládání...' : 'Přiřadit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
