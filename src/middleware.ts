// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('slep_sim_role')?.value;
  const path = request.nextUrl.pathname;

  // Proteger carpetas especializadas bajo /sostenedor (recursos humanos y finanzas)
  if (path.startsWith('/sostenedor/rrhh') || path.startsWith('/sostenedor/finanzas')) {
    if (role !== 'sostenedor_maestro') {
      if (role === 'profesional_slep') {
        return NextResponse.redirect(new URL('/profesional', request.url));
      } else if (role === 'director_escuela') {
        return NextResponse.redirect(new URL('/escuela', request.url));
      } else {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/sostenedor/:path*'],
};
