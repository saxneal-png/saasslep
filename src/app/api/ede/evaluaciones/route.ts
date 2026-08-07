import { exportarEvaluacionesEDE, getSupabaseAdmin } from '@/lib/ede-supabase';
import { createEdeEncryptedEnvelope } from '@/lib/ede-crypto';
import { verifyMineducTeacherOtp } from '@/lib/ede-otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/ede/evaluaciones?rbd=XXXX&anio=2026&limit=100&offset=0&cifrar=true
// Exporta las calificaciones/evaluaciones en formato EDE
// ---------------------------------------------------------------------------
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const rbd = searchParams.get('rbd');
    const anioParam = searchParams.get('anio');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const cifrarParam = searchParams.get('cifrar') === 'true';

    if (!rbd || rbd.trim() === '') {
      return Response.json(
        { error: 'Parámetro requerido: rbd' },
        { status: 400 }
      );
    }

    const rbdInt = parseInt(rbd.trim(), 10);
    if (isNaN(rbdInt)) {
      return Response.json(
        { error: 'Parámetro inválido: rbd' },
        { status: 400 }
      );
    }

    const anioEscolar = anioParam
      ? parseInt(anioParam, 10)
      : new Date().getFullYear();

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    const envelope = await exportarEvaluacionesEDE(
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
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[EDE API] GET /api/ede/evaluaciones error:', message);
    return Response.json(
      { error: 'Error al exportar calificaciones EDE', detail: message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ede/evaluaciones
// Registra/actualiza calificaciones firmadas con OTP docente (2FA)
// ---------------------------------------------------------------------------
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      enrollment_id,
      alumno_id,
      section_id,
      subsector,
      periodo,
      calificaciones,
      promedio,
      registrado_por_run,
      otp,
      anio_escolar
    } = body;

    // Validación mínima
    if (!enrollment_id || !alumno_id || !section_id || !subsector || !periodo || !calificaciones || !registrado_por_run || !otp || !anio_escolar) {
      return Response.json(
        { error: 'Campos requeridos faltantes para guardar evaluación' },
        { status: 400 }
      );
    }

    // 1. Validar OTP del docente
    const otpResult = await verifyMineducTeacherOtp(registrado_por_run, otp);
    if (!otpResult.isValid) {
      return Response.json(
        { error: `Firma digital rechazada: ${otpResult.message || 'OTP incorrecto o expirado.'}` },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Insertar o actualizar resultado de evaluación
    // En Supabase, usamos upsert basado en la clave lógica única por alumno, sección, asignatura y periodo
    const { data: newEval, error: dbError } = await supabaseAdmin
      .from('ede_assessment_result')
      .upsert({
        enrollment_id,
        alumno_id,
        section_id,
        subsector,
        periodo,
        calificaciones,
        promedio: promedio || null,
        registrado_por_run,
        firma_digital_key: otp,
        anio_escolar: parseInt(String(anio_escolar), 10)
      }, { onConflict: 'enrollment_id,subsector,periodo' })
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. Registrar en la bitácora de auditoría inmutable
    try {
      await supabaseAdmin.from('ede_audit_log').insert({
        table_name: 'ede_assessment_result',
        action: 'SIGN',
        record_id: newEval.result_id,
        old_data: null,
        new_data: {
          periodo,
          subsector,
          calificaciones,
          promedio,
          docente_run: registrado_por_run
        },
        changed_by: registrado_por_run,
        justificacion: `Ingreso y firma digital de calificaciones para el estudiante en ${subsector} (${periodo})`
      });
    } catch (auditErr) {
      console.error('[EDE API] Error al registrar bitácora de evaluación:', auditErr);
    }

    return Response.json(
      { ok: true, id: newEval.result_id, message: 'Calificaciones guardadas y firmadas con éxito' },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[EDE API] POST /api/ede/evaluaciones error:', message);
    return Response.json(
      { error: 'Error al registrar calificaciones', detail: message },
      { status: 500 }
    );
  }
}
