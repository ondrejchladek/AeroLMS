'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { PDF_MAX_SIZE_BYTES } from '@/lib/validation-schemas';

interface PdfInfo {
  pdfFileName: string | null;
  pdfOriginalName: string | null;
  pdfFileSize: number | null;
  pdfUploadedAt: string | null;
  pdfUploadedBy: number | null;
}

interface PdfUploadSectionProps {
  trainingId: number;
  trainingCode: string;
  initialPdfInfo?: PdfInfo | null;
  disabled?: boolean;
}

export default function PdfUploadSection({
  trainingId,
  trainingCode,
  initialPdfInfo,
  disabled = false
}: PdfUploadSectionProps) {
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(initialPdfInfo || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const maxSizeMB = Math.round(PDF_MAX_SIZE_BYTES / 1024 / 1024);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setError(null);

      // Client-side validation
      if (file.type !== 'application/pdf') {
        setError('Soubor musí být ve formátu PDF');
        return;
      }

      if (file.size > PDF_MAX_SIZE_BYTES) {
        setError(`Soubor je příliš velký. Maximum: ${maxSizeMB} MB`);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append('file', file);

        // Simulate progress for UX (actual upload doesn't support progress events with fetch)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const response = await fetch(`/api/trainings/${trainingId}/assignment/pdf`, {
          method: 'POST',
          body: formData
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Chyba při nahrávání');
        }

        const data = await response.json();
        setPdfInfo({
          pdfFileName: data.pdfFileName,
          pdfOriginalName: data.pdfOriginalName,
          pdfFileSize: data.pdfFileSize,
          pdfUploadedAt: data.pdfUploadedAt,
          pdfUploadedBy: null
        });

        toast.success('PDF bylo úspěšně nahráno');
      } catch (err: any) {
        setError(err.message || 'Nepodařilo se nahrát PDF');
        toast.error(err.message || 'Nepodařilo se nahrát PDF');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [trainingId, maxSizeMB]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: disabled || isUploading || isDeleting
  });

  const handleDelete = async () => {
    if (!pdfInfo?.pdfFileName) return;

    const confirmed = window.confirm(
      'Opravdu chcete smazat tento PDF dokument?'
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/trainings/${trainingId}/assignment/pdf`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Chyba při mazání');
      }

      setPdfInfo(null);
      toast.success('PDF bylo úspěšně smazáno');
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se smazat PDF');
      toast.error(err.message || 'Nepodařilo se smazat PDF');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = () => {
    window.open(
      `/api/trainings/${trainingId}/assignment/pdf?mode=view`,
      '_blank'
    );
  };

  const handleDownload = () => {
    window.open(
      `/api/trainings/${trainingId}/assignment/pdf?mode=download`,
      '_blank'
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <FileText className='h-5 w-5' />
          PDF soubor školení
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Error Alert */}
        {error && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Current File Info */}
        {pdfInfo?.pdfFileName && (
          <div className='bg-muted/50 rounded-lg border p-4'>
            <div className='flex items-start justify-between'>
              <div className='flex items-start gap-3'>
                <div className='bg-primary/10 rounded-lg p-2'>
                  <FileText className='text-primary h-6 w-6' />
                </div>
                <div>
                  <p className='font-medium'>
                    {pdfInfo.pdfOriginalName || 'document.pdf'}
                  </p>
                  <div className='text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm'>
                    {pdfInfo.pdfFileSize && (
                      <span>{formatFileSize(pdfInfo.pdfFileSize)}</span>
                    )}
                    {pdfInfo.pdfUploadedAt && (
                      <span>Nahráno: {formatDate(pdfInfo.pdfUploadedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='mt-4 flex flex-wrap gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleView}
                disabled={disabled}
                className='cursor-pointer'
              >
                <Eye className='mr-2 h-4 w-4' />
                Náhled
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleDownload}
                disabled={disabled}
                className='cursor-pointer'
              >
                <Download className='mr-2 h-4 w-4' />
                Stáhnout
              </Button>
              <Button
                type='button'
                variant='destructive'
                size='sm'
                onClick={handleDelete}
                disabled={disabled || isDeleting}
                className='cursor-pointer'
              >
                {isDeleting ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Trash2 className='mr-2 h-4 w-4' />
                )}
                Smazat
              </Button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span>Nahrávání...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${disabled || isUploading || isDeleting ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className='flex flex-col items-center gap-2'>
            <div className='bg-muted rounded-full p-3'>
              <Upload className='text-muted-foreground h-6 w-6' />
            </div>
            {isDragActive ? (
              <p className='text-primary font-medium'>Pusťte soubor zde...</p>
            ) : (
              <>
                <p className='font-medium'>
                  {pdfInfo?.pdfFileName
                    ? 'Nahradit PDF dokument'
                    : 'Přetáhněte PDF sem nebo klikněte pro výběr'}
                </p>
                <p className='text-muted-foreground text-sm'>
                  Maximální velikost: {maxSizeMB} MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* Success indicator for existing file */}
        {pdfInfo?.pdfFileName && !error && (
          <div className='flex items-center gap-2 text-sm text-green-600'>
            <CheckCircle className='h-4 w-4' />
            <span>PDF dokument je nahraný a dostupný pro zaměstnance</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
