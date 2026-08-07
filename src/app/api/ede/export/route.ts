// =============================================================================
// API Route Handler: GET /api/ede/export
// Exportación consolidada EDE (matrícula + asistencia + alertas)
// para auditorías MINEDUC / SLEP
// Runtime: nodejs · Next.js 16 App Router
// =============================================================================
import { exportarMatriculaEDE, exportarAsistenciaEDE, exportarSalidasEDE, exportarActividadesEDE, exportarResumenAsistenciaMesEDE, exportarEvaluacionesEDE, exportarConvivenciaEDE, getAlertaTempranaAlumnos } from '@/lib/ede-supabase';
import { createEdeEncryptedEnvelope } from '@/lib/ede-crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ede/export?rbd=XXXX&anio=2026&modulo=matricula|asistencia|alertas|todos
 *
 * Parámetros:
 *   rbd     (requerido) — RBD del establecimiento
 *   anio    (opcional)  — Año escolar, default = año actual
 *   modulo  (opcional)  — 'matricula' | 'asistencia' | 'alertas' | 'todos' (default)
 *   desde   (opcional)  — Fecha inicio asistencia YYYY-MM-DD
 *   hasta   (opcional)  — Fecha fin asistencia YYYY-MM-DD
 *   limit   (opcional)  — Límite de registros para paginación
 *   offset  (opcional)  — Desplazamiento para paginación
 *   cifrar  (opcional)  — 'true' para encriptar la respuesta con RSA-OAEP
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const rbd = searchParams.get('rbd');
    const anioParam = searchParams.get('anio');
    const modulo = searchParams.get('modulo') ?? 'todos';
    const desde = searchParams.get('desde') ?? undefined;
    const hasta = searchParams.get('hasta') ?? undefined;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const cifrarParam = searchParams.get('cifrar') === 'true';

    // Validación
    if (!rbd || rbd.trim() === '') {
      return Response.json(
        { error: 'Parámetro requerido: rbd' },
        { status: 400 }
      );
    }

    const modulosValidos = ['matricula', 'asistencia', 'alertas', 'todos'];
    if (!modulosValidos.includes(modulo)) {
      return Response.json(
        { error: `Módulo inválido. Valores permitidos: ${modulosValidos.join(', ')}` },
        { status: 400 }
      );
    }

    const anioEscolar = anioParam
      ? parseInt(anioParam, 10)
      : new Date().getFullYear();

    if (isNaN(anioEscolar) || anioEscolar < 2020 || anioEscolar > 2099) {
      return Response.json(
        { error: 'Año escolar inválido (2020-2099)' },
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

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    const generatedAt = new Date().toISOString();

    // Ejecutar en paralelo según el módulo solicitado
    const [matriculaEnv, asistenciaEnv, salidasEnv, actividadesEnv, resumenMesEnv, evaluacionesEnv, convivenciaEnv, alertas] = await Promise.all([
      modulo === 'matricula' || modulo === 'todos'
        ? exportarMatriculaEDE(rbdInt, anioEscolar, isNaN(limit as number) ? undefined : limit, isNaN(offset as number) ? undefined : offset)
        : Promise.resolve(null),
      modulo === 'asistencia' || modulo === 'todos'
        ? exportarAsistenciaEDE(rbdInt, anioEscolar, desde, hasta, isNaN(limit as number) ? undefined : limit, isNaN(offset as number) ? undefined : offset)
        : Promise.resolve(null),
      modulo === 'salidas' || modulo === 'todos'
        ? exportarSalidasEDE(rbdInt, anioEscolar, isNaN(limit as number) ? undefined : limit, isNaN(offset as number) ? undefined : offset)
        : Promise.resolve(null),
      modulo === 'actividades' || modulo === 'todos'
        ? exportarActividadesEDE(rbdInt, anioEscolar, isNaN(limit as number) ? undefined : limit, isNaN(offset as number) ? undefined : offset)
        : Promise.resolve(null),
      modulo === 'resumen_mes' || modulo === 'todos'
        ? exportarResumenAsistenciaMesEDE(rbdInt, anioEscolar, isNaN(limit as number) ? undefined : limit, isNaN(offset as number) ? undefined : offset)
        : Promise.resolve(null),
      modulo === 'evaluaciones' || modulo === 'todos'
        ? exportarEvaluacionesEDE(rbdInt, anioEscolar, isNaN(limit as number) ? undefined : limit, isNaN(offset as number) ? undefined : offset)
        : Promise.resolve(null),
      modulo === 'convivencia' || modulo === 'todos'
        ? exportarConvivenciaEDE(rbdInt, anioEscolar, isNaN(limit as number) ? undefined : limit, isNaN(offset as number) ? undefined : offset)
        : Promise.resolve(null),
      modulo === 'alertas' || modulo === 'todos'
        ? getAlertaTempranaAlumnos(rbdInt, anioEscolar)
        : Promise.resolve(null),
    ]);

    const response = {
      version: 'EDE-MINEDUC-CIRCULAR1',
      generatedAt,
      rbd: rbdInt,
      anio_escolar: anioEscolar,
      modulo,
      ...(matriculaEnv !== null && {
        matricula: {
          totalRecords: matriculaEnv.totalRecords,
          records: matriculaEnv.records,
        },
      }),
      ...(asistenciaEnv !== null && {
        asistencia: {
          totalRecords: asistenciaEnv.totalRecords,
          records: asistenciaEnv.records,
        },
      }),
      ...(salidasEnv !== null && {
        salidas: {
          totalRecords: salidasEnv.totalRecords,
          records: salidasEnv.records,
        },
      }),
      ...(actividadesEnv !== null && {
        actividades: {
          totalRecords: actividadesEnv.totalRecords,
          records: actividadesEnv.records,
        },
      }),
      ...(resumenMesEnv !== null && {
        resumen_mes: {
          totalRecords: resumenMesEnv.totalRecords,
          records: resumenMesEnv.records,
        },
      }),
      ...(evaluacionesEnv !== null && {
        evaluaciones: {
          totalRecords: evaluacionesEnv.totalRecords,
          records: evaluacionesEnv.records,
        },
      }),
      ...(convivenciaEnv !== null && {
        convivencia: {
          totalRecords: convivenciaEnv.totalRecords,
          records: convivenciaEnv.records,
        },
      }),
      ...(alertas !== null && {
        alertas_temprana: {
          totalRecords: alertas.length,
          criticos: alertas.filter((a) => a.nivel_alerta === 'CRITICO').length,
          advertencias: alertas.filter((a) => a.nivel_alerta === 'ADVERTENCIA').length,
          records: alertas,
        },
      }),
    };

    const responsePayload = cifrarParam 
      ? createEdeEncryptedEnvelope(response) 
      : response;

    return Response.json(responsePayload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-EDE-Version': cifrarParam ? 'CIRCULAR1-2024-ENCRYPTED' : 'CIRCULAR1-2024',
        'X-EDE-RBD': String(rbdInt),
        'X-EDE-Anio': String(anioEscolar),
        'X-EDE-Modulo': modulo,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('[EDE API] GET /api/ede/export error:', message);
    return Response.json(
      { error: 'Error en exportación EDE', detail: message },
      { status: 500 }
    );
  }
}
