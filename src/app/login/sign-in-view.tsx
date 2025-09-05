// src/features/auth/components/sign-in-view.tsx
'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { IconStar, IconMail, IconIdBadge } from '@tabler/icons-react';
import Link from 'next/link';

export default function SignInViewPage() {
  // State pro email/heslo formulář
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');

  // State pro kód formulář
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/';

  // Submit pro email/heslo
  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailError('');
    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        loginType: 'email',
        redirect: false
      });

      if (res?.error) {
        setEmailError('Neplatný email nebo heslo');
      } else {
        router.replace(callbackUrl);
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Submit pro kód
  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setCodeError('');
    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        code,
        loginType: 'code',
        redirect: false
      });

      if (res?.error) {
        setCodeError('Neplatný kód zaměstnance');
      } else {
        router.replace(callbackUrl);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className='relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <Link
        href='/examples/authentication'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 hidden md:top-8 md:right-8'
        )}
      >
        Login
      </Link>

      {/* levý panel */}
      <div className='bg-zinc-900 relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r overflow-hidden'>
        {/* Background image with Next.js Image */}
        <Image
          src='/building.jpg'
          alt='Building background'
          fill
          priority
          className='object-cover'
          sizes="50vw"
        />
        {/* Gradient overlay */}
        <div
          className='absolute inset-0 bg-gradient-to-b from-[rgba(0,44,81,0.9)] to-[rgba(36,69,122,0.8)]'
        />
        <div className='relative z-20 h-full w-full flex flex-col items-center justify-center'>
          <Image
            src='/aerotech-logo.png'
            alt='AeroTech Logo'
            width={150}
            height={138}
            className='absolute top-[15%] left-1/2 transform -translate-x-1/2'
            priority
          />
          <h1
            className='text-5xl text-white uppercase tracking-[0.2em]'
            style={{
              fontFamily: 'OPTIBankGothic-Medium, Arial, sans-serif',
              fontWeight: 500,
              letterSpacing: '0.45em'
            }}
          >
            AeroLMS
          </h1>
        </div>
      </div>

      {/* pravý panel – vlastní přihlášení */}
      <div className='flex h-full items-center justify-center p-4 lg:p-8'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>

          {/* TABS s formuláři */}
          <Tabs defaultValue='code' className='w-full space-y-4'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='code' className='gap-2'>
                <IconIdBadge className='h-4 w-4' />
                Kód zaměstnance
              </TabsTrigger>
              <TabsTrigger value='email' className='gap-2'>
                <IconMail className='h-4 w-4' />
                Email a heslo
              </TabsTrigger>
            </TabsList>

            {/* Formulář pro kód zaměstnance */}
            <TabsContent value='code' className='space-y-4'>
              <form onSubmit={handleCodeSubmit} className='space-y-5'>
                <div className='space-y-2'>
                  <Label htmlFor='code'>Kód zaměstnance</Label>
                  <Input
                    id='code'
                    type='text'
                    placeholder='123456'
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                {codeError && (
                  <p className='text-sm text-destructive'>{codeError}</p>
                )}
                <Button type='submit' className='w-full' disabled={isLoading}>
                  {isLoading ? 'Přihlašování...' : 'Vstoupit'}
                </Button>
              </form>
            </TabsContent>

            {/* Formulář pro email/heslo */}
            <TabsContent value='email' className='space-y-4'>
              <form onSubmit={handleEmailSubmit} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='vas@email.cz'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='password'>Heslo</Label>
                  <Input
                    id='password'
                    type='password'
                    placeholder='••••••'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                {emailError && (
                  <p className='text-sm text-destructive'>{emailError}</p>
                )}
                <Button type='submit' className='w-full' disabled={isLoading}>
                  {isLoading ? 'Přihlašování...' : 'Přihlásit se'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className='text-muted-foreground px-8 text-center text-sm'>
            © 2025 Aerotech Czech s.r.o. Všechna práva vyhrazena.
          </p>
        </div>
      </div>
    </div>
  );
}
