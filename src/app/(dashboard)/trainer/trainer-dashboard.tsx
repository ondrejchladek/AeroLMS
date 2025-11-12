'use client';

import React from 'react';
import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { BookOpen, FileText, Edit } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TrainerDashboardProps {
  assignments: any[];
}

export default function TrainerDashboard({
  assignments
}: TrainerDashboardProps) {
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
      <div className='w-full max-w-full min-w-0 space-y-6'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Přehled školitele
          </h1>
          <p className='text-muted-foreground'>
            Správa přiřazených školení a testů
          </p>
        </div>

        {/* Statistiky */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                Přiřazená školení
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{assignments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                Aktivní testy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {assignments.reduce(
                  (acc, a) =>
                    acc +
                    a.training.tests.filter((t: any) => t.isActive).length,
                  0
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                Dokončené testy (tento měsíc)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>0</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                Úspěšnost testů
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>-%</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabulka přiřazených školení */}
        <Card className="min-w-0 max-w-full">
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <BookOpen className='h-5 w-5' />
              Moje přiřazená školení
            </CardTitle>
            <CardDescription>
              Školení, která můžete upravovat a spravovat
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className='text-muted-foreground py-8 text-center'>
                Nemáte přiřazená žádná školení
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kód</TableHead>
                    <TableHead>Název školení</TableHead>
                    <TableHead>Popis</TableHead>
                    <TableHead>Počet testů</TableHead>
                    <TableHead>Přiřazeno</TableHead>
                    <TableHead>Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className='font-mono'>
                        {assignment.training.code}
                      </TableCell>
                      <TableCell className='font-medium'>
                        {assignment.training.name}
                      </TableCell>
                      <TableCell>
                        {assignment.training.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            assignment.training.tests.length > 0
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {assignment.training.tests.length}{' '}
                          {assignment.training.tests.length === 1
                            ? 'test'
                            : 'testů'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(assignment.assignedAt)}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className='flex gap-2'>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size='sm' variant='outline' className='cursor-pointer' asChild>
                                  <Link
                                    href={`/trainer/training/${assignment.training.code}/edit`}
                                  >
                                    <Edit className='mr-1 h-4 w-4' />
                                    Upravit
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Upravit školení</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size='sm' variant='outline' className='cursor-pointer' asChild>
                                  <Link
                                    href={`/trainer/training/${assignment.training.code}/tests`}
                                  >
                                    <FileText className='mr-1 h-4 w-4' />
                                    Testy
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Spravovat testy</p>
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
      </div>
    </PageContainer>
  );
}
