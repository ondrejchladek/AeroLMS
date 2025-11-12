'use client';

import React, { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Trash2,
  RefreshCcw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Archive
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface DeletedTraining {
  id: number;
  code: string;
  name: string;
  description: string | null;
  deletedAt: string;
  counts: {
    tests: number;
    questions: number;
    testAttempts: number;
    certificates: number;
    trainingAssignments: number;
    total: number;
  };
}

interface DeletedTest {
  id: number;
  title: string;
  description: string | null;
  deletedAt: string;
  training: {
    id: number;
    code: string;
    name: string;
  };
  counts: {
    questions: number;
    testAttempts: number;
    certificates: number;
    total: number;
  };
}

interface DeletedDataResponse {
  deletedTrainings: DeletedTraining[];
  deletedTests: DeletedTest[];
  totalCount: number;
}

export default function DeletedDataClient() {
  const [data, setData] = useState<DeletedDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Restore dialog
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean;
    training: DeletedTraining | null;
  }>({ open: false, training: null });
  const [restoring, setRestoring] = useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    training: DeletedTraining | null;
  }>({ open: false, training: null });
  const [deleting, setDeleting] = useState(false);

  // Bulk delete dialog
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkDeleteDays, setBulkDeleteDays] = useState<number>(30);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Test restore dialog
  const [testRestoreDialog, setTestRestoreDialog] = useState<{
    open: boolean;
    test: DeletedTest | null;
  }>({ open: false, test: null });
  const [testRestoring, setTestRestoring] = useState(false);

  // Test delete dialog
  const [testDeleteDialog, setTestDeleteDialog] = useState<{
    open: boolean;
    test: DeletedTest | null;
  }>({ open: false, test: null });
  const [testDeleting, setTestDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/deleted-data');

      if (!response.ok) {
        throw new Error('Chyba při načítání smazaných dat');
      }

      const result: DeletedDataResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching deleted data:', err);
      setError(
        err instanceof Error ? err.message : 'Neznámá chyba při načítání dat'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (training: DeletedTraining) => {
    setRestoring(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/deleted-data/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingId: training.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba při obnovování');
      }

      const result = await response.json();
      setSuccess(result.message);
      setRestoreDialog({ open: false, training: null });

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error restoring training:', err);
      setError(
        err instanceof Error ? err.message : 'Neznámá chyba při obnovování'
      );
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (training: DeletedTraining) => {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/deleted-data/clean', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingId: training.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba při mazání');
      }

      const result = await response.json();
      setSuccess(result.message);
      setDeleteDialog({ open: false, training: null });

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error deleting training:', err);
      setError(err instanceof Error ? err.message : 'Neznámá chyba při mazání');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/deleted-data/clean', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanDays: bulkDeleteDays })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba při hromadném mazání');
      }

      const result = await response.json();
      setSuccess(result.message);
      setBulkDeleteDialog(false);

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error bulk deleting:', err);
      setError(
        err instanceof Error ? err.message : 'Neznámá chyba při hromadném mazání'
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleTestRestore = async (test: DeletedTest) => {
    setTestRestoring(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/deleted-data/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: test.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba při obnovování');
      }

      const result = await response.json();
      setSuccess(result.message);
      setTestRestoreDialog({ open: false, test: null });

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error restoring test:', err);
      setError(
        err instanceof Error ? err.message : 'Neznámá chyba při obnovování'
      );
    } finally {
      setTestRestoring(false);
    }
  };

  const handleTestDelete = async (test: DeletedTest) => {
    setTestDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/deleted-data/clean', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: test.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba při mazání');
      }

      const result = await response.json();
      setSuccess(result.message);
      setTestDeleteDialog({ open: false, test: null });

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error deleting test:', err);
      setError(err instanceof Error ? err.message : 'Neznámá chyba při mazání');
    } finally {
      setTestDeleting(false);
    }
  };

  return (
    <PageContainer scrollable>
      <div className="w-full max-w-full min-w-0 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Správa smazaných dat
            </h1>
            <p className="text-muted-foreground">
              Soft-deleted školení, testy a související data
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
              className="cursor-pointer"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Obnovit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteDialog(true)}
              disabled={!data || data.totalCount === 0}
              className="cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Vymazat stará data
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chyba</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Úspěch</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card className="min-w-0 max-w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Smazaná školení
              {data && (
                <Badge variant="secondary">{data.totalCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Školení automaticky smazaná při synchronizaci (chybějící sloupce v
              TabCisZam_EXT)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !data || data.totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Info className="mb-2 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">Žádná smazaná data</p>
                <p className="text-sm text-muted-foreground">
                  Všechna školení mají odpovídající sloupce v databázi
                </p>
              </div>
            ) : (
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kód</TableHead>
                      <TableHead>Název</TableHead>
                      <TableHead>Smazáno</TableHead>
                      <TableHead className="text-center">Testy</TableHead>
                      <TableHead className="text-center">Otázky</TableHead>
                      <TableHead className="text-center">Pokusy</TableHead>
                      <TableHead className="text-center">Certifikáty</TableHead>
                      <TableHead className="text-center">Přiřazení</TableHead>
                      <TableHead className="text-center">Celkem</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {data.deletedTrainings.map((training) => (
                    <TableRow key={training.id}>
                      <TableCell className="font-medium">
                        {training.code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{training.name}</div>
                          {training.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {training.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {format(
                            new Date(training.deletedAt),
                            'dd. MM. yyyy HH:mm',
                            { locale: cs }
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{training.counts.tests}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {training.counts.questions}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {training.counts.testAttempts}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {training.counts.certificates}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {training.counts.trainingAssignments}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge>{training.counts.total}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() =>
                              setRestoreDialog({ open: true, training })
                            }
                          >
                            <RefreshCcw className="mr-1 h-3 w-3" />
                            Obnovit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() =>
                              setDeleteDialog({ open: true, training })
                            }
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Smazat
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Deleted Tests Section */}
        <Card className="min-w-0 max-w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Smazané testy
              {data && data.deletedTests && (
                <Badge variant="secondary">{data.deletedTests.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Testy smazané samostatně (školení stále existuje)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !data || !data.deletedTests || data.deletedTests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Info className="mb-2 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">Žádné smazané testy</p>
                <p className="text-sm text-muted-foreground">
                  Všechny testy jsou aktivní nebo smazány společně se školením
                </p>
              </div>
            ) : (
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Název testu</TableHead>
                      <TableHead>Školení</TableHead>
                      <TableHead>Smazáno</TableHead>
                      <TableHead className="text-center">Otázky</TableHead>
                      <TableHead className="text-center">Pokusy</TableHead>
                      <TableHead className="text-center">Certifikáty</TableHead>
                      <TableHead className="text-center">Celkem</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.deletedTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{test.title}</div>
                            {test.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {test.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">
                              {test.training.code}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {test.training.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {format(
                              new Date(test.deletedAt),
                              'dd. MM. yyyy HH:mm',
                              { locale: cs }
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{test.counts.questions}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {test.counts.testAttempts}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {test.counts.certificates}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge>{test.counts.total}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() =>
                                setTestRestoreDialog({ open: true, test })
                              }
                            >
                              <RefreshCcw className="mr-1 h-3 w-3" />
                              Obnovit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() =>
                                setTestDeleteDialog({ open: true, test })
                              }
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Smazat
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>

        {/* Restore Dialog */}
        <Dialog
          open={restoreDialog.open}
          onOpenChange={(open) =>
            !restoring && setRestoreDialog({ open, training: null })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Obnovit školení?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Opravdu chcete obnovit školení{' '}
                <strong>{restoreDialog.training?.code}</strong> (
                {restoreDialog.training?.name})?
              </p>
              <div>
                <p className="text-sm font-medium mb-2">Tato akce obnoví:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    • {restoreDialog.training?.counts.tests} testů
                  </li>
                  <li>
                    • {restoreDialog.training?.counts.questions} otázek
                  </li>
                  <li>
                    • {restoreDialog.training?.counts.testAttempts} pokusů
                  </li>
                  <li>
                    • {restoreDialog.training?.counts.certificates} certifikátů
                  </li>
                  <li>
                    • {restoreDialog.training?.counts.trainingAssignments}{' '}
                    přiřazení
                  </li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRestoreDialog({ open: false, training: null })}
                disabled={restoring}
                className="cursor-pointer"
              >
                Zrušit
              </Button>
              <Button
                onClick={() =>
                  restoreDialog.training &&
                  handleRestore(restoreDialog.training)
                }
                disabled={restoring}
                className="cursor-pointer"
              >
                {restoring ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Obnovit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog
          open={deleteDialog.open}
          onOpenChange={(open) =>
            !deleting && setDeleteDialog({ open, training: null })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Trvale smazat školení?</DialogTitle>
            </DialogHeader>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>VAROVÁNÍ</AlertTitle>
              <AlertDescription>
                Tato akce je <strong>NEVRATNÁ</strong>! Data budou trvale
                smazána z databáze.
              </AlertDescription>
            </Alert>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Opravdu chcete trvale smazat školení{' '}
                <strong>{deleteDialog.training?.code}</strong> (
                {deleteDialog.training?.name})?
              </p>
              <div>
                <p className="text-sm font-medium mb-2">Tato akce trvale smaže:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    • {deleteDialog.training?.counts.tests} testů
                  </li>
                  <li>
                    • {deleteDialog.training?.counts.questions} otázek
                  </li>
                  <li>
                    • {deleteDialog.training?.counts.testAttempts} pokusů
                  </li>
                  <li>
                    • {deleteDialog.training?.counts.certificates} certifikátů
                  </li>
                  <li>
                    • {deleteDialog.training?.counts.trainingAssignments}{' '}
                    přiřazení
                  </li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialog({ open: false, training: null })}
                disabled={deleting}
                className="cursor-pointer"
              >
                Zrušit
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  deleteDialog.training && handleDelete(deleteDialog.training)
                }
                disabled={deleting}
                className="cursor-pointer"
              >
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Trvale smazat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Dialog */}
        <Dialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hromadné smazání starých dat</DialogTitle>
            </DialogHeader>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>VAROVÁNÍ</AlertTitle>
              <AlertDescription>
                Tato akce je <strong>NEVRATNÁ</strong>! Data starší než
                zadaný počet dní budou trvale smazána z databáze.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground mb-4">
              Zadejte počet dní pro filtrování starých dat:
            </p>
            <div className="py-4">
              <Label htmlFor="days">
                Smazat data starší než (dny):
              </Label>
              <Input
                id="days"
                type="number"
                min="1"
                value={bulkDeleteDays}
                onChange={(e) => setBulkDeleteDays(parseInt(e.target.value))}
                className="mt-2"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Budou smazána všechna školení smazaná před{' '}
                {format(
                  new Date(
                    Date.now() - bulkDeleteDays * 24 * 60 * 60 * 1000
                  ),
                  'dd. MM. yyyy',
                  { locale: cs }
                )}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBulkDeleteDialog(false)}
                disabled={bulkDeleting}
                className="cursor-pointer"
              >
                Zrušit
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeleting || bulkDeleteDays < 1}
                className="cursor-pointer"
              >
                {bulkDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Trvale smazat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Test Restore Dialog */}
        <Dialog
          open={testRestoreDialog.open}
          onOpenChange={(open) =>
            !testRestoring && setTestRestoreDialog({ open, test: null })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Obnovit test?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Opravdu chcete obnovit test{' '}
                <strong>{testRestoreDialog.test?.title}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                Školení: <strong>{testRestoreDialog.test?.training.code}</strong> (
                {testRestoreDialog.test?.training.name})
              </p>
              <div>
                <p className="text-sm font-medium mb-2">Tato akce obnoví:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {testRestoreDialog.test?.counts.questions} otázek</li>
                  <li>
                    • {testRestoreDialog.test?.counts.testAttempts} pokusů
                  </li>
                  <li>
                    • {testRestoreDialog.test?.counts.certificates} certifikátů
                  </li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTestRestoreDialog({ open: false, test: null })}
                disabled={testRestoring}
                className="cursor-pointer"
              >
                Zrušit
              </Button>
              <Button
                onClick={() =>
                  testRestoreDialog.test &&
                  handleTestRestore(testRestoreDialog.test)
                }
                disabled={testRestoring}
                className="cursor-pointer"
              >
                {testRestoring ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Obnovit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Test Delete Dialog */}
        <Dialog
          open={testDeleteDialog.open}
          onOpenChange={(open) =>
            !testDeleting && setTestDeleteDialog({ open, test: null })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Trvale smazat test?</DialogTitle>
            </DialogHeader>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>VAROVÁNÍ</AlertTitle>
              <AlertDescription>
                Tato akce je <strong>NEVRATNÁ</strong>! Data budou trvale
                smazána z databáze.
              </AlertDescription>
            </Alert>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Opravdu chcete trvale smazat test{' '}
                <strong>{testDeleteDialog.test?.title}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                Školení: <strong>{testDeleteDialog.test?.training.code}</strong> (
                {testDeleteDialog.test?.training.name})
              </p>
              <div>
                <p className="text-sm font-medium mb-2">Tato akce trvale smaže:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {testDeleteDialog.test?.counts.questions} otázek</li>
                  <li>
                    • {testDeleteDialog.test?.counts.testAttempts} pokusů
                  </li>
                  <li>
                    • {testDeleteDialog.test?.counts.certificates} certifikátů
                  </li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTestDeleteDialog({ open: false, test: null })}
                disabled={testDeleting}
                className="cursor-pointer"
              >
                Zrušit
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  testDeleteDialog.test && handleTestDelete(testDeleteDialog.test)
                }
                disabled={testDeleting}
                className="cursor-pointer"
              >
                {testDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Trvale smazat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
