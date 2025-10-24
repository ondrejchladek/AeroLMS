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
import { TiptapEditor } from '@/components/editor/TiptapEditor';

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
  const [content, setContent] = useState(training.content || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess(false);

    try {
      const response = await fetch(`/api/trainings/${training.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          content: content.trim() || null
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

              {/* Content (Rich Text Editor) */}
              <div className="space-y-2">
                <Label htmlFor="content">
                  Obsah školení
                  <span className="text-sm text-muted-foreground ml-2">Volitelné</span>
                </Label>
                <TiptapEditor
                  value={content}
                  onChange={(value) => setContent(value)}
                  placeholder="Začněte psát obsah školení... Můžete použít formátování, nadpisy, seznamy a další."
                  editable={!isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Použijte toolbar pro formátování textu, vkládání obrázků, tabulek a dalších prvků.
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