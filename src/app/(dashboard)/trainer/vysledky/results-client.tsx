'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Award,
  FileText,
  Search,
  Filter
} from 'lucide-react';

interface TestAttempt {
  id: number;
  testTitle: string;
  trainingName: string;
  userName: string;
  userCislo: number | null;
  score: number;
  passed: boolean;
  createdAt: string;
  certificate: {
    id: number;
    certificateNumber: string;
    issuedAt: string;
    validUntil: string;
  } | null;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  cislo: number | null;
}

interface Training {
  id: number;
  name: string;
  code: string;
}

interface Test {
  id: number;
  title: string;
  trainingId: number;
}

export function ResultsClient() {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [filteredAttempts, setFilteredAttempts] = useState<TestAttempt[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [tests, setTests] = useState<Test[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data (users, trainings, tests)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch users, trainings in parallel
        const [usersRes, trainingsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/trainings?admin=true')
        ]);

        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.users || []);
        }

        if (trainingsRes.ok) {
          const data = await trainingsRes.json();
          setTrainings(data.trainings || []);
        }
      } catch {
        // Error silently handled via UI state
      }
    };
    fetchInitialData();
  }, []);

  // Fetch tests when training is selected
  useEffect(() => {
    if (!selectedTrainingId) {
      return;
    }

    const fetchTests = async () => {
      try {
        const training = trainings.find(
          (t) => t.id === parseInt(selectedTrainingId)
        );
        if (!training) return;

        const response = await fetch(`/api/trainings/${training.id}/tests`);
        if (response.ok) {
          const data = await response.json();
          setTests(data.tests || []);
        }
      } catch {
        // Error silently handled via UI state
      }
    };

    fetchTests();
  }, [selectedTrainingId, trainings]);

  // Fetch attempts with filters
  useEffect(() => {
    const fetchAttempts = async () => {
      setIsLoading(true);
      try {
        // Build query params (skip "_all" values)
        const params = new URLSearchParams();
        if (selectedUserId && selectedUserId !== '_all')
          params.append('userId', selectedUserId);
        if (selectedTrainingId && selectedTrainingId !== '_all')
          params.append('trainingId', selectedTrainingId);
        if (selectedTestId && selectedTestId !== '_all')
          params.append('testId', selectedTestId);

        const queryString = params.toString();
        const url = queryString
          ? `/api/test-attempts/manual?${queryString}`
          : '/api/test-attempts/manual';

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setAttempts(data.attempts || []);
          setFilteredAttempts(data.attempts || []);
        }
      } catch {
        // Error silently handled via UI state
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempts();
  }, [selectedUserId, selectedTrainingId, selectedTestId]);

  // Filter attempts based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredAttempts(attempts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = attempts.filter(
      (attempt) =>
        attempt.trainingName.toLowerCase().includes(query) ||
        attempt.testTitle.toLowerCase().includes(query) ||
        attempt.certificate?.certificateNumber.toLowerCase().includes(query)
    );
    setFilteredAttempts(filtered);
  }, [searchQuery, attempts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className='container mx-auto max-w-7xl p-6'>
      <div className='mb-6'>
        <h1 className='mb-2 text-3xl font-bold'>Výsledky testů</h1>
        <p className='text-muted-foreground'>
          Přehled všech výsledků testů ze všech přidělených školení
        </p>
      </div>

      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Filter className='h-5 w-5' />
            Filtry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            {/* User Selection */}
            <div className='space-y-2'>
              <Label htmlFor='user'>Zaměstnanec</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id='user'>
                  <SelectValue placeholder='Všichni' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='_all'>Všichni</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {`${user.firstName} ${user.lastName}`} ({user.cislo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Training Selection */}
            <div className='space-y-2'>
              <Label htmlFor='training'>Školení</Label>
              <Select
                value={selectedTrainingId}
                onValueChange={(value) => {
                  setSelectedTrainingId(value);
                  setSelectedTestId(''); // Reset test selection
                }}
              >
                <SelectTrigger id='training'>
                  <SelectValue placeholder='Všechna školení' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='_all'>Všechna školení</SelectItem>
                  {trainings.map((training) => (
                    <SelectItem key={training.id} value={training.id.toString()}>
                      {training.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Test Selection */}
            <div className='space-y-2'>
              <Label htmlFor='test'>Test</Label>
              <Select
                value={selectedTestId}
                onValueChange={setSelectedTestId}
                disabled={!selectedTrainingId || selectedTrainingId === '_all'}
              >
                <SelectTrigger id='test'>
                  <SelectValue placeholder='Všechny testy' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='_all'>Všechny testy</SelectItem>
                  {tests.map((test) => (
                    <SelectItem key={test.id} value={test.id.toString()}>
                      {test.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className='space-y-2'>
              <Label htmlFor='search'>Vyhledávání</Label>
              <div className='relative'>
                <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                <Input
                  id='search'
                  placeholder='Hledat...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <FileText className='h-5 w-5' />
              Výsledky testů
            </div>
            <Badge variant='outline'>
              {filteredAttempts.length}{' '}
              {filteredAttempts.length === 1 ? 'výsledek' : 'výsledků'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Seznam všech absolvovaných testů ze všech přidělených školení
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='text-muted-foreground py-8 text-center'>
              Načítání...
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className='text-muted-foreground py-8 text-center'>
              {searchQuery
                ? 'Nebyly nalezeny žádné výsledky'
                : 'Žádné výsledky k zobrazení'}
            </div>
          ) : (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zaměstnanec</TableHead>
                    <TableHead>Školení</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Skóre</TableHead>
                    <TableHead>Výsledek</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Certifikát</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className='font-medium'>
                        {attempt.userName}
                        {attempt.userCislo && (
                          <span className='text-muted-foreground ml-2 text-sm'>
                            ({attempt.userCislo})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{attempt.trainingName}</TableCell>
                      <TableCell>{attempt.testTitle}</TableCell>
                      <TableCell>
                        <Badge variant='outline'>
                          {attempt.score.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {attempt.passed ? (
                          <Badge variant='default' className='gap-1'>
                            <CheckCircle className='h-3 w-3' />
                            Uspěl
                          </Badge>
                        ) : (
                          <Badge variant='destructive' className='gap-1'>
                            <XCircle className='h-3 w-3' />
                            Neuspěl
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className='text-muted-foreground text-sm'>
                        {formatDate(attempt.createdAt)}
                      </TableCell>
                      <TableCell>
                        {attempt.certificate ? (
                          <div className='flex items-center gap-2'>
                            <Award className='h-4 w-4 text-yellow-600' />
                            <span className='font-mono text-sm'>
                              {attempt.certificate.certificateNumber}
                            </span>
                          </div>
                        ) : (
                          <span className='text-muted-foreground text-sm'>
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
