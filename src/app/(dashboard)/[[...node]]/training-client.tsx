'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestForm } from '@/components/training/test-form';
import { TestResults } from '@/components/training/test-results';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import {
  BookOpen,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Award,
  ArrowLeft,
  AlertTriangle,
  Info,
  Shield,
  FileCheck,
  Settings,
  BarChart3,
  ListChecks
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type ViewMode = 'overview' | 'test' | 'results';

interface TrainingClientProps {
  trainingData: {
    datumPosl: Date | null;
    pozadovano: boolean;
    datumPristi: Date | null;
  };
  training: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    content: any;
    hasTest: boolean;
    testId?: number;
  } | null;
  displayName: string;
  userRole: string;
}

// Helper function to check if content is in Tiptap JSON format
function isTiptapFormat(content: any): boolean {
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return parsed.type === 'doc' && Array.isArray(parsed.content);
    } catch {
      return false;
    }
  }
  return content?.type === 'doc' && Array.isArray(content?.content);
}

export function TrainingClient({
  trainingData,
  training,
  displayName,
  userRole
}: TrainingClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [test, setTest] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleStartTest = async () => {
    if (!training?.id) return;

    try {
      // First fetch available tests
      const testsResponse = await fetch(`/api/trainings/${training.id}/tests`);
      if (!testsResponse.ok) throw new Error('Failed to fetch tests');
      const testsData = await testsResponse.json();

      if (!testsData.tests || testsData.tests.length === 0) {
        toast.error('Pro toto školení není k dispozici žádný test');
        return;
      }

      // Get the first (and only for WORKER) active test
      const activeTest = testsData.tests[0];

      // Try to start test attempt
      const startResponse = await fetch(
        `/api/trainings/${training.id}/test/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId: activeTest.id })
        }
      );

      const startData = await startResponse.json();

      if (!startResponse.ok) {
        // Handle specific error codes
        if (startData.errorCode === 'FIRST_TEST_REQUIRED') {
          toast.error(startData.error, {
            duration: 5000,
            description:
              'Kontaktujte svého školitele pro absolvování prvního testu.'
          });
          return;
        } else if (startData.errorCode === 'TOO_EARLY_TO_RETAKE') {
          toast.error(startData.error, {
            duration: 5000,
            description: `Můžete opakovat test od: ${new Date(startData.nextAllowedDate).toLocaleDateString('cs-CZ')}`
          });
          return;
        } else if (startData.errorCode === 'MAX_ATTEMPTS_REACHED') {
          toast.error(startData.error, {
            duration: 5000,
            description: 'Kontaktujte svého školitele pro další pokus.'
          });
          return;
        }
        throw new Error(startData.error || 'Failed to start test');
      }

      setTest(activeTest);
      setAttemptId(startData.attemptId);
      setViewMode('test');
      toast.success('Test byl úspěšně spuštěn');
    } catch {
      toast.error('Nepodařilo se spustit test');
    }
  };

  const handleSubmitTest = async (data: any) => {
    if (!attemptId) return;

    try {
      const response = await fetch(`/api/test-attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to submit test');

      const results = await response.json();
      setTestResults(results);
      setViewMode('results');

      if (results.passed) {
        toast.success('Gratulujeme! Test jste úspěšně složili.');
        // Reload page to update the training data
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        toast.error('Test nebyl úspěšný. Zkuste to prosím znovu.');
      }
    } catch {
      toast.error('Nepodařilo se odeslat test');
    }
  };

  const handleRetryTest = async () => {
    // Clear previous results
    setTestResults(null);
    setAttemptId(null);
    setTest(null);

    // Start new test immediately
    if (!training?.id) return;

    try {
      // Fetch test data
      const testResponse = await fetch(`/api/trainings/${training.id}/test`);
      if (!testResponse.ok) throw new Error('Failed to fetch test');
      const testData = await testResponse.json();
      setTest(testData);

      // Start test attempt
      const startResponse = await fetch(
        `/api/trainings/${training.id}/test/start`,
        {
          method: 'POST'
        }
      );
      if (!startResponse.ok) throw new Error('Failed to start test');
      const { attemptId } = await startResponse.json();
      setAttemptId(attemptId);

      setViewMode('test');
      toast.success('Test byl úspěšně spuštěn znovu');
    } catch {
      toast.error('Nepodařilo se znovu spustit test');
    }
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setTestResults(null);
    setAttemptId(null);
    setTest(null);
  };

  const handleDownloadPdf = async () => {
    if (!training?.id) return;

    setIsDownloadingPdf(true);
    try {
      const response = await fetch(`/api/trainings/${training.id}/pdf`);

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${displayName}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF byl úspěšně stažen');
    } catch {
      toast.error('Nepodařilo se stáhnout PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const [isExpired, setIsExpired] = useState(false);
  const isCompleted = trainingData.datumPosl !== null;

  // Vypočítej, zda může uživatel spustit test
  const canStartTest = () => {
    // Admin a Trainer mohou vždy
    if (userRole !== 'WORKER') return true;

    // Worker specifické podmínky
    if (!isCompleted) return false; // První test musí být osobně

    // Zkontroluj, zda je měsíc před vypršením
    if (trainingData.datumPristi) {
      const today = new Date();
      const dueDate = new Date(trainingData.datumPristi);
      const oneMonthBefore = new Date(dueDate);
      oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);

      return today >= oneMonthBefore;
    }

    return false;
  };

  useEffect(() => {
    if (trainingData.datumPristi) {
      setIsExpired(new Date(trainingData.datumPristi) < new Date());
    }
  }, [trainingData.datumPristi]);

  // Test mode
  if (viewMode === 'test' && test && attemptId) {
    return (
      <TestForm test={test} attemptId={attemptId} onSubmit={handleSubmitTest} />
    );
  }

  // Results mode
  if (viewMode === 'results' && testResults) {
    return (
      <TestResults
        results={testResults}
        testTitle={test?.title || 'Test'}
        onRetry={handleRetryTest}
        onBackToTraining={handleBackToOverview}
      />
    );
  }

  // Overview mode (default)
  return (
    <div className='w-full space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>{displayName}</h1>
          {training && training.description && (
            <p className='text-muted-foreground mt-1'>{training.description}</p>
          )}
        </div>
        <Button
          variant='outline'
          onClick={() => router.push('/')}
          className='gap-2'
        >
          <ArrowLeft className='h-4 w-4' />
          Zpět na přehled
        </Button>
      </div>

      {/* Status Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
              <Calendar className='h-4 w-4' />
              Poslední školení
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold'>
              {trainingData.datumPosl
                ? new Date(trainingData.datumPosl).toLocaleDateString('cs-CZ')
                : 'Neabsolvováno'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
              <AlertCircle className='h-4 w-4' />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trainingData.pozadovano ? (
              <Badge className='bg-orange-600 px-3 py-1 text-lg'>
                Požadováno
              </Badge>
            ) : (
              <Badge variant='secondary' className='px-3 py-1 text-lg'>
                Nepovinné
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
              <Clock className='h-4 w-4' />
              Příští školení
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${isExpired ? 'text-red-600' : ''}`}
            >
              {trainingData.datumPristi
                ? new Date(trainingData.datumPristi).toLocaleDateString('cs-CZ')
                : 'Neplánováno'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
              <Award className='h-4 w-4' />
              Platnost
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCompleted ? (
              isExpired ? (
                <Badge variant='destructive' className='px-3 py-1 text-lg'>
                  Vypršelo
                </Badge>
              ) : (
                <Badge className='bg-green-600 px-3 py-1 text-lg'>Platné</Badge>
              )
            ) : (
              <Badge variant='outline' className='px-3 py-1 text-lg'>
                Neškoleno
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {isExpired && (
        <Card className='border-red-200 bg-red-50 dark:bg-red-950/20'>
          <CardContent className=''>
            <div className='flex items-start gap-3'>
              <AlertCircle className='mt-0.5 h-5 w-5 text-red-600' />
              <div>
                <p className='font-semibold text-red-900 dark:text-red-100'>
                  Platnost školení vypršela!
                </p>
                <p className='mt-1 text-sm text-red-700 dark:text-red-300'>
                  Je nutné absolvovat nové školení co nejdříve.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info for Worker about test availability */}
      {userRole === 'WORKER' && training?.hasTest && (
        <div>
          {!isCompleted && (
            <Card className='mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20'>
              <CardContent className=''>
                <div className='flex items-start gap-3'>
                  <Info className='mt-0.5 h-5 w-5 text-blue-600' />
                  <div>
                    <p className='font-semibold text-blue-900 dark:text-blue-100'>
                      První test musí být absolvován osobně
                    </p>
                    <p className='mt-1 text-sm text-blue-700 dark:text-blue-300'>
                      Kontaktujte svého školitele pro absolvování prvního testu.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isCompleted && trainingData.datumPristi && !canStartTest() && (
            <Card className='mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20'>
              <CardContent className=''>
                <div className='flex items-start gap-3'>
                  <Clock className='mt-0.5 h-5 w-5 text-amber-600' />
                  <div>
                    <p className='font-semibold text-amber-900 dark:text-amber-100'>
                      Test bude dostupný měsíc před vypršením
                    </p>
                    <p className='mt-1 text-sm text-amber-700 dark:text-amber-300'>
                      Test můžete spustit od:{' '}
                      {(() => {
                        const dueDate = new Date(trainingData.datumPristi);
                        const oneMonthBefore = new Date(dueDate);
                        oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
                        return oneMonthBefore.toLocaleDateString('cs-CZ');
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {training && (
        <div className='flex gap-4'>
          <Button
            size='lg'
            variant='outline'
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf || !training.content}
            className='cursor-pointer gap-2 px-8 py-6 text-base'
          >
            <FileText className='h-6 w-6' />
            {isDownloadingPdf ? 'Generuji PDF...' : 'Stáhnout obsah v .pdf'}
          </Button>

          <Button
            size='lg'
            onClick={handleStartTest}
            disabled={!training.hasTest || !canStartTest()}
            className='cursor-pointer gap-2 px-8 py-6 text-base'
          >
            <FileText className='h-6 w-6' />
            {!canStartTest() && userRole === 'WORKER'
              ? isCompleted
                ? 'Test zatím nedostupný'
                : 'První test osobně'
              : 'Spustit test'}
          </Button>
        </div>
      )}

      {/* Training Content Display */}
      {training && training.content && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <BookOpen className='h-5 w-5' />
              Obsah školení
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='mx-auto max-w-[1200px] space-y-8'>
              {isTiptapFormat(training.content) ? (
                // New Tiptap format - render with read-only editor
                <TiptapEditor
                  value={
                    typeof training.content === 'string'
                      ? training.content
                      : JSON.stringify(training.content)
                  }
                  editable={false}
                />
              ) : training.content.sections ? (
                // Legacy format - render with old structure
                training.content.sections.map((section: any, index: number) => {
                  const content = section.content;

                  if (!content) {
                    return null;
                  }

                  // Render structured content as continuous flow
                  return (
                    <div key={index} className='space-y-6'>
                      {/* Introduction */}
                      {content.introduction && (
                        <div className='prose prose-sm max-w-none'>
                          <p className='text-muted-foreground text-base leading-relaxed'>
                            {content.introduction}
                          </p>
                        </div>
                      )}

                      {/* Key Points */}
                      {content.keyPoints && (
                        <Card className='bg-primary/5 border-primary/20'>
                          <CardHeader className='pb-3'>
                            <CardTitle className='flex items-center gap-2 text-sm'>
                              <Info className='h-4 w-4' />
                              Klíčové body
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className='space-y-2'>
                              {content.keyPoints.map(
                                (point: string, i: number) => (
                                  <li
                                    key={i}
                                    className='flex items-start gap-2'
                                  >
                                    <CheckCircle className='text-primary mt-0.5 h-4 w-4 flex-shrink-0' />
                                    <span className='text-sm'>{point}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* Image placeholder */}
                      {content.image && (
                        <div className='bg-muted relative flex h-64 w-full items-center justify-center rounded-lg'>
                          <div className='text-muted-foreground text-center'>
                            <BarChart3 className='mx-auto mb-2 h-12 w-12' />
                            <p className='text-sm'>Ilustrační diagram</p>
                          </div>
                        </div>
                      )}

                      {/* Rules */}
                      {content.rules && (
                        <div className='space-y-4'>
                          {content.rules.map((rule: any, i: number) => (
                            <Card key={i}>
                              <CardHeader className='pb-3'>
                                <CardTitle className='flex items-center gap-2 text-base'>
                                  <Badge variant='outline'>{rule.number}</Badge>
                                  {rule.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className='space-y-3'>
                                <p className='text-muted-foreground text-sm'>
                                  {rule.description}
                                </p>

                                {rule.checklist && (
                                  <div className='space-y-1'>
                                    {rule.checklist.map(
                                      (item: string, j: number) => (
                                        <div
                                          key={j}
                                          className='flex items-center gap-2'
                                        >
                                          <ListChecks className='text-muted-foreground h-3 w-3' />
                                          <span className='text-sm'>
                                            {item}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}

                                {rule.parameters && (
                                  <div className='mt-3 grid grid-cols-2 gap-2'>
                                    {Object.entries(rule.parameters).map(
                                      ([key, value]) => (
                                        <div
                                          key={key}
                                          className='bg-muted flex justify-between rounded p-2 text-sm'
                                        >
                                          <span className='font-medium'>
                                            {key}:
                                          </span>
                                          <span className='text-muted-foreground'>
                                            {value as string}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Standards */}
                      {content.standards && (
                        <div className='flex flex-wrap gap-2'>
                          {content.standards.map(
                            (standard: string, i: number) => (
                              <Badge key={i} variant='secondary'>
                                <FileCheck className='mr-1 h-3 w-3' />
                                {standard}
                              </Badge>
                            )
                          )}
                        </div>
                      )}

                      {/* Tolerances */}
                      {content.tolerances && (
                        <Card>
                          <CardHeader className='pb-3'>
                            <CardTitle className='flex items-center gap-2 text-sm'>
                              <Settings className='h-4 w-4' />
                              Tolerance
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className='grid grid-cols-2 gap-3'>
                              {Object.entries(content.tolerances).map(
                                ([key, value]) => (
                                  <div
                                    key={key}
                                    className='rounded-lg border p-3'
                                  >
                                    <div className='text-muted-foreground mb-1 text-xs'>
                                      {key}
                                    </div>
                                    <div className='font-mono font-semibold'>
                                      {value as string}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Defects */}
                      {content.defects && (
                        <Card className='border-destructive/20 bg-destructive/5'>
                          <CardHeader className='pb-3'>
                            <CardTitle className='text-destructive flex items-center gap-2 text-sm'>
                              <AlertTriangle className='h-4 w-4' />
                              Možné vady
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className='flex flex-wrap gap-2'>
                              {content.defects.map(
                                (defect: string, i: number) => (
                                  <Badge
                                    key={i}
                                    variant='outline'
                                    className='border-destructive/30 text-destructive'
                                  >
                                    {defect}
                                  </Badge>
                                )
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Documents */}
                      {content.documents && (
                        <div className='space-y-3'>
                          {content.documents.map((doc: any, i: number) => (
                            <Card key={i} className='overflow-hidden'>
                              <div className='flex'>
                                <div className='bg-primary w-2' />
                                <div className='flex-1 p-4'>
                                  <div className='flex items-start justify-between'>
                                    <div className='space-y-1'>
                                      <div className='flex items-center gap-2'>
                                        <FileText className='text-primary h-4 w-4' />
                                        <h4 className='text-sm font-semibold'>
                                          {doc.name}
                                        </h4>
                                      </div>
                                      <p className='text-muted-foreground text-xs'>
                                        {doc.purpose}
                                      </p>
                                    </div>
                                    {doc.frequency && (
                                      <Badge variant='secondary'>
                                        <Clock className='mr-1 h-3 w-3' />
                                        {doc.frequency}
                                      </Badge>
                                    )}
                                  </div>
                                  {doc.fields && (
                                    <div className='mt-2 flex flex-wrap gap-1'>
                                      {doc.fields.map(
                                        (field: string, j: number) => (
                                          <Badge
                                            key={j}
                                            variant='outline'
                                            className='text-xs'
                                          >
                                            {field}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* PPE */}
                      {content.ppe && (
                        <Card>
                          <CardHeader className='pb-3'>
                            <CardTitle className='flex items-center gap-2 text-sm'>
                              <Shield className='h-4 w-4' />
                              Osobní ochranné pomůcky
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className='grid grid-cols-2 gap-2'>
                              {content.ppe.map((item: string, i: number) => (
                                <div
                                  key={i}
                                  className='bg-muted flex items-center gap-2 rounded p-2'
                                >
                                  <Shield className='text-primary h-4 w-4' />
                                  <span className='text-sm'>{item}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Hazards */}
                      {content.hazards && (
                        <Card className='border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20'>
                          <CardHeader className='pb-3'>
                            <CardTitle className='flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300'>
                              <AlertTriangle className='h-4 w-4' />
                              Nebezpečí
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className='space-y-1'>
                              {content.hazards.map(
                                (hazard: string, i: number) => (
                                  <li
                                    key={i}
                                    className='flex items-center gap-2 text-sm'
                                  >
                                    <div className='h-1.5 w-1.5 rounded-full bg-yellow-600' />
                                    {hazard}
                                  </li>
                                )
                              )}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* Emergency */}
                      {content.emergency && (
                        <Card className='border-destructive bg-destructive/5'>
                          <CardHeader className='pb-3'>
                            <CardTitle className='text-destructive text-sm'>
                              Tísňové kontakty
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className='space-y-2'>
                              {Object.entries(content.emergency).map(
                                ([key, value]) => (
                                  <div
                                    key={key}
                                    className='bg-background flex justify-between rounded p-2'
                                  >
                                    <span className='text-sm font-medium'>
                                      {key}:
                                    </span>
                                    <span className='text-destructive font-mono text-sm font-bold'>
                                      {value as string}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className='text-muted-foreground'>
                  Pro toto školení není dostupný online obsah.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No training data message */}
      {!training && (
        <Card>
          <CardHeader>
            <CardTitle>Detail školení</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground'>
              Pro toto školení nejsou k dispozici další informace v systému.
            </p>
            {trainingData.pozadovano && (
              <p className='mt-2 text-orange-600 dark:text-orange-400'>
                ⚠️ Toto školení je pro vás požadováno.
              </p>
            )}
            {isExpired && (
              <p className='mt-2 text-red-600 dark:text-red-400'>
                ❌ Termín dalšího školení již vypršel!
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
