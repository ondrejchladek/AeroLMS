'use client';

import React, { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/page-container';
import { getRoleLabel } from '@/types/roles';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DatePickerInput } from '@/components/ui/date-picker-input';
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
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  Users,
  BookOpen,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Check,
  ChevronsUpDown,
  UserCog,
  RefreshCcw,
  Loader2,
  Info,
  XCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface Training {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  testsCount: number;
}

interface User {
  id: number;
  cislo: number | null;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
  [key: string]: any; // Pro dynamické sloupce školení
}

interface EditingUser {
  id: number;
  changes: Record<string, any>;
}

interface GeneralUserEdit {
  id: number;
  cislo: number | null;
  firstName: string;
  lastName: string;
  email: string;
  alias: string;
  role: string;
}

interface TrainingEdit {
  id: string;
  code: string;
  name: string;
  description: string;
}

export default function AdminPrehledClient() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [savingUser, setSavingUser] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<string>('');
  const [openCombobox, setOpenCombobox] = useState(false);
  const [trainingDisplayNames, setTrainingDisplayNames] = useState<
    Record<string, string>
  >({});
  const [generalUserEdit, setGeneralUserEdit] =
    useState<GeneralUserEdit | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [savingGeneralUser, setSavingGeneralUser] = useState(false);
  const [trainingEdit, setTrainingEdit] = useState<TrainingEdit | null>(null);
  const [isTrainingEditDialogOpen, setIsTrainingEditDialogOpen] =
    useState(false);
  const [savingTraining, setSavingTraining] = useState(false);
  // State pro synchronizaci
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Načíst školení z databáze (admin request)
      const trainingsResponse = await fetch('/api/trainings?admin=true');
      if (!trainingsResponse.ok)
        throw new Error('Nepodařilo se načíst školení');
      const trainingsData = await trainingsResponse.json();
      setTrainings(trainingsData.trainings || []);

      // Vytvoř mapování code -> name pro školení
      const displayNames: Record<string, string> = {};
      for (const training of trainingsData.trainings || []) {
        displayNames[training.code] = training.name || training.code;
      }
      setTrainingDisplayNames(displayNames);

      // Nastav první školení jako výchozí
      if (trainingsData.trainings && trainingsData.trainings.length > 0) {
        setSelectedTraining(trainingsData.trainings[0].code);
      }

      // Načíst uživatele
      const usersResponse = await fetch('/api/users');
      if (!usersResponse.ok) throw new Error('Nepodařilo se načíst uživatele');
      const usersData = await usersResponse.json();
      setUsers(usersData.users || []);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Chyba při načítání dat'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (
    user: User,
    training: string,
    field: string,
    value: any
  ) => {
    const fieldName = `${training}${field}`;

    // Pokud ještě není v režimu editace, inicializuj editingUser
    if (!editingUser || editingUser.id !== user.id) {
      setEditingUser({
        id: user.id,
        changes: {
          [fieldName]: value
        }
      });
    } else {
      // Už je v režimu editace, aktualizuj změny
      setEditingUser({
        ...editingUser,
        changes: {
          ...editingUser.changes,
          [fieldName]: value
        }
      });
    }
  };

  const handleSaveUser = async (userId: number) => {
    if (!editingUser || editingUser.id !== userId) return;

    setSavingUser(userId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser.changes)
      });

      if (!response.ok) {
        throw new Error('Nepodařilo se uložit změny');
      }

      await response.json();

      // Aktualizovat lokální data - pouze pro konkrétního uživatele
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.UserID === userId ? { ...u, ...editingUser.changes } : u
        )
      );

      setEditingUser(null);
      setSuccess('Změny byly úspěšně uloženy');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Chyba při ukládání');
    } finally {
      setSavingUser(null);
    }
  };

  const handleOpenTrainingEditDialog = (training: Training) => {
    setTrainingEdit({
      id: training.id,
      code: training.code,
      name: training.name,
      description: training.description
    });
    setIsTrainingEditDialogOpen(true);
  };

  const handleSaveTraining = async () => {
    if (!trainingEdit) return;

    setSavingTraining(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/trainings/${trainingEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trainingEdit.name,
          description: trainingEdit.description
        })
      });

      if (!response.ok) {
        throw new Error('Nepodařilo se uložit změny');
      }

      await response.json();

      // Aktualizovat lokální data
      setTrainings((prevTrainings) =>
        prevTrainings.map((t) =>
          t.id === trainingEdit.id
            ? {
              ...t,
              name: trainingEdit.name,
              description: trainingEdit.description
            }
            : t
        )
      );

      // Aktualizovat také display names
      setTrainingDisplayNames((prev) => ({
        ...prev,
        [trainingEdit.code]: trainingEdit.name
      }));

      setIsTrainingEditDialogOpen(false);
      setTrainingEdit(null);
      setSuccess('Školení bylo úspěšně aktualizováno');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Chyba při ukládání');
    } finally {
      setSavingTraining(false);
    }
  };

  const handleOpenGeneralEditDialog = (user: User) => {
    setGeneralUserEdit({
      id: user.id,
      cislo: user.cislo,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      alias: '', // Prázdné heslo = nebude změněno
      role: user.role
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveGeneralUser = async () => {
    if (!generalUserEdit) return;

    setSavingGeneralUser(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: any = {
        cislo: generalUserEdit.cislo,
        firstName: generalUserEdit.firstName,
        lastName: generalUserEdit.lastName,
        email: generalUserEdit.email,
        role: generalUserEdit.role
      };

      // Pouze pokud je vyplněno heslo, přidej ho do update
      if (generalUserEdit.alias && generalUserEdit.alias.trim() !== '') {
        updateData.alias = generalUserEdit.alias;
      }

      const response = await fetch(`/api/users/${generalUserEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Nepodařilo se uložit změny');
      }

      // Aktualizovat lokální data
      setUsers(
        users.map((u) =>
          u.id === generalUserEdit.id
            ? {
              ...u,
              cislo: generalUserEdit.cislo,
              firstName: generalUserEdit.firstName,
              lastName: generalUserEdit.lastName,
              email: generalUserEdit.email,
              role: generalUserEdit.role
            }
            : u
        )
      );

      setIsEditDialogOpen(false);
      setGeneralUserEdit(null);
      setSuccess('Uživatel byl úspěšně aktualizován');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Chyba při ukládání');
    } finally {
      setSavingGeneralUser(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const response = await fetch('/api/admin/sync-trainings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Synchronizace selhala');
      }

      const data = await response.json();
      setSyncResult(data);

      // Pokud byly vytvořeny nové školení, znovu načti data
      if (data.result?.created > 0) {
        await fetchData();
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'd. M. yyyy', { locale: cs });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className='flex h-[400px] items-center justify-center'>
          <div className='text-muted-foreground'>Načítání dat...</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className='w-full space-y-6'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Admin přehled</h1>
          <p className='text-muted-foreground'>Správa školení a uživatelů</p>
        </div>

        {error && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className='h-4 w-4' />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Synchronizace školení */}
        <Card>
          <CardHeader>
            <CardTitle>Automatická synchronizace školení</CardTitle>
            <CardDescription>
              Systém automaticky synchronizuje školení při každém spuštění
              aplikace
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Alert>
              <Info className='h-4 w-4' />
              <AlertTitle>Informace</AlertTitle>
              <AlertDescription>
                Synchronizace probíhá automaticky při každém startu aplikace.
                Systém detekuje všechny sloupce ve formátu {'{code}'}DatumPosl,{' '}
                {'{code}'}DatumPristi a {'{code}'}Pozadovano v tabulce User a
                vytvoří odpovídající záznamy v tabulce Training.
              </AlertDescription>
            </Alert>

            <div className='flex items-center gap-4'>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className='flex items-center gap-2'
              >
                {isSyncing ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Synchronizuji...
                  </>
                ) : (
                  <>
                    <RefreshCcw className='h-4 w-4' />
                    Spustit manuální synchronizaci
                  </>
                )}
              </Button>

              {!isSyncing && !syncResult && !syncError && (
                <p className='text-muted-foreground text-sm'>
                  Klikněte pro ruční spuštění synchronizace
                </p>
              )}
            </div>

            {syncError && (
              <Alert variant='destructive'>
                <XCircle className='h-4 w-4' />
                <AlertTitle>Chyba</AlertTitle>
                <AlertDescription>{syncError}</AlertDescription>
              </Alert>
            )}

            {syncResult && (
              <div className='bg-muted mt-4 rounded-lg p-4'>
                <h4 className='mb-3 flex items-center gap-2 text-sm font-medium'>
                  <CheckCircle className='h-4 w-4 text-green-500' />
                  Synchronizace dokončena
                </h4>
                <div className='mb-4 grid grid-cols-2 gap-4'>
                  <div>
                    <p className='text-muted-foreground text-sm'>
                      Detekovaná školení
                    </p>
                    <p className='text-lg font-semibold'>
                      {syncResult.result?.detected || 0}
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-sm'>
                      Nově vytvořená
                    </p>
                    <p className='text-lg font-semibold text-green-600'>
                      {syncResult.result?.created || 0}
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-sm'>
                      Již existující
                    </p>
                    <p className='text-lg font-semibold text-blue-600'>
                      {syncResult.result?.existing || 0}
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-sm'>Chyby</p>
                    <p className='text-lg font-semibold text-red-600'>
                      {syncResult.result?.errors || 0}
                    </p>
                  </div>
                </div>

                {syncResult.result?.details?.created &&
                  syncResult.result.details.created.length > 0 && (
                    <div className='mt-3'>
                      <p className='mb-2 text-sm font-medium'>
                        Nově vytvořená školení:
                      </p>
                      <div className='bg-background rounded p-2'>
                        <ul className='list-inside list-disc space-y-1'>
                          {syncResult.result.details.created.map(
                            (code: string) => (
                              <li key={code} className='text-sm'>
                                {code}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  )}

                {syncResult.result?.details?.errors &&
                  syncResult.result.details.errors.length > 0 && (
                    <div className='mt-3'>
                      <p className='mb-2 text-sm font-medium text-red-600'>
                        Chyby při vytváření:
                      </p>
                      <div className='rounded bg-red-50 p-2 dark:bg-red-950'>
                        <ul className='list-inside list-disc space-y-1'>
                          {syncResult.result.details.errors.map(
                            (code: string) => (
                              <li
                                key={code}
                                className='text-sm text-red-700 dark:text-red-400'
                              >
                                {code}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jak funguje synchronizace */}
        <Card>
          <CardHeader>
            <CardTitle>Jak funguje synchronizace?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className='text-muted-foreground list-inside list-decimal space-y-2 text-sm'>
              <li>
                Systém prohledá tabulku User a najde všechny sloupce
                odpovídající vzoru školení
              </li>
              <li>
                Pro každé školení hledá trojici sloupců: {'{code}'}DatumPosl,{' '}
                {'{code}'}DatumPristi, {'{code}'}Pozadovano
              </li>
              <li>
                Školení s kompletní trojicí sloupců se porovnají s existujícími
                záznamy v tabulce Training
              </li>
              <li>
                Chybějící školení se automaticky přenesou z tabulky User do
                tabulky Training a přidají do UI tabulky Školení v databázi s
                kódem jako názvem
              </li>
              <li>Existující školení zůstanou nedotčena</li>
            </ol>
          </CardContent>
        </Card>

        {/* Tabulka školení */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <BookOpen className='h-5 w-5' />
              Školení v databázi
            </CardTitle>
            <CardDescription>
              Přehled všech registrovaných školení
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kód</TableHead>
                  <TableHead>Název</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Testy</TableHead>
                  <TableHead>Vytvořeno</TableHead>
                  <TableHead>Aktualizováno</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className='text-muted-foreground text-center'
                    >
                      Žádná školení v databázi
                    </TableCell>
                  </TableRow>
                ) : (
                  trainings.map((training) => (
                    <TableRow key={training.id}>
                      <TableCell className='font-mono'>
                        {training.code}
                      </TableCell>
                      <TableCell className='font-medium'>
                        {training.name}
                      </TableCell>
                      <TableCell>{training.description}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            training.testsCount > 0 ? 'default' : 'secondary'
                          }
                        >
                          {training.testsCount}{' '}
                          {training.testsCount === 1 ? 'test' : 'testů'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(training.createdAt)}</TableCell>
                      <TableCell>{formatDate(training.updatedAt)}</TableCell>
                      <TableCell>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleOpenTrainingEditDialog(training)}
                          className='cursor-pointer'
                        >
                          <Edit className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Nová obecná tabulka správy uživatelů */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <UserCog className='h-5 w-5' />
              Správa uživatelů
            </CardTitle>
            <CardDescription>
              Správa základních údajů uživatelů - kód, jméno, email, heslo, role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kód</TableHead>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Heslo</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className='text-muted-foreground text-center'
                    >
                      Žádní uživatelé
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className='font-mono'>{user.cislo}</TableCell>
                      <TableCell className='font-medium'>{`${user.firstName} ${user.lastName}`}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell className='text-muted-foreground font-mono'>
                        ••••••••
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === 'ADMIN'
                              ? 'destructive'
                              : user.role === 'TRAINER'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleOpenGeneralEditDialog(user)}
                          className='cursor-pointer'
                        >
                          <Edit className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabulka přiřazení školení pracovníkům */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Users className='h-5 w-5' />
              Správa přiřazení požadovaných školení pracovníkům
            </CardTitle>
            <CardDescription>
              Editace požadavků na školení a termínů pro jednotlivé uživatele
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Výběr školení */}
            <div className='mb-4 flex items-center gap-4'>
              <Label>Školení:</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    role='combobox'
                    aria-expanded={openCombobox}
                    className='w-[300px] justify-between'
                  >
                    {trainingDisplayNames[selectedTraining]}
                    <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-[300px] p-0'>
                  <Command>
                    <CommandInput placeholder='Vyhledat školení...' />
                    <CommandList>
                      <CommandEmpty>Školení nenalezeno.</CommandEmpty>
                      <CommandGroup>
                        {Object.entries(trainingDisplayNames).map(
                          ([key, name]) => (
                            <CommandItem
                              key={key}
                              value={name}
                              onSelect={() => {
                                setSelectedTraining(key);
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedTraining === key
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              {name}
                            </CommandItem>
                          )
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tabulka uživatelů pro vybrané školení */}
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kód</TableHead>
                    <TableHead>Jméno</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Požadováno</TableHead>
                    <TableHead>Datum poslední</TableHead>
                    <TableHead>Datum příští</TableHead>
                    <TableHead>Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter((u) => u.role === 'WORKER').length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className='text-muted-foreground text-center'
                      >
                        Žádní pracovníci
                      </TableCell>
                    </TableRow>
                  ) : (
                    users
                      .filter((u) => u.role === 'WORKER')
                      .map((user) => {
                        const isEditing = editingUser?.id === user.id;
                        const training = selectedTraining;

                        // Získat hodnoty pro vybrané školení
                        const pozadovano =
                          isEditing &&
                            editingUser &&
                            `${training}Pozadovano` in editingUser.changes
                            ? editingUser.changes[`${training}Pozadovano`]
                            : user[`${training}Pozadovano`];

                        const datumPosl =
                          isEditing &&
                            editingUser &&
                            `${training}DatumPosl` in editingUser.changes
                            ? editingUser.changes[`${training}DatumPosl`]
                            : user[`${training}DatumPosl`];

                        const datumPristi =
                          isEditing &&
                            editingUser &&
                            `${training}DatumPristi` in editingUser.changes
                            ? editingUser.changes[`${training}DatumPristi`]
                            : user[`${training}DatumPristi`];

                        return (
                          <TableRow key={user.id}>
                            <TableCell className='font-mono'>
                              {user.cislo}
                            </TableCell>
                            <TableCell className='font-medium'>
                              {`${user.firstName} ${user.lastName}`}
                            </TableCell>
                            <TableCell>{user.email || '-'}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.role === 'ADMIN'
                                    ? 'destructive'
                                    : user.role === 'TRAINER'
                                      ? 'default'
                                      : 'secondary'
                                }
                              >
                                {getRoleLabel(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={Boolean(pozadovano)}
                                onCheckedChange={(checked) =>
                                  handleEditUser(
                                    user,
                                    training,
                                    'Pozadovano',
                                    checked
                                  )
                                }
                                className='cursor-pointer'
                              />
                            </TableCell>
                            <TableCell>
                              <DatePickerInput
                                value={datumPosl}
                                onChange={(date) =>
                                  handleEditUser(
                                    user,
                                    training,
                                    'DatumPosl',
                                    date
                                  )
                                }
                                className='w-[130px]'
                              />
                            </TableCell>
                            <TableCell>
                              <div className='text-muted-foreground text-sm italic'>
                                {datumPristi
                                  ? new Date(datumPristi).toLocaleDateString(
                                    'cs-CZ'
                                  )
                                  : 'Neurčeno'}
                                <span className='ml-1 text-xs'>(počítáno)</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className='flex gap-2'>
                                  <Button
                                    size='sm'
                                    onClick={() => handleSaveUser(user.id)}
                                    disabled={savingUser === user.id}
                                    className='cursor-pointer'
                                  >
                                    {savingUser === user.id ? (
                                      'Ukládání...'
                                    ) : (
                                      <Save className='h-4 w-4' />
                                    )}
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => setEditingUser(null)}
                                    disabled={savingUser === user.id}
                                    className='cursor-pointer'
                                  >
                                    <X className='h-4 w-4' />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() =>
                                    setEditingUser({ id: user.id, changes: {} })
                                  }
                                  className='cursor-pointer'
                                >
                                  <Edit className='h-4 w-4' />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog pro editaci obecných údajů uživatele */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className='sm:max-w-[500px]'>
            <DialogHeader>
              <DialogTitle>Upravit uživatele</DialogTitle>
              <DialogDescription>
                Upravte základní údaje uživatele. Pokud heslo necháte prázdné,
                nebude změněno.
              </DialogDescription>
            </DialogHeader>
            {generalUserEdit && (
              <div className='grid gap-4 py-4'>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='edit-code' className='text-right'>
                    Kód
                  </Label>
                  <Input
                    id='edit-code'
                    type='number'
                    value={generalUserEdit.cislo || ''}
                    onChange={(e) =>
                      setGeneralUserEdit({
                        ...generalUserEdit,
                        cislo: Number(e.target.value)
                      })
                    }
                    className='col-span-3'
                  />
                </div>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='edit-firstName' className='text-right'>
                    Křestní jméno
                  </Label>
                  <Input
                    id='edit-firstName'
                    value={generalUserEdit.firstName}
                    onChange={(e) =>
                      setGeneralUserEdit({
                        ...generalUserEdit,
                        firstName: e.target.value
                      })
                    }
                    className='col-span-3'
                  />
                </div>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='edit-lastName' className='text-right'>
                    Příjmení
                  </Label>
                  <Input
                    id='edit-lastName'
                    value={generalUserEdit.lastName}
                    onChange={(e) =>
                      setGeneralUserEdit({
                        ...generalUserEdit,
                        lastName: e.target.value
                      })
                    }
                    className='col-span-3'
                  />
                </div>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='edit-email' className='text-right'>
                    Email
                  </Label>
                  <Input
                    id='edit-email'
                    type='email'
                    value={generalUserEdit.email}
                    onChange={(e) =>
                      setGeneralUserEdit({
                        ...generalUserEdit,
                        email: e.target.value
                      })
                    }
                    className='col-span-3'
                  />
                </div>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='edit-password' className='text-right'>
                    Heslo
                  </Label>
                  <Input
                    id='edit-password'
                    type='password'
                    value={generalUserEdit.alias}
                    onChange={(e) =>
                      setGeneralUserEdit({
                        ...generalUserEdit,
                        alias: e.target.value
                      })
                    }
                    placeholder='Ponechte prázdné pro zachování'
                    className='col-span-3'
                  />
                </div>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='edit-role' className='text-right'>
                    Role
                  </Label>
                  <Select
                    value={generalUserEdit.role}
                    onValueChange={(value) =>
                      setGeneralUserEdit({
                        ...generalUserEdit,
                        role: value
                      })
                    }
                  >
                    <SelectTrigger className='col-span-3'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='ADMIN'>Admin</SelectItem>
                      <SelectItem value='TRAINER'>Školitel</SelectItem>
                      <SelectItem value='WORKER'>Pracovník</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setIsEditDialogOpen(false)}
                disabled={savingGeneralUser}
              >
                Zrušit
              </Button>
              <Button
                onClick={handleSaveGeneralUser}
                disabled={savingGeneralUser}
              >
                {savingGeneralUser ? 'Ukládání...' : 'Uložit změny'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog pro editaci školení */}
        <Dialog
          open={isTrainingEditDialogOpen}
          onOpenChange={setIsTrainingEditDialogOpen}
        >
          <DialogContent className='sm:max-w-[500px]'>
            <DialogHeader>
              <DialogTitle>Upravit školení</DialogTitle>
              <DialogDescription>
                Upravte název a popis školení. Kód nelze měnit.
              </DialogDescription>
            </DialogHeader>
            {trainingEdit && (
              <div className='grid gap-4 py-4'>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='edit-training-code' className='text-right'>
                    Kód
                  </Label>
                  <Input
                    id='edit-training-code'
                    value={trainingEdit.code}
                    disabled
                    className='bg-muted col-span-3'
                  />
                </div>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='edit-training-name' className='text-right'>
                    Název
                  </Label>
                  <Input
                    id='edit-training-name'
                    value={trainingEdit.name}
                    onChange={(e) =>
                      setTrainingEdit({
                        ...trainingEdit,
                        name: e.target.value
                      })
                    }
                    className='col-span-3'
                  />
                </div>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label
                    htmlFor='edit-training-description'
                    className='text-right'
                  >
                    Popis
                  </Label>
                  <Textarea
                    id='edit-training-description'
                    value={trainingEdit.description || ''}
                    onChange={(e) =>
                      setTrainingEdit({
                        ...trainingEdit,
                        description: e.target.value
                      })
                    }
                    className='col-span-3'
                    rows={4}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setIsTrainingEditDialogOpen(false)}
                disabled={savingTraining}
              >
                Zrušit
              </Button>
              <Button onClick={handleSaveTraining} disabled={savingTraining}>
                {savingTraining ? 'Ukládání...' : 'Uložit změny'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
