// =============================================================================
// API Route Handler: GET /api/ede/matricula
// Exporta JSON EDE de matrícula — Circular N°1 MINEDUC
// Runtime: nodejs (requerido por Supabase JS)
// Next.js 16 App Router — usa Response nativo (no NextResponse)
// =============================================================================
import { exportarMatriculaEDE } from '@/lib/ede-supabase';
import { createEdeEncryptedEnvelope } from '@/lib/ede-crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const rbd = searchParams.get('rbd');
    const anioParam = searchParams.get('anio');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const cifrarParam = searchParams.get('cifrar') === 'true';

    // Validación de parámetros
    if (!rbd || rbd.trim() === '') {
      return Response.json(
        { error: 'Parámetro requerido: rbd (Rol Base de Datos del establecimiento)' },
        { status: 400 }
      );
    }

    const rbdInt = parseInt(rbd.trim(), 10);
    if (isNaN(rbdInt)) {
      return Response.json(
        { error: 'Parámetro inválido: rbd debe ser un número entero' },
        { status: 400 }
      );
    }

    const anioEscolar = anioParam
      ? parseInt(anioParam, 10)
      : new Date().getFullYear();

    if (isNaN(anioEscolar) || anioEscolar < 2020 || anioEscolar > 2099) {
      return Response.json(
        { error: 'Parámetro inválido: anio debe ser un año entre 2020 y 2099' },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    const envelope = await exportarMatriculaEDE(
      rbdInt, 
      anioEscolar, 
      isNaN(limit as number) ? undefined : limit, 
      isNaN(offset as number) ? undefined : offset
    );

    const responsePayload = cifrarParam 
      ? createEdeEncryptedEnvelope(envelope) 
      : envelope;

    return Response.json(responsePayload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-EDE-Version': cifrarParam ? 'CIRCULAR1-2024-ENCRYPTED' : 'CIRCULAR1-2024',
        'X-EDE-RBD': String(rbdInt),
        'X-EDE-Anio': String(anioEscolar),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('[EDE API] /api/ede/matricula error:', message);
    return Response.json(
      { error: 'Error al exportar matrícula EDE', detail: message },
      { status: 500 }
    );
  }
}
