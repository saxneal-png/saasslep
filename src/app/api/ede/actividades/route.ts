import { exportarActividadesEDE, getSupabaseAdmin } from '@/lib/ede-supabase';
import { createEdeEncryptedEnvelope } from '@/lib/ede-crypto';
import { verifyMineducTeacherOtp } from '@/lib/ede-otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/ede/actividades?rbd=XXXX&anio=2026&limit=100&offset=0&cifrar=true
// Exporta el leccionario de clases en formato EDE
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

    const envelope = await exportarActividadesEDE(
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
    console.error('[EDE API] GET /api/ede/actividades error:', message);
    return Response.json(
      { error: 'Error al exportar leccionario EDE', detail: message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ede/actividades
// Registra/firma una actividad en el leccionario diario de clases (2FA)
// ---------------------------------------------------------------------------
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      section_id,
      rbd,
      fecha,
      horas,
      subsector,
      contenidos,
      objetivo,
      actividad,
      evaluacion,
      docente_run,
      otp,
    } = body;

    // Validación mínima
    if (!section_id || !rbd || !fecha || !horas || !subsector || !contenidos || !objetivo || !docente_run || !otp) {
      return Response.json(
        { error: 'Campos requeridos faltantes: section_id, rbd, fecha, horas, subsector, contenidos, objetivo, docente_run, otp' },
        { status: 400 }
      );
    }

    // 1. Validar OTP del docente
    const otpResult = await verifyMineducTeacherOtp(docente_run, otp);
    if (!otpResult.isValid) {
      return Response.json(
        { error: `Firma digital rechazada por el MINEDUC: ${otpResult.message || 'OTP incorrecto o expirado.'}` },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Insertar/Actualizar la actividad de clase
    const { data: newAct, error: dbError } = await supabaseAdmin
      .from('ede_class_activity')
      .upsert({
        section_id,
        rbd: parseInt(String(rbd), 10),
        fecha,
        horas: parseInt(String(horas), 10),
        subsector,
        contenidos,
        objetivo,
        actividad: actividad || null,
        evaluacion: evaluacion || null,
        docente_run,
        firma_digital_key: otp
      }, { onConflict: 'section_id,fecha,subsector' })
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. Registrar transacción de firma en el log de auditoría
    try {
      await supabaseAdmin.from('ede_audit_log').insert({
        table_name: 'ede_class_activity',
        action: 'SIGN',
        record_id: newAct.activity_id,
        old_data: null,
        new_data: {
          fecha,
          subsector,
          otp_validado: true,
          docente_run,
          fecha_firma: new Date().toISOString()
        },
        changed_by: docente_run,
        justificacion: `Cierre de clase y leccionario firmado digitalmente para la asignatura ${subsector}`
      });
    } catch (auditErr) {
      console.error('[EDE API] Error al registrar bitácora de leccionario:', auditErr);
    }

    return Response.json(
      { ok: true, id: newAct.activity_id, message: 'Leccionario firmado y guardado con éxito' },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[EDE API] POST /api/ede/actividades error:', message);
    return Response.json(
      { error: 'Error al registrar leccionario', detail: message },
      { status: 500 }
    );
  }
}
