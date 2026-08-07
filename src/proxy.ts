// =============================================================================
// proxy.ts — Reemplaza middleware.ts (deprecado en Next.js 16)
// Protección de rutas por rol: RRHH/Finanzas y módulos EDE
// =============================================================================
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Roles habilitados para módulos EDE
const EDE_ALLOWED_ROLES = ['sostenedor_maestro', 'profesional_slep', 'director_escuela'];

export function proxy(request: NextRequest) {
  const role = request.cookies.get('slep_sim_role')?.value;
  const path = request.nextUrl.pathname;

  // ── Rutas RRHH/Finanzas: solo sostenedor_maestro ──────────────────────────
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

  // ── Módulos EDE (Matrícula / Asistencia): requieren rol EDE ───────────────
  if (
    path.startsWith('/escuela/matricula') ||
    path.startsWith('/escuela/asistencia')
  ) {
    if (!role || !EDE_ALLOWED_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ── API EDE: requieren rol EDE ────────────────────────────────────────────
  if (path.startsWith('/api/ede/')) {
    if (!role || !EDE_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'No autorizado — se requiere rol EDE' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/sostenedor/:path*',
    '/escuela/matricula/:path*',
    '/escuela/asistencia/:path*',
    '/api/ede/:path*',
  ],
};
