import { exportarConvivenciaEDE, getSupabaseAdmin } from '@/lib/ede-supabase';
import { createEdeEncryptedEnvelope } from '@/lib/ede-crypto';
import { verifyMineducTeacherOtp } from '@/lib/ede-otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/ede/convivencia?rbd=XXXX&anio=2026&limit=100&offset=0&cifrar=true
// Exporta la bitácora de convivencia escolar en formato EDE
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

    const envelope = await exportarConvivenciaEDE(
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
    console.error('[EDE API] GET /api/ede/convivencia error:', message);
    return Response.json(
      { error: 'Error al exportar convivencia EDE', detail: message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ede/convivencia
// Registra una anotación de convivencia escolar firmada con OTP (2FA)
// ---------------------------------------------------------------------------
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      alumno_id,
      enrollment_id,
      section_id,
      rbd,
      fecha,
      tipo_anotacion,
      subsector,
      descripcion,
      registrado_por_run,
      otp
    } = body;

    // Validación mínima
    if (!alumno_id || !enrollment_id || !section_id || !rbd || !fecha || !tipo_anotacion || !descripcion || !registrado_por_run || !otp) {
      return Response.json(
        { error: 'Campos requeridos faltantes para guardar anotación de convivencia' },
        { status: 400 }
      );
    }

    // 1. Validar OTP del docente/inspector
    const otpResult = await verifyMineducTeacherOtp(registrado_por_run, otp);
    if (!otpResult.isValid) {
      return Response.json(
        { error: `Firma digital rechazada: ${otpResult.message || 'OTP incorrecto o expirado.'}` },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Insertar anotación de convivencia
    const { data: newInc, error: dbError } = await supabaseAdmin
      .from('ede_discipline_incident')
      .insert({
        alumno_id,
        enrollment_id,
        section_id,
        rbd: parseInt(String(rbd), 10),
        fecha,
        tipo_anotacion,
        subsector: subsector || null,
        descripcion,
        registrado_por_run,
        firma_digital_key: otp
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. Registrar en la bitácora de auditoría inmutable
    try {
      await supabaseAdmin.from('ede_audit_log').insert({
        table_name: 'ede_discipline_incident',
        action: 'SIGN',
        record_id: newInc.incident_id,
        old_data: null,
        new_data: newInc,
        changed_by: registrado_por_run,
        justificacion: `Registro y firma digital de anotación de convivencia escolar (${tipo_anotacion})`
      });
    } catch (auditErr) {
      console.error('[EDE API] Error al registrar bitácora de convivencia:', auditErr);
    }

    return Response.json(
      { ok: true, id: newInc.incident_id, message: 'Anotación registrada y firmada con éxito' },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[EDE API] POST /api/ede/convivencia error:', message);
    return Response.json(
      { error: 'Error al registrar anotación', detail: message },
      { status: 500 }
    );
  }
}
