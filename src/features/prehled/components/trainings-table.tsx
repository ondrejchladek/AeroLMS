'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface Training {
  key: string;
  name: string;
  slug: string;
  required: boolean;
  lastDate: Date | null;
  nextDate: Date | null;
}

interface TrainingsTableProps {
  trainings: Training[];
}

export function TrainingsTable({ trainings }: TrainingsTableProps) {
  const router = useRouter();

  const formatDate = (date: Date | null, isNextDate: boolean = false) => {
    if (!date) return isNextDate ? 'Neurčeno' : 'Neabsolvováno';
    return new Date(date).toLocaleDateString('cs-CZ');
  };

  const getDateStatus = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const nextDate = new Date(date);

    if (nextDate < now) {
      return 'text-red-600 font-semibold';
    }

    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) {
      return 'text-orange-600 font-semibold';
    }

    return '';
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Přehled školení</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název školení</TableHead>
              <TableHead>Požadováno</TableHead>
              <TableHead>Datum poslední</TableHead>
              <TableHead>Datum příští</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainings.map((training) => (
              <TableRow key={training.key}>
                <TableCell className="font-medium">{training.name}</TableCell>
                <TableCell>
                  {training.required ? (
                    <span className="text-orange-600 font-semibold">Ano</span>
                  ) : (
                    <span className="text-muted-foreground">Ne</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(training.lastDate)}</TableCell>
                <TableCell className={getDateStatus(training.nextDate)}>
                  {formatDate(training.nextDate, true)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/${training.slug}`)}
                  >
                    Otevřít
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}