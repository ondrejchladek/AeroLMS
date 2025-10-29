'use client';

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface CompletedTraining {
  name: string;
  lastDate: Date | null;
  required: boolean;
}

interface RecentSalesProps {
  trainings?: CompletedTraining[];
}

export function RecentSales({ trainings = [] }: RecentSalesProps) {
  // Filtruj pouze školení, která byla splněna a seřaď podle data
  const completedTrainings = trainings
    .filter((t) => t.lastDate !== null)
    .sort((a, b) => {
      if (!a.lastDate || !b.lastDate) return 0;
      return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
    })
    .slice(0, 5); // Zobraz pouze 5 nejnovějších

  const totalCompleted = trainings.filter((t) => t.lastDate !== null).length;

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('cs-CZ');
  };

  const getDaysAgo = (date: Date | null) => {
    if (!date) return '';
    const today = new Date();
    const trainingDate = new Date(date);
    const diffTime = today.getTime() - trainingDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Dnes';
    if (diffDays === 1) return 'Včera';
    if (diffDays < 7) return `Před ${diffDays} dny`;
    if (diffDays < 30) return `Před ${Math.floor(diffDays / 7)} týdny`;
    if (diffDays < 365) return `Před ${Math.floor(diffDays / 30)} měsíci`;
    return `Před ${Math.floor(diffDays / 365)} roky`;
  };

  const getStatusIcon = (date: Date | null) => {
    if (!date) return <AlertCircle className='text-muted-foreground h-5 w-5' />;

    const today = new Date();
    const trainingDate = new Date(date);
    const diffTime = today.getTime() - trainingDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 180) {
      return <CheckCircle2 className='h-5 w-5 text-green-600' />;
    } else if (diffDays < 365) {
      return <Clock className='h-5 w-5 text-orange-600' />;
    } else {
      return <AlertCircle className='h-5 w-5 text-red-600' />;
    }
  };

  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Splněná školení (posledních 5 školení)</CardTitle>
        <CardDescription>
          Celkem absolvováno {totalCompleted} školení
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-6'>
          {completedTrainings.length > 0 ? (
            completedTrainings.map((training, index) => (
              <div key={index} className='flex items-center'>
                <div className='mr-3'>{getStatusIcon(training.lastDate)}</div>
                <div className='flex-1 space-y-1'>
                  <p className='text-sm leading-none font-medium'>
                    {training.name}
                  </p>
                  <p className='text-muted-foreground text-sm'>
                    {formatDate(training.lastDate)}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-sm font-medium'>
                    {getDaysAgo(training.lastDate)}
                  </p>
                  {training.required && (
                    <p className='text-xs text-orange-600'>Požadováno</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className='text-muted-foreground py-8 text-center'>
              Žádná splněná školení
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
