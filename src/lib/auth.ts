// src/lib/auth.ts
import { type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' }, // pouze JWT
  secret: process.env.NEXTAUTH_SECRET, // prefix NEXTAUTH_
  pages: { signIn: '/login' },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        // Pro email/heslo login
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'email@example.com'
        },
        password: { label: 'Heslo', type: 'password' },
        // Pro kód login
        code: { label: 'Kód zaměstnance', type: 'text', placeholder: '123456' },
        // Přepínač typu přihlášení
        loginType: { label: 'Login Type', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // Rozlišení typu přihlášení
        if (credentials.loginType === 'email') {
          // Přihlášení emailem a heslem
          const email = credentials.email?.trim().toLowerCase();
          const password = credentials.password;

          if (!email || !password) return null;

          const user = await (prisma as any).user.findUnique({ where: { email } });
          if (!user || !user.password) return null;

          // Ověření hesla
          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) return null;

          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            code: user.code
          } satisfies User;
        } else if (credentials.loginType === 'code') {
          // Přihlášení kódem zaměstnance (původní implementace)
          const code = Number(credentials.code?.trim());
          if (!code) return null;

          const user = await (prisma as any).user.findUnique({ where: { code } });
          if (!user) return null;

          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            code: user.code
          } satisfies User;
        }

        return null;
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.code = (user as any).code;
        token.email = (user as any).email;
      }
      return token;
    },
    async session({
      session,
      token
    }: {
      session: import('next-auth').Session;
      token: JWT;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.code = token.code as number | null;
        session.user.email = token.email as string | null;
      }
      return session;
    }
  }
};