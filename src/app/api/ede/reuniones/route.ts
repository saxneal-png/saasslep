import { exportarReunionesEDE, getSupabaseAdmin } from '@/lib/ede-supabase';
import { createEdeEncryptedEnvelope } from '@/lib/ede-crypto';
import { verifyMineducTeacherOtp } from '@/lib/ede-otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/ede/reuniones?rbd=XXXX&anio=2026&limit=100&offset=0&cifrar=true
// Exporta reuniones de apoderados y asistencia en formato EDE
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

    const envelope = await exportarReunionesEDE(
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
    console.error('[EDE API] GET /api/ede/reuniones error:', message);
    return Response.json(
      { error: 'Error al exportar reuniones EDE', detail: message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ede/reuniones
// Registra una reunión y las firmas de asistencia de apoderados (2FA)
// ---------------------------------------------------------------------------
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      section_id,
      rbd,
      fecha,
      temario,
      creado_por_run,
      otp,
      asistencia
    } = body;

    // Validación mínima
    if (!section_id || !rbd || !fecha || !temario || !creado_por_run || !otp || !Array.isArray(asistencia)) {
      return Response.json(
        { error: 'Campos requeridos faltantes para guardar la reunión de apoderados' },
        { status: 400 }
      );
    }

    // 1. Validar OTP del docente jefe que autoriza el cierre del acta
    const otpResult = await verifyMineducTeacherOtp(creado_por_run, otp);
    if (!otpResult.isValid) {
      return Response.json(
        { error: `Firma digital docente rechazada: ${otpResult.message || 'OTP incorrecto.'}` },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Insertar cabecera de la reunión
    const { data: newMeet, error: meetError } = await supabaseAdmin
      .from('ede_parent_meeting')
      .insert({
        section_id,
        rbd: parseInt(String(rbd), 10),
        fecha,
        temario,
        creado_por_run
      })
      .select()
      .single();

    if (meetError) throw meetError;

    // 3. Insertar firmas y registros de asistencia
    const attInserts = asistencia.map((att: any) => {
      return {
        meeting_id: newMeet.meeting_id,
        apoderado_id: att.apoderado_id,
        alumno_id: att.alumno_id,
        asistio: !!att.asistio,
        firma_digital_key: att.firma_digital_key || null,
        firma_scan_base64: att.firma_scan_base64 || null
      };
    });

    if (attInserts.length > 0) {
      const { error: attError } = await supabaseAdmin
        .from('ede_parent_meeting_attendance')
        .insert(attInserts);
      if (attError) throw attError;
    }

    // 4. Registrar en bitácora de auditoría
    try {
      await supabaseAdmin.from('ede_audit_log').insert({
        table_name: 'ede_parent_meeting',
        action: 'SIGN',
        record_id: newMeet.meeting_id,
        old_data: null,
        new_data: {
          fecha,
          temario,
          total_asistentes: attInserts.filter((a: any) => a.asistio).length
        },
        changed_by: creado_por_run,
        justificacion: `Cierre y firma de acta de reunión de apoderados del curso`
      });
    } catch (auditErr) {
      console.error('[EDE API] Error al registrar bitácora de reunión:', auditErr);
    }

    return Response.json(
      { ok: true, meeting_id: newMeet.meeting_id, message: 'Reunión y asistencia guardadas y firmadas con éxito' },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[EDE API] POST /api/ede/reuniones error:', message);
    return Response.json(
      { error: 'Error al registrar reunión de apoderados', detail: message },
      { status: 500 }
    );
  }
}
