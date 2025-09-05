// src/types/next-auth.d.ts
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    code?: number | null;
    email?: string | null;
  }
  interface Session {
    user: {
      id: string;
      code?: number | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    code?: number | null;
    email?: string | null;
  }
}
