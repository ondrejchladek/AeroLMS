'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Award,
  AlertTriangle,
  Download,
  RefreshCw,
  Home,
  TrendingUp,
  Target
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TestResultsProps {
  results: {
    score: string;
    passed: boolean;
    totalPoints: number;
    earnedPoints: number;
    passingScore: number;
    message: string;
  };
  testTitle: string;
  onRetry?: () => void;
  onBackToTraining?: () => void;
}

export function TestResults({ results, testTitle, onRetry, onBackToTraining }: TestResultsProps) {
  const router = useRouter();
  const scoreNumber = parseFloat(results.score);

  const getScoreColor = () => {
    if (scoreNumber >= 90) return 'text-green-600';
    if (scoreNumber >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeEmoji = () => {
    if (scoreNumber >= 90) return '🌟';
    if (scoreNumber >= 80) return '✨';
    if (scoreNumber >= 70) return '👍';
    return '📚';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4">
            {results.passed ? (
              <div className="relative">
                <CheckCircle className="h-20 w-20 text-green-500" />
                <Award className="h-10 w-10 text-yellow-500 absolute -bottom-2 -right-2" />
              </div>
            ) : (
              <div className="relative">
                <XCircle className="h-20 w-20 text-red-500" />
                <AlertTriangle className="h-10 w-10 text-yellow-500 absolute -bottom-2 -right-2" />
              </div>
            )}
          </div>
          
          <CardTitle className="text-2xl">
            {results.passed ? 'Test úspěšně dokončen!' : 'Test nedokončen'}
          </CardTitle>
          
          <p className="text-muted-foreground mt-2">{testTitle}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Score */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-5xl font-bold" style={{ color: getScoreColor() }}>
                {results.score}%
              </span>
              <span className="text-4xl">{getGradeEmoji()}</span>
            </div>
            
            <Progress 
              value={scoreNumber} 
              className="h-3"
            />
            
            <p className="text-lg font-medium">{results.message}</p>
          </div>

          <Separator />

          {/* Score Details */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <Card>
              <CardContent className="pt-6">
                <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{results.earnedPoints}</div>
                <p className="text-xs text-muted-foreground">Získané body</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{results.totalPoints}</div>
                <p className="text-xs text-muted-foreground">Celkem bodů</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{results.passingScore}%</div>
                <p className="text-xs text-muted-foreground">Min. úspěšnost</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            {results.passed ? (
              <Badge className="text-lg py-2 px-6 bg-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                PROŠEL
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-lg py-2 px-6">
                <XCircle className="h-5 w-5 mr-2" />
                NEPROŠEL
              </Badge>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!results.passed && onRetry && (
              <Button 
                onClick={onRetry}
                variant="default"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Zkusit znovu
              </Button>
            )}
            
            {onBackToTraining && (
              <Button 
                onClick={onBackToTraining}
                variant={results.passed ? "default" : "outline"}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Zpět na školení
              </Button>
            )}
            
            <Button 
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Na přehled
            </Button>
          </div>

          {/* Additional Info */}
          {results.passed && (
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Certifikát vystaven
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Vaše školení bylo úspěšně dokončeno a zaznamenáno v systému. 
                      Platnost školení je 1 rok od dnešního data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!results.passed && (
            <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                      Doporučení
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Doporučujeme znovu projít studijní materiály a věnovat pozornost 
                      oblastem, ve kterých jste měli potíže. Po důkladném prostudování 
                      můžete test opakovat.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}