'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface PdfViewerProps {
  trainingId: number;
  trainingName?: string;
  showCard?: boolean;
  height?: string;
}

export default function PdfViewer({
  trainingId,
  trainingName,
  showCard = true,
  height = '600px'
}: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const apiUrl = `/api/trainings/${trainingId}/assignment/pdf?mode=view`;

  useEffect(() => {
    // Check if PDF exists by making a HEAD request
    const checkPdf = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(apiUrl, { method: 'HEAD' });

        if (response.ok) {
          setPdfUrl(apiUrl);
        } else if (response.status === 404) {
          setError('PDF dokument není k dispozici');
        } else {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Nepodařilo se načíst PDF');
        }
      } catch (err: any) {
        if (err.message !== 'PDF dokument není k dispozici') {
          setError(err.message || 'Chyba při načítání PDF');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkPdf();
  }, [trainingId, apiUrl]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setPdfUrl(null);
    // Trigger re-check
    setTimeout(() => {
      setPdfUrl(apiUrl);
      setIsLoading(false);
    }, 500);
  };

  const content = (
    <>
      {/* Loading state */}
      {isLoading && (
        <div className='space-y-4'>
          <Skeleton className='h-8 w-1/3' />
          <Skeleton className='w-full' style={{ height }} />
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription className='flex items-center justify-between'>
            <span>{error}</span>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRetry}
              className='ml-4 cursor-pointer'
            >
              <RefreshCw className='mr-2 h-4 w-4' />
              Zkusit znovu
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* PDF viewer */}
      {!isLoading && !error && pdfUrl && (
        <div
          className='overflow-hidden rounded-lg border'
          style={{ height }}
        >
          <iframe
            src={pdfUrl}
            className='h-full w-full'
            title={trainingName ? `PDF - ${trainingName}` : 'PDF dokument'}
          />
        </div>
      )}

      {/* No PDF state */}
      {!isLoading && !error && !pdfUrl && (
        <div className='bg-muted/50 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center'>
          <div className='bg-muted rounded-full p-4'>
            <FileText className='text-muted-foreground h-8 w-8' />
          </div>
          <p className='text-muted-foreground mt-4'>
            PDF dokument není k dispozici pro toto školení
          </p>
        </div>
      )}
    </>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <FileText className='h-5 w-5' />
          {trainingName ? `PDF - ${trainingName}` : 'PDF Dokument'}
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
