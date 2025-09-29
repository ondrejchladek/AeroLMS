'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Award, FileText, Search, Filter } from 'lucide-react';

interface TestAttempt {
  id: number;
  testTitle: string;
  trainingName: string;
  score: number;
  passed: boolean;
  evaluator: string;
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
  name: string;
  code: string;
}

export function ResultsClient() {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [filteredAttempts, setFilteredAttempts] = useState<TestAttempt[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch attempts when user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setAttempts([]);
      setFilteredAttempts([]);
      return;
    }

    const fetchAttempts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/test-attempts/manual?userId=${selectedUserId}`);
        if (response.ok) {
          const data = await response.json();
          setAttempts(data.attempts || []);
          setFilteredAttempts(data.attempts || []);
        }
      } catch (error) {
        console.error('Error fetching attempts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempts();
  }, [selectedUserId]);

  // Filter attempts based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredAttempts(attempts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = attempts.filter(attempt =>
      attempt.trainingName.toLowerCase().includes(query) ||
      attempt.testTitle.toLowerCase().includes(query) ||
      attempt.evaluator?.toLowerCase().includes(query) ||
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

  const selectedUser = users.find(u => u.id === parseInt(selectedUserId));

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Výsledky testů</h1>
        <p className="text-muted-foreground">
          Přehled všech výsledků testů absolvovaných osobně
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* User Selection */}
            <div className="space-y-2">
              <Label htmlFor="user">Zaměstnanec</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user">
                  <SelectValue placeholder="Vyberte zaměstnance" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Vyhledávání</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Hledat podle školení, testu, hodnotitele..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={!selectedUserId}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Výsledky - {selectedUser.name}
              </div>
              <Badge variant="outline">
                {filteredAttempts.length} {filteredAttempts.length === 1 ? 'výsledek' : 'výsledků'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Seznam všech absolvovaných testů zaměstnance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Načítání...
              </div>
            ) : filteredAttempts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'Nebyly nalezeny žádné výsledky' : 'Žádné výsledky k zobrazení'}
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Školení</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Skóre</TableHead>
                      <TableHead>Výsledek</TableHead>
                      <TableHead>Hodnotitel</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Certifikát</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="font-medium">
                          {attempt.trainingName}
                        </TableCell>
                        <TableCell>{attempt.testTitle}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{attempt.score.toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell>
                          {attempt.passed ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Uspěl
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Neuspěl
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {attempt.evaluator || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(attempt.createdAt)}
                        </TableCell>
                        <TableCell>
                          {attempt.certificate ? (
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-mono">
                                {attempt.certificate.certificateNumber}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
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
      )}

      {!selectedUserId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Vyberte zaměstnance pro zobrazení výsledků</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}