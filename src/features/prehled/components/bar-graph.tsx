'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

export const description = 'Graf příštích školení';

interface TrainingData {
  name: string;
  date: Date | null;
}

interface BarGraphProps {
  trainings?: TrainingData[];
}

const chartConfig = {
  trainings: {
    label: 'Školení',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig;

export function BarGraph({ trainings = [] }: BarGraphProps) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Připrav data pro graf - seskup školení podle měsíců
  const chartData = React.useMemo(() => {
    const monthsData: Record<string, number> = {};
    const today = new Date();

    // Inicializuj příštích 12 měsíců
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = date.toLocaleDateString('cs-CZ', {
        month: 'long',
        year: 'numeric'
      });
      monthsData[key] = 0;
    }

    // Spočítej školení v jednotlivých měsících
    trainings.forEach((training) => {
      if (training.date) {
        const trainingDate = new Date(training.date);
        if (trainingDate >= today) {
          const key = trainingDate.toLocaleDateString('cs-CZ', {
            month: 'long',
            year: 'numeric'
          });
          if (monthsData[key] !== undefined) {
            monthsData[key]++;
          }
        }
      }
    });

    // Převeď na formát pro Recharts
    return Object.entries(monthsData).map(([month, count]) => ({
      month,
      trainings: count
    }));
  }, [trainings]);

  const totalUpcoming = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.trainings, 0);
  }, [chartData]);

  if (!isClient) {
    return null;
  }

  return (
    <Card className='@container/card'>
      <CardHeader>
        <CardTitle>Příští školení</CardTitle>
        <CardDescription>
          Přehled naplánovaných školení v následujících měsících
        </CardDescription>
        <div className='mt-4'>
          <span className='text-2xl font-bold'>{totalUpcoming}</span>
          <span className='text-muted-foreground ml-2'>školení celkem</span>
        </div>
      </CardHeader>
      <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
        <ChartContainer
          config={chartConfig}
          className='aspect-auto h-[250px] w-full'
        >
          <BarChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12
            }}
          >
            <defs>
              <linearGradient id='fillBar' x1='0' y1='0' x2='0' y2='1'>
                <stop
                  offset='0%'
                  stopColor='var(--chart-1)'
                  stopOpacity={0.8}
                />
                <stop
                  offset='100%'
                  stopColor='var(--chart-1)'
                  stopOpacity={0.2}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey='month'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={-45}
              textAnchor='end'
              height={80}
              tickFormatter={(value) => {
                // Zkrať název měsíce
                const parts = value.split(' ');
                return parts[0].substring(0, 3) + ' ' + parts[1];
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => Math.floor(value).toString()}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--chart-1)', opacity: 0.1 }}
              content={
                <ChartTooltipContent
                  className='w-[200px]'
                  nameKey='trainings'
                  labelFormatter={(value) => value}
                  formatter={(value) => [`${value} školení`, 'Počet']}
                />
              }
            />
            <Bar
              dataKey='trainings'
              fill='url(#fillBar)'
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
