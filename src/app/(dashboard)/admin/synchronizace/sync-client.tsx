'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, RefreshCcw, CheckCircle, XCircle, Info } from 'lucide-react';

export function SyncClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/sync-trainings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Synchronizace selhala');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Automatická synchronizace</CardTitle>
          <CardDescription>
            Systém automaticky synchronizuje školení při každém spuštění aplikace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Informace</AlertTitle>
            <AlertDescription>
              Synchronizace probíhá automaticky při každém startu aplikace.
              Systém detekuje všechny sloupce ve formátu {'{code}'}DatumPosl, {'{code}'}DatumPristi a {'{code}'}Pozadovano
              v tabulce User a vytvoří odpovídající záznamy v tabulce Training.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleSync}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Synchronizuji...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  Spustit manuální synchronizaci
                </>
              )}
            </Button>

            {!isLoading && !result && !error && (
              <p className="text-sm text-muted-foreground">
                Klikněte pro ruční spuštění synchronizace
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Synchronizace dokončena
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Detekovaná školení</p>
                  <p className="text-2xl font-bold">{result.result?.detected || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Nově vytvořená</p>
                  <p className="text-2xl font-bold text-green-600">{result.result?.created || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Již existující</p>
                  <p className="text-2xl font-bold text-blue-600">{result.result?.existing || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Chyby</p>
                  <p className="text-2xl font-bold text-red-600">{result.result?.errors || 0}</p>
                </div>
              </div>

              {result.result?.details?.created && result.result.details.created.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Nově vytvořená školení:</h4>
                  <div className="bg-muted rounded-md p-3">
                    <ul className="list-disc list-inside space-y-1">
                      {result.result.details.created.map((code: string) => (
                        <li key={code} className="text-sm">{code}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.result?.details?.errors && result.result.details.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2 text-red-600">Chyby při vytváření:</h4>
                  <div className="bg-red-50 rounded-md p-3">
                    <ul className="list-disc list-inside space-y-1">
                      {result.result.details.errors.map((code: string) => (
                        <li key={code} className="text-sm text-red-700">{code}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Jak funguje synchronizace?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Systém prohledá tabulku User a najde všechny sloupce odpovídající vzoru školení</li>
            <li>Pro každé školení hledá trojici sloupců: {'{code}'}DatumPosl, {'{code}'}DatumPristi, {'{code}'}Pozadovano</li>
            <li>Školení s kompletní trojicí sloupců se porovnají s existujícími záznamy v tabulce Training</li>
            <li>Chybějící školení se automaticky vytvoří s kódem jako názvem</li>
            <li>Existující školení zůstanou nedotčena</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}