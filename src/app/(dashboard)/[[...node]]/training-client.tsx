'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestForm } from '@/components/training/test-form';
import { TestResults } from '@/components/training/test-results';
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
}

export function TrainingClient({ trainingData, training, displayName }: TrainingClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [test, setTest] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleStartTest = async () => {
    if (!training?.id) return;

    try {
      // Fetch test data
      const testResponse = await fetch(`/api/trainings/${training.id}/test`);
      if (!testResponse.ok) throw new Error('Failed to fetch test');
      const testData = await testResponse.json();
      setTest(testData);

      // Start test attempt
      const startResponse = await fetch(`/api/trainings/${training.id}/test/start`, {
        method: 'POST'
      });
      if (!startResponse.ok) throw new Error('Failed to start test');
      const { attemptId } = await startResponse.json();
      setAttemptId(attemptId);

      setViewMode('test');
      toast.success('Test byl úspěšně spuštěn');
    } catch (error) {
      console.error('Error starting test:', error);
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
    } catch (error) {
      console.error('Error submitting test:', error);
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
      const startResponse = await fetch(`/api/trainings/${training.id}/test/start`, {
        method: 'POST'
      });
      if (!startResponse.ok) throw new Error('Failed to start test');
      const { attemptId } = await startResponse.json();
      setAttemptId(attemptId);

      setViewMode('test');
      toast.success('Test byl úspěšně spuštěn znovu');
    } catch (error) {
      console.error('Error restarting test:', error);
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
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Nepodařilo se stáhnout PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const [isExpired, setIsExpired] = useState(false);
  const isCompleted = trainingData.datumPosl !== null;

  useEffect(() => {
    if (trainingData.datumPristi) {
      setIsExpired(new Date(trainingData.datumPristi) < new Date());
    }
  }, [trainingData.datumPristi]);


  // Test mode
  if (viewMode === 'test' && test && attemptId) {
    return (
      <TestForm
        test={test}
        attemptId={attemptId}
        onSubmit={handleSubmitTest}
      />
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
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{displayName}</h1>
          {training && training.description && (
            <p className="text-muted-foreground mt-1">{training.description}</p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Zpět na přehled
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Poslední školení
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {trainingData.datumPosl
                ? new Date(trainingData.datumPosl).toLocaleDateString('cs-CZ')
                : 'Neabsolvováno'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trainingData.pozadovano ? (
              <Badge className="text-lg py-1 px-3 bg-orange-600">
                Požadováno
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-lg py-1 px-3">
                Nepovinné
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Příští školení
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${isExpired ? 'text-red-600' : ''}`}>
              {trainingData.datumPristi
                ? new Date(trainingData.datumPristi).toLocaleDateString('cs-CZ')
                : 'Neplánováno'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Platnost
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCompleted ? (
              isExpired ? (
                <Badge variant="destructive" className="text-lg py-1 px-3">
                  Vypršelo
                </Badge>
              ) : (
                <Badge className="text-lg py-1 px-3 bg-green-600">
                  Platné
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-lg py-1 px-3">
                Neškoleno
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {isExpired && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">
                  Platnost školení vypršela!
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Je nutné absolvovat nové školení co nejdříve.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {training && (
        <div className="flex gap-4">
          <Button
            size="lg"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf || !training.content}
            className="gap-2 cursor-pointer px-8 py-6 text-base"
          >
            <FileText className="h-6 w-6" />
            {isDownloadingPdf ? 'Generuji PDF...' : 'Stáhnout obsah v .pdf'}
          </Button>

          <Button
            size="lg"
            onClick={handleStartTest}
            disabled={!training.hasTest}
            className="gap-2 cursor-pointer px-8 py-6 text-base"
          >
            <FileText className="h-6 w-6" />
            Spustit test
          </Button>
        </div>
      )}

      {/* Training Content Display */}
      {training && training.content && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Obsah školení
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-[1200px] mx-auto space-y-8">
              {training.content.sections ? (
                training.content.sections.map((section: any, index: number) => {
                  const content = section.content;

                  if (!content) {
                    return null;
                  }

                  // Render structured content as continuous flow
                  return (
                    <div key={index} className="space-y-6">
                      {/* Introduction */}
                      {content.introduction && (
                        <div className="prose prose-sm max-w-none">
                          <p className="text-base leading-relaxed text-muted-foreground">
                            {content.introduction}
                          </p>
                        </div>
                      )}

                      {/* Key Points */}
                      {content.keyPoints && (
                        <Card className="bg-primary/5 border-primary/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Info className="h-4 w-4" />
                              Klíčové body
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {content.keyPoints.map((point: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                  <span className="text-sm">{point}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* Image placeholder */}
                      {content.image && (
                        <div className="relative w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">Ilustrační diagram</p>
                          </div>
                        </div>
                      )}

                      {/* Rules */}
                      {content.rules && (
                        <div className="space-y-4">
                          {content.rules.map((rule: any, i: number) => (
                            <Card key={i}>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Badge variant="outline">{rule.number}</Badge>
                                  {rule.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <p className="text-sm text-muted-foreground">{rule.description}</p>

                                {rule.checklist && (
                                  <div className="space-y-1">
                                    {rule.checklist.map((item: string, j: number) => (
                                      <div key={j} className="flex items-center gap-2">
                                        <ListChecks className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm">{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {rule.parameters && (
                                  <div className="grid grid-cols-2 gap-2 mt-3">
                                    {Object.entries(rule.parameters).map(([key, value]) => (
                                      <div key={key} className="flex justify-between p-2 bg-muted rounded text-sm">
                                        <span className="font-medium">{key}:</span>
                                        <span className="text-muted-foreground">{value as string}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Standards */}
                      {content.standards && (
                        <div className="flex flex-wrap gap-2">
                          {content.standards.map((standard: string, i: number) => (
                            <Badge key={i} variant="secondary">
                              <FileCheck className="h-3 w-3 mr-1" />
                              {standard}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Tolerances */}
                      {content.tolerances && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Tolerance
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                              {Object.entries(content.tolerances).map(([key, value]) => (
                                <div key={key} className="p-3 border rounded-lg">
                                  <div className="text-xs text-muted-foreground mb-1">{key}</div>
                                  <div className="font-mono font-semibold">{value as string}</div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Defects */}
                      {content.defects && (
                        <Card className="border-destructive/20 bg-destructive/5">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              Možné vady
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {content.defects.map((defect: string, i: number) => (
                                <Badge key={i} variant="outline" className="border-destructive/30 text-destructive">
                                  {defect}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Documents */}
                      {content.documents && (
                        <div className="space-y-3">
                          {content.documents.map((doc: any, i: number) => (
                            <Card key={i} className="overflow-hidden">
                              <div className="flex">
                                <div className="w-2 bg-primary" />
                                <div className="flex-1 p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold text-sm">{doc.name}</h4>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{doc.purpose}</p>
                                    </div>
                                    {doc.frequency && (
                                      <Badge variant="secondary">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {doc.frequency}
                                      </Badge>
                                    )}
                                  </div>
                                  {doc.fields && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {doc.fields.map((field: string, j: number) => (
                                        <Badge key={j} variant="outline" className="text-xs">
                                          {field}
                                        </Badge>
                                      ))}
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
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Osobní ochranné pomůcky
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-2">
                              {content.ppe.map((item: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                                  <Shield className="h-4 w-4 text-primary" />
                                  <span className="text-sm">{item}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Hazards */}
                      {content.hazards && (
                        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                              <AlertTriangle className="h-4 w-4" />
                              Nebezpečí
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {content.hazards.map((hazard: string, i: number) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                  <div className="h-1.5 w-1.5 rounded-full bg-yellow-600" />
                                  {hazard}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* Emergency */}
                      {content.emergency && (
                        <Card className="border-destructive bg-destructive/5">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-destructive">Tísňové kontakty</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {Object.entries(content.emergency).map(([key, value]) => (
                                <div key={key} className="flex justify-between p-2 bg-background rounded">
                                  <span className="text-sm font-medium">{key}:</span>
                                  <span className="text-sm font-mono font-bold text-destructive">{value as string}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })
            ) : (
              <p className="text-muted-foreground">
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
            <p className="text-muted-foreground">
              Pro toto školení nejsou k dispozici další informace v systému.
            </p>
            {trainingData.pozadovano && (
              <p className="text-orange-600 dark:text-orange-400 mt-2">
                ⚠️ Toto školení je pro vás požadováno.
              </p>
            )}
            {isExpired && (
              <p className="text-red-600 dark:text-red-400 mt-2">
                ❌ Termín dalšího školení již vypršel!
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}