import { exportarAsistenciaEDE, registrarAsistencia, getSupabaseAdmin } from '@/lib/ede-supabase';
import { createEdeEncryptedEnvelope } from '@/lib/ede-crypto';
import { verifyMineducTeacherOtp } from '@/lib/ede-otp';
import { EdeRegistrarAsistenciaPayload } from '@/lib/ede-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/ede/asistencia?rbd=XXXX&anio=2026&desde=2026-03-01&hasta=2026-03-31
// ---------------------------------------------------------------------------
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const rbd = searchParams.get('rbd');
    const anioParam = searchParams.get('anio');
    const desde = searchParams.get('desde') ?? undefined;
    const hasta = searchParams.get('hasta') ?? undefined;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const cifrarParam = searchParams.get('cifrar') === 'true';

    if (!rbd || rbd.trim() === '') {
      return Response.json(
        { error: 'Parámetro requerido: rbd' },
        { status: 400 }
      );
    }

    const anioEscolar = anioParam
      ? parseInt(anioParam, 10)
      : new Date().getFullYear();

    if (isNaN(anioEscolar)) {
      return Response.json(
        { error: 'Parámetro inválido: anio' },
        { status: 400 }
      );
    }

    // Validar formato de fechas si se proporcionan
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (desde && !isoDateRegex.test(desde)) {
      return Response.json(
        { error: 'Formato inválido: desde debe ser YYYY-MM-DD' },
        { status: 400 }
      );
    }
    if (hasta && !isoDateRegex.test(hasta)) {
      return Response.json(
        { error: 'Formato inválido: hasta debe ser YYYY-MM-DD' },
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

    const envelope = await exportarAsistenciaEDE(
      rbdInt,
      anioEscolar,
      desde,
      hasta,
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
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('[EDE API] GET /api/ede/asistencia error:', message);
    return Response.json(
      { error: 'Error al exportar asistencia EDE', detail: message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ede/asistencia — Registrar pase de lista
// Body: EdeRegistrarAsistenciaPayload (JSON)
// ---------------------------------------------------------------------------
export async function POST(request: Request): Promise<Response> {
  try {
    let body: EdeRegistrarAsistenciaPayload;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: 'Body inválido: se esperaba JSON' },
        { status: 400 }
      );
    }

    // Validación mínima
    if (!body.rbd || !body.section_id || !body.fecha || !body.registrado_por_run) {
      return Response.json(
        { error: 'Campos requeridos: rbd, section_id, fecha, registrado_por_run' },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.eventos) || body.eventos.length === 0) {
      return Response.json(
        { error: 'Se requiere al menos un evento de asistencia' },
        { status: 400 }
      );
    }

    // Validar OTP transaccional si se proporciona (2FA / Firma Digital)
    let otpValidado = false;
    if (body.otp && body.rut_firmante) {
      const otpResult = await verifyMineducTeacherOtp(body.rut_firmante, body.otp);
      if (!otpResult.isValid) {
        return Response.json(
          { error: `Firma digital rechazada por el MINEDUC: ${otpResult.message || 'OTP incorrecto o expirado.'}` },
          { status: 400 }
        );
      }
      otpValidado = true;
    }

    const count = await registrarAsistencia(body);

    // Si se firmó digitalmente con OTP, registrar la transacción en el log de auditoría
    if (otpValidado && body.rut_firmante) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        await supabaseAdmin.from('ede_audit_log').insert({
          table_name: 'ede_attendance_event',
          action: 'SIGN',
          record_id: body.section_id,
          old_data: null,
          new_data: {
            fecha: body.fecha,
            otp_validado: true,
            rut_firmante: body.rut_firmante,
            fecha_firma: new Date().toISOString()
          },
          changed_by: body.rut_firmante,
          justificacion: `Asistencia diaria del ${body.fecha} firmada digitalmente mediante doble factor OTP`
        });
      } catch (auditErr) {
        console.error('[EDE API] Error al guardar bitácora de firma OTP:', auditErr);
      }
    }

    return Response.json(
      {
        ok: true,
        registrados: count,
        rbd: body.rbd,
        fecha: body.fecha,
        section_id: body.section_id,
        firmado: otpValidado,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('[EDE API] POST /api/ede/asistencia error:', message);
    return Response.json(
      { error: 'Error al registrar asistencia', detail: message },
      { status: 500 }
    );
  }
}
