'use client';

import React, { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Users,
  BookOpen,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Check,
  ChevronsUpDown
} from 'lucide-react';
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
  UserID: number;
  code: number;
  name: string;
  email: string | null;
  role: string;
  [key: string]: any; // Pro dynamické sloupce školení
}

interface EditingUser {
  UserID: number;
  changes: Record<string, any>;
}


// Role labels
const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'Administrátor';
    case 'TRAINER':
      return 'Školitel';
    case 'WORKER':
      return 'Pracovník';
    default:
      return role;
  }
};

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
  const [trainingDisplayNames, setTrainingDisplayNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Načíst školení z databáze (admin request)
      const trainingsResponse = await fetch('/api/trainings?admin=true');
      if (!trainingsResponse.ok) throw new Error('Nepodařilo se načíst školení');
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
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Chyba při načítání dat');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User, training: string, field: string, value: any) => {
    const fieldName = `${training}${field}`;

    // Pokud ještě není v režimu editace, inicializuj editingUser
    if (!editingUser || editingUser.UserID !== user.UserID) {
      setEditingUser({
        UserID: user.UserID,
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
    if (!editingUser || editingUser.UserID !== userId) return;

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

      // Aktualizovat lokální data
      setUsers(users.map(u =>
        u.UserID === userId
          ? { ...u, ...editingUser.changes }
          : u
      ));

      setEditingUser(null);
      setSuccess('Změny byly úspěšně uloženy');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving user:', error);
      setError(error instanceof Error ? error.message : 'Chyba při ukládání');
    } finally {
      setSavingUser(null);
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
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-muted-foreground">Načítání dat...</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin přehled</h1>
          <p className="text-muted-foreground">Správa školení a uživatelů</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Tabulka školení */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Žádná školení v databázi
                    </TableCell>
                  </TableRow>
                ) : (
                  trainings.map(training => (
                    <TableRow key={training.id}>
                      <TableCell className="font-mono">{training.code}</TableCell>
                      <TableCell className="font-medium">{training.name}</TableCell>
                      <TableCell>{training.description}</TableCell>
                      <TableCell>
                        <Badge variant={training.testsCount > 0 ? "default" : "secondary"}>
                          {training.testsCount} {training.testsCount === 1 ? 'test' : 'testů'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(training.createdAt)}</TableCell>
                      <TableCell>{formatDate(training.updatedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabulka uživatelů */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Správa uživatelů
            </CardTitle>
            <CardDescription>
              Editace školení, termínů a rolí pro jednotlivé uživatele
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Výběr školení */}
            <div className="flex items-center gap-4 mb-4">
              <Label>Školení:</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-[300px] justify-between"
                  >
                    {trainingDisplayNames[selectedTraining]}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Vyhledat školení..." />
                    <CommandList>
                      <CommandEmpty>Školení nenalezeno.</CommandEmpty>
                      <CommandGroup>
                        {Object.entries(trainingDisplayNames).map(([key, name]) => (
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
                                "mr-2 h-4 w-4",
                                selectedTraining === key ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tabulka uživatelů pro vybrané školení */}
            <div className="overflow-x-auto">
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
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Žádní uživatelé
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map(user => {
                      const isEditing = editingUser?.UserID === user.UserID;
                      const training = selectedTraining;

                      // Získat hodnoty pro vybrané školení
                      const pozadovano = isEditing && editingUser && `${training}Pozadovano` in editingUser.changes
                        ? editingUser.changes[`${training}Pozadovano`]
                        : user[`${training}Pozadovano`];

                      const datumPosl = isEditing && editingUser && `${training}DatumPosl` in editingUser.changes
                        ? editingUser.changes[`${training}DatumPosl`]
                        : user[`${training}DatumPosl`];

                      const datumPristi = isEditing && editingUser && `${training}DatumPristi` in editingUser.changes
                        ? editingUser.changes[`${training}DatumPristi`]
                        : user[`${training}DatumPristi`];

                      return (
                        <TableRow key={user.UserID}>
                          <TableCell className="font-mono">
                            {user.code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.name}
                          </TableCell>
                          <TableCell>{user.email || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'TRAINER' ? 'default' : 'secondary'}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={Boolean(pozadovano)}
                              onCheckedChange={(checked) =>
                                handleEditUser(user, training, 'Pozadovano', checked)
                              }
                              className="cursor-pointer"
                            />
                          </TableCell>
                          <TableCell>
                            <DatePickerInput
                              value={datumPosl}
                              onChange={(date) =>
                                handleEditUser(user, training, 'DatumPosl', date)
                              }
                              className="w-[130px]"
                            />
                          </TableCell>
                          <TableCell>
                            <DatePickerInput
                              value={datumPristi}
                              onChange={(date) =>
                                handleEditUser(user, training, 'DatumPristi', date)
                              }
                              className="w-[130px]"
                            />
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveUser(user.UserID)}
                                  disabled={savingUser === user.UserID}
                                  className="cursor-pointer"
                                >
                                  {savingUser === user.UserID ? (
                                    'Ukládání...'
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingUser(null)}
                                  disabled={savingUser === user.UserID}
                                  className="cursor-pointer"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingUser({ UserID: user.UserID, changes: {} })}
                                className="cursor-pointer"
                              >
                                <Edit className="h-4 w-4" />
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
      </div>
    </PageContainer>
  );
}