// src/lib/auth.ts
import { type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login' // Error page
  },
  debug: false,

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

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.password) return null;

          // Ověření hesla
          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) return null;

          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            code: user.code,
            role: user.role
          } satisfies User;
        } else if (credentials.loginType === 'code') {
          // Přihlášení osobním číslem a heslem (worker)
          const code = Number(credentials.code?.trim());
          const password = credentials.password;

          if (!code || isNaN(code) || !password) {
            return null;
          }

          try {
            const user = await prisma.user.findUnique({ where: { code } });

            if (!user || !user.password) {
              return null;
            }

            // Ověření hesla
            const isValidPassword = await bcrypt.compare(
              password,
              user.password
            );
            if (!isValidPassword) {
              return null;
            }

            return {
              id: String(user.id),
              name: user.name || null,
              email: user.email || null,
              code: user.code,
              role: user.role
            } satisfies User;
          } catch (error) {
            return null;
          }
        }

        return null;
      }
    })
  ],

  callbacks: {
    async jwt({
      token,
      user,
      account,
      trigger
    }: {
      token: JWT;
      user?: User;
      account?: any;
      trigger?: any;
    }) {
      try {
        // Při prvním přihlášení nebo refresh
        if (user) {
          token.id = user.id;
          token.code = (user as any).code;
          token.email = (user as any).email;
          token.role = (user as any).role;
          // Přidáme timestamp pro tracking
          token.iat = Math.floor(Date.now() / 1000);
        }

        // Pokud nemáme základní údaje, vraťme token s výchozími hodnotami
        if (!token.id) {
          return {
            ...token,
            id: '',
            code: null,
            email: null,
            role: 'WORKER'
          };
        }

        // Kontrola expirace tokenu
        const tokenAge =
          Math.floor(Date.now() / 1000) - ((token.iat as number) || 0);
        if (tokenAge > 30 * 24 * 60 * 60) {
          // Token je starší než 30 dní, vynutit re-login
          return {
            ...token,
            id: '',
            code: null,
            email: null,
            role: 'WORKER',
            expired: true
          };
        }

        return token;
      } catch (error) {
        // Vrátit token s výchozími hodnotami pro zachování kompatibility
        return {
          ...token,
          id: '',
          code: null,
          email: null,
          role: 'WORKER',
          error: true
        };
      }
    },
    async session({
      session,
      token
    }: {
      session: import('next-auth').Session;
      token: JWT;
    }) {
      try {
        // Kontrola validity tokenu
        if (!token || !token.id) {
          throw new Error('Invalid token');
        }

        if (session.user) {
          session.user.id = token.id as string;
          session.user.code = token.code as number | null;
          session.user.email = token.email as string | null;
          session.user.role = token.role as string;
        }
        return session;
      } catch (error) {
        // Vrátit prázdnou session pro vyvolání re-login
        return {
          ...session,
          expires: new Date(0).toISOString() // Expirovaná session
        };
      }
    }
  }
};
