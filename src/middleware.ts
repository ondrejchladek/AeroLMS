// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Odstranění potenciálně nebezpečných headerů (obrana proti CVE-2025-29927)
  const headers = new Headers(request.headers);
  headers.delete('x-middleware-subrequest');
  headers.delete('x-middleware-invoke');

  // Normalizace cesty - case-insensitive kontrola
  const normalizedPath = pathname.toLowerCase();

  // Zkontrolovat token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (!token || !token.id) {
    // Logování neautorizovaných pokusů
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    console.warn(
      `[SECURITY] Unauthorized access attempt to: ${normalizedPath} from IP: ${ip}`
    );

    // Pokud není token, přesměrovat na login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);

    const response = NextResponse.redirect(loginUrl);
    // Přidání základních security headerů
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');

    return response;
  }

  // Pro autorizované požadavky - přidání security headerů
  const response = NextResponse.next({ headers });
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  // Aplikuje middleware POUZE na tyto konkrétní cesty
  // Vynechává: login, api/auth, _next, všechny statické soubory
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml (metadata files)
     * - public assets (images: .svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     * - public assets (fonts: .otf, .ttf, .woff, .woff2)
     * - login page
     */
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|otf|ttf|woff|woff2)).*)',
    '/'
  ]
};
