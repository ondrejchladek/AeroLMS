'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ChartData {
  timelineData: Array<{
    x: string;
    y: number[];
    fillColor: string;
    status: string;
    machineId: number;
    machineName: string;
    value?: number;
  }>;
  timeLabels: string[];
  minTime: number;
  maxTime: number;
  rawData?: any[];
}

export default function TestPage() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/excel-data');
        
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const data = await response.json();
        setChartData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);


  const chartOptions: any = {
    chart: {
      type: 'rangeBar' as const,
      height: 120,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        rangeBarGroupRows: true,
        barHeight: '80%',
        distributed: true,
        dataLabels: {
          hideOverflowingLabels: false
        }
      }
    },
    xaxis: {
      type: 'datetime' as const,
      min: chartData?.minTime || new Date().setHours(0, 0, 0, 0),
      max: chartData?.maxTime || new Date().setHours(23, 59, 59, 999),
      labels: {
        datetimeUTC: false,
        format: 'HH:mm',
        style: {
          fontSize: '12px'
        }
      },
      tickAmount: 24, // Show 24 hour marks
      axisBorder: {
        show: true,
        color: '#78909C',
        height: 1
      },
      axisTicks: {
        show: true,
        color: '#78909C',
        height: 6
      }
    },
    yaxis: {
      show: false,
      labels: {
        show: false
      }
    },
    grid: {
      row: {
        colors: ['#f3f4f6', 'transparent'],
        opacity: 0.5
      },
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: false
        }
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    fill: {
      type: 'solid',
      opacity: 1
    },
    legend: {
      show: false
    },
    colors: chartData?.timelineData.map(d => d.fillColor) || [],
    dataLabels: {
      enabled: false
    },
    tooltip: {
      custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
        const data = chartData?.timelineData[dataPointIndex];
        if (!data) return '';
        
        const startTime = new Date(data.y[0]);
        const endTime = new Date(data.y[1]);
        const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // in minutes
        
        const statusLabel = data.status === 'ready' ? 'Ready/Idle' : 
                           data.status === 'running' ? 'Running' : 'Offline';
        
        const valueInfo = data.value ? ` (${data.value}/899)` : '';
        
        return `
          <div class="p-2 bg-white shadow-lg rounded border">
            <div class="font-semibold">${data.machineName}</div>
            <div class="text-sm">Status: <span class="font-medium">${statusLabel}${valueInfo}</span></div>
            <div class="text-sm">Od: ${startTime.toLocaleTimeString('cs-CZ')}</div>
            <div class="text-sm">Do: ${endTime.toLocaleTimeString('cs-CZ')}</div>
            <div class="text-sm">Trvání: ${duration.toFixed(2)} min</div>
          </div>
        `;
      }
    },
    title: {
      text: chartData?.timelineData[0]?.machineName || 'Machine Timeline',
      align: 'left' as const,
      style: {
        fontSize: '16px',
        fontWeight: 600
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Excel Data Analysis</h1>
            <p className="text-muted-foreground">
              Timeline vizualizace stavu stroje pomocí ApexCharts Range Bar grafu
            </p>
          </div>

          <Card>
        <CardHeader>
          <CardTitle>Machine Status Timeline</CardTitle>
          <CardDescription>
            Vizualizace stavu stroje v čase po 15minutových intervalech
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[120px] w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error loading data: {error}
              </AlertDescription>
            </Alert>
          ) : chartData ? (
            <div className="space-y-4">
              <ApexChart
                options={chartOptions}
                series={[{ data: chartData.timelineData }]}
                type="rangeBar"
                height={120}
              />
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(255, 165, 0)' }}></div>
                  <span>Ready/Idle</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Running</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded"></div>
                  <span>Offline (mimo provoz)</span>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {chartData?.rawData && (
        <Card>
          <CardHeader>
            <CardTitle>Raw Data</CardTitle>
            <CardDescription>
              Všechny záznamy z Excel souboru ({chartData.rawData.length} řádků)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(chartData.rawData[0] || {}).map((key) => (
                      <th
                        key={key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chartData.rawData.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((value: any, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {value?.toString() || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </div>
    </div>
  );
}