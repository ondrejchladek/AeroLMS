'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface TrainingEditClientProps {
  training: any;
}

export default function TrainingEditClient({ training }: TrainingEditClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState(training.name || training.code);
  const [description, setDescription] = useState(training.description || '');
  const [content, setContent] = useState(() => {
    if (training.content) {
      try {
        const parsed = JSON.parse(training.content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return training.content;
      }
    }
    return '';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess(false);

    try {
      // Validate content if provided
      let contentToSend = content;
      if (content.trim()) {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(content);
          contentToSend = JSON.stringify(parsed);
        } catch {
          // If not valid JSON, send as string
          contentToSend = content;
        }
      }

      const response = await fetch(`/api/trainings/${training.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          content: contentToSend
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba při ukládání');
      }

      setSuccess(true);
      toast.success('Školení bylo úspěšně aktualizováno');

      // Redirect after success
      setTimeout(() => {
        router.push('/trainer');
      }, 1500);

    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Chyba při ukládání školení');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editace školení</h1>
            <p className="text-muted-foreground">Upravte název a obsah školení</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/trainer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zpět na přehled
            </Link>
          </Button>
        </div>

        {/* Success message */}
        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Školení bylo úspěšně aktualizováno. Budete přesměrováni...
            </AlertDescription>
          </Alert>
        )}

        {/* Edit form */}
        <Card>
          <CardHeader>
            <CardTitle>Informace o školení</CardTitle>
            <CardDescription>
              Kód školení: <span className="font-mono font-bold">{training.code}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Training name */}
              <div className="space-y-2">
                <Label htmlFor="name">Název školení</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Zadejte název školení"
                  required
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Můžete přepsat výchozí název převzatý z kódu
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Popis školení</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Popište účel a obsah školení"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              {/* Content (JSON) */}
              <div className="space-y-2">
                <Label htmlFor="content">
                  Obsah školení (JSON formát)
                  <span className="text-sm text-muted-foreground ml-2">Volitelné</span>
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`{
  "introduction": "Úvod do školení",
  "keyPoints": ["Bod 1", "Bod 2"],
  "rules": ["Pravidlo 1", "Pravidlo 2"]
}`}
                  rows={12}
                  disabled={isLoading}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Strukturovaný obsah ve formátu JSON. Ponechte prázdné, pokud nechcete obsah upravovat.
                </p>
              </div>

              {/* Warning about code */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Poznámka:</strong> Kód školení ({training.code}) nelze změnit,
                  protože je svázán s databázovými sloupci.
                </AlertDescription>
              </Alert>

              {/* Submit buttons */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading || success}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Ukládám...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Uložit změny
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/trainer')}
                  disabled={isLoading}
                >
                  Zrušit
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}