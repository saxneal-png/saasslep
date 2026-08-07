import { exportarPieEDE, getSupabaseAdmin } from '@/lib/ede-supabase';
import { createEdeEncryptedEnvelope } from '@/lib/ede-crypto';
import { verifyMineducTeacherOtp } from '@/lib/ede-otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/ede/pie?rbd=XXXX&anio=2026&limit=100&offset=0&cifrar=true
// Exporta los registros Aula PIE en formato EDE
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

    const envelope = await exportarPieEDE(
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
    console.error('[EDE API] GET /api/ede/pie error:', message);
    return Response.json(
      { error: 'Error al exportar PIE EDE', detail: message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ede/pie
// Registra/firma una adecuación curricular Aula PIE (2FA)
// ---------------------------------------------------------------------------
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      alumno_id,
      enrollment_id,
      section_id,
      rbd,
      fecha_registro,
      paci_detalles,
      tipo_apoyo,
      progreso_anual,
      equipo_aula,
      reuniones_coordinacion,
      estrategias_familia,
      registrado_por_run,
      otp
    } = body;

    // Validación mínima
    if (!alumno_id || !enrollment_id || !section_id || !rbd || !fecha_registro || !registrado_por_run || !otp) {
      return Response.json(
        { error: 'Campos requeridos faltantes para registrar ficha PIE' },
        { status: 400 }
      );
    }

    // 1. Validar OTP del especialista/docente PIE
    const otpResult = await verifyMineducTeacherOtp(registrado_por_run, otp);
    if (!otpResult.isValid) {
      return Response.json(
        { error: `Firma digital PIE rechazada: ${otpResult.message || 'OTP incorrecto.'}` },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Insertar ficha PIE
    const { data: newPie, error: dbError } = await supabaseAdmin
      .from('ede_pie_record')
      .insert({
        alumno_id,
        enrollment_id,
        section_id,
        rbd: parseInt(String(rbd), 10),
        fecha_registro,
        paci_detalles: paci_detalles || null,
        tipo_apoyo: tipo_apoyo || null,
        progreso_anual: progreso_anual || null,
        equipo_aula: equipo_aula || null,
        reuniones_coordinacion: reuniones_coordinacion || null,
        estrategias_familia: estrategias_familia || null,
        registrado_por_run,
        firma_digital_key: otp
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. Registrar en bitácora
    try {
      await supabaseAdmin.from('ede_audit_log').insert({
        table_name: 'ede_pie_record',
        action: 'SIGN',
        record_id: newPie.pie_id,
        old_data: null,
        new_data: newPie,
        changed_by: registrado_por_run,
        justificacion: `Ingreso y firma digital de planificación y adecuaciones Aula PIE`
      });
    } catch (auditErr) {
      console.error('[EDE API] Error al registrar bitácora de PIE:', auditErr);
    }

    return Response.json(
      { ok: true, pie_id: newPie.pie_id, message: 'Planificación PIE registrada y firmada con éxito' },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[EDE API] POST /api/ede/pie error:', message);
    return Response.json(
      { error: 'Error al registrar Aula PIE', detail: message },
      { status: 500 }
    );
  }
}
