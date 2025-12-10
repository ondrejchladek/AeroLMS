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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Users,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  BookOpen,
  UserCheck,
  Info
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

  // BUSINESS RULE: One training = one trainer
  // Get set of training IDs that already have active assignments
  const assignedTrainingIds = new Set(
    assignments.map((a) => a.trainingId)
  );

  // Filter trainings to show only unassigned ones in dialog
  const availableTrainings = trainings.filter(
    (t) => !assignedTrainingIds.has(t.id)
  );

  // Get trainer name for a training (if assigned)
  const getAssignedTrainerForTraining = (trainingId: number) => {
    const assignment = assignments.find((a) => a.trainingId === trainingId);
    if (assignment) {
      return `${assignment.trainer.firstName} ${assignment.trainer.lastName}`;
    }
    return null;
  };

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
      <div className='w-full max-w-full min-w-0 space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Správa přiřazení
            </h1>
            <p className='text-muted-foreground'>
              Přiřazování školení školitelům
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className='gap-2 cursor-pointer'
          >
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

        {/* Business Rule Info */}
        <Alert className='border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'>
          <Info className='h-4 w-4 text-blue-600' />
          <AlertDescription className='text-blue-800 dark:text-blue-200'>
            <strong>Pravidlo:</strong> Každé školení může mít přiřazeného pouze jednoho školitele. Tento školitel je zodpovědný za obsah školení (text i PDF) a testy daného školení.
          </AlertDescription>
        </Alert>

        {/* Přehled školitelů */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
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
                Přiřazená školení
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-2'>
                <div className='text-2xl font-bold text-green-600'>
                  {assignments.length}
                </div>
                <UserCheck className='h-5 w-5 text-green-600' />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                Nepřiřazená školení
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-2'>
                <div
                  className={`text-2xl font-bold ${availableTrainings.length > 0 ? 'text-orange-600' : 'text-green-600'}`}
                >
                  {availableTrainings.length}
                </div>
                {availableTrainings.length > 0 && (
                  <AlertCircle className='h-5 w-5 text-orange-600' />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabulka přiřazení */}
        <Card className="min-w-0 max-w-full">
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size='sm'
                                variant='ghost'
                                className='cursor-pointer'
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                disabled={loading}
                              >
                                <Trash2 className='h-4 w-4 text-red-500 mr-1' />
                                <span>Smazat</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Smazat přiřazení</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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

            {/* Business rule info */}
            <Alert className='border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'>
              <Info className='h-4 w-4 text-blue-600' />
              <AlertDescription className='text-blue-800 dark:text-blue-200'>
                Jedno školení může mít pouze jednoho školitele. Zobrazena jsou pouze školení bez přiřazeného školitele.
              </AlertDescription>
            </Alert>

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
                <Label htmlFor='training'>Školení (bez přiřazeného školitele)</Label>
                <Select
                  value={selectedTraining}
                  onValueChange={setSelectedTraining}
                >
                  <SelectTrigger id='training'>
                    <SelectValue placeholder='Vyberte školení' />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTrainings.length === 0 ? (
                      <SelectItem value='none' disabled>
                        Všechna školení již mají školitele
                      </SelectItem>
                    ) : (
                      availableTrainings.map((training) => (
                        <SelectItem
                          key={training.id}
                          value={training.id.toString()}
                        >
                          {training.name || training.code} ({training.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {availableTrainings.length === 0 && (
                  <p className='text-muted-foreground text-sm'>
                    Pro přiřazení nového školitele nejprve odeberte stávající přiřazení.
                  </p>
                )}
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
                className='cursor-pointer'
              >
                Zrušit
              </Button>
              <Button
                onClick={handleCreateAssignment}
                disabled={loading || availableTrainings.length === 0}
                className='cursor-pointer'
              >
                {loading ? 'Ukládání...' : 'Přiřadit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
