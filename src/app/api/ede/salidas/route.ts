import { exportarSalidasEDE, getSupabaseAdmin } from '@/lib/ede-supabase';
import { createEdeEncryptedEnvelope } from '@/lib/ede-crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/ede/salidas?rbd=XXXX&anio=2026&limit=100&offset=0&cifrar=true
// Exporta salidas/retiros anticipados en formato EDE
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

    const envelope = await exportarSalidasEDE(
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
    console.error('[EDE API] GET /api/ede/salidas error:', message);
    return Response.json(
      { error: 'Error al exportar salidas EDE', detail: message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ede/salidas
// Registra un nuevo retiro anticipado de un estudiante
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
      hora_salida,
      hora_regreso,
      retirado_por_nombre,
      retirado_por_run,
      firma_digital_key,
      firma_scan_base64,
      observacion,
    } = body;

    // Validación mínima
    if (!alumno_id || !enrollment_id || !section_id || !rbd || !fecha || !hora_salida || !retirado_por_nombre) {
      return Response.json(
        { error: 'Campos obligatorios faltantes: alumno_id, enrollment_id, section_id, rbd, fecha, hora_salida, retirado_por_nombre' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Insertar el retiro anticipado
    const { data: newDep, error: insertError } = await supabaseAdmin
      .from('ede_early_departure')
      .insert({
        alumno_id,
        enrollment_id,
        section_id,
        rbd: parseInt(String(rbd), 10),
        fecha,
        hora_salida,
        hora_regreso: hora_regreso || null,
        retirado_por_nombre,
        retirado_por_run: retirado_por_run || null,
        firma_digital_key: firma_digital_key || null,
        firma_scan_base64: firma_scan_base64 || null,
        observacion: observacion || null
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 2. Registrar en la bitácora de auditoría inmutable
    try {
      await supabaseAdmin.from('ede_audit_log').insert({
        table_name: 'ede_early_departure',
        action: 'INSERT',
        record_id: newDep.id,
        old_data: null,
        new_data: newDep,
        changed_by: retirado_por_run || 'SYSTEM',
        justificacion: `Retiro anticipado de alumno registrado por ${retirado_por_nombre}`
      });
    } catch (auditErr) {
      console.error('[EDE API] Error al registrar bitácora de retiro:', auditErr);
    }

    return Response.json(
      { ok: true, id: newDep.id, message: 'Retiro anticipado registrado con éxito' },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[EDE API] POST /api/ede/salidas error:', message);
    return Response.json(
      { error: 'Error al registrar retiro anticipado', detail: message },
      { status: 500 }
    );
  }
}
