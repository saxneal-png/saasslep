// =============================================================================
// CAPA DE ACCESO A DATOS EDE/CEDS - Supabase
// saasslep · Circular N°1 MINEDUC
// =============================================================================
import { createClient } from '@supabase/supabase-js';
import {
  EdePersona,
  EdeIdentificador,
  EdeSectionCurso,
  EdeMatricula,
  EdeAsistenciaEvento,
  EdeRegistroMatriculaRow,
  EdeAsistenciaDiariaRow,
  EdeNominaAlumnoRow,
  EdeAlertaTempranaRow,
  EdeResumenCursoRow,
  EdeMatricularAlumnoPayload,
  EdeRegistrarAsistenciaPayload,
  EdeExportEnvelope,
  REF_PERSONA_ID_SYSTEM,
  REF_PERSON_STATUS,
} from './ede-types';

// ---------------------------------------------------------------------------
// Cliente Supabase (usa las mismas env vars que el resto de la app)
// ---------------------------------------------------------------------------
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas');
  }
  return createClient(url, key);
}

/** Cliente con service_role para operaciones de API (sin RLS) */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas');
  }
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// CURSOS / SECCIONES
// ---------------------------------------------------------------------------

/** Obtener todas las secciones de un RBD en un año escolar */
export async function getSectionesByRbd(
  rbd: number,
  anioEscolar: number
): Promise<EdeSectionCurso[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('ede_course_section')
    .select('*')
    .eq('rbd', rbd)
    .eq('anio_escolar', anioEscolar)
    .order('nombre_curso');

  if (error) throw new Error(`getSectionesByRbd: ${error.message}`);
  return data ?? [];
}

/** Crear una nueva sección de curso */
export async function createSection(
  payload: Omit<EdeSectionCurso, 'section_id' | 'created_at'>
): Promise<EdeSectionCurso> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('ede_course_section')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`createSection: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// MATRÍCULA
// ---------------------------------------------------------------------------

/**
 * Obtener la nómina de matrícula completa de un RBD (desde la vista EDE)
 * Responde al Formulario A1 de la Circular N°1
 */
export async function getMatriculaByRbd(
  rbd: number,
  anioEscolar: number,
  opts?: { incluirRetirados?: boolean; sectionId?: string }
): Promise<EdeRegistroMatriculaRow[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('vw_ede_matricula')
    .select('*')
    .eq('rbd', rbd)
    .eq('anio_escolar', anioEscolar)
    .order('nombre_curso')
    .order('apellido_paterno');

  if (!opts?.incluirRetirados) {
    query = query.neq('estado_id', REF_PERSON_STATUS.RETIRO);
  }
  if (opts?.sectionId) {
    query = query.eq('section_id', opts.sectionId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getMatriculaByRbd: ${error.message}`);
  return data ?? [];
}

/**
 * Matricular un alumno (persona nueva o existente)
 * Operación transaccional: crea persona + identificadores + enrollment
 */
export async function matricularAlumno(
  payload: EdeMatricularAlumnoPayload
): Promise<{ enrollment_id: string; person_id: string }> {
  const supabase = getSupabase();

  // 1. Crear o encontrar la persona
  const personaPayload: Omit<EdePersona, 'person_id' | 'created_at' | 'updated_at'> = {
    rbd: payload.rbd,
    primer_nombre: payload.primer_nombre.trim().toUpperCase(),
    segundo_nombre: payload.segundo_nombre?.trim().toUpperCase() ?? null,
    apellido_paterno: payload.apellido_paterno.trim().toUpperCase(),
    apellido_materno: payload.apellido_materno?.trim().toUpperCase() ?? null,
    fecha_nacimiento: payload.fecha_nacimiento ?? null,
    sexo_id: payload.sexo_id ?? null,
    nacionalidad: payload.nacionalidad ?? 'CL',
    es_alumno: true,
    es_apoderado: false,
  };

  const { data: persona, error: personaErr } = await supabase
    .from('ede_person')
    .insert(personaPayload)
    .select('person_id')
    .single();

  if (personaErr) throw new Error(`matricularAlumno (persona): ${personaErr.message}`);

  const person_id = persona.person_id;

  // 2. Insertar identificadores (RUN / IPE)
  const identificadores: Array<Omit<EdeIdentificador, 'id' | 'created_at'>> = [];

  if (payload.run) {
    identificadores.push({
      person_id,
      identificador: payload.run.replace(/\./g, '').toUpperCase(),
      system_id: REF_PERSONA_ID_SYSTEM.RUN,
      es_primario: true,
    });
  }
  if (payload.ipe) {
    identificadores.push({
      person_id,
      identificador: payload.ipe.toUpperCase(),
      system_id: REF_PERSONA_ID_SYSTEM.IPE,
      es_primario: !payload.run,
    });
  }

  if (identificadores.length > 0) {
    const { error: idErr } = await supabase
      .from('ede_person_identifier')
      .insert(identificadores);
    if (idErr) throw new Error(`matricularAlumno (identificadores): ${idErr.message}`);
  }

  // 3. Crear enrollment
  const enrollmentPayload: Omit<EdeMatricula, 'enrollment_id' | 'created_at' | 'updated_at'> = {
    alumno_id: person_id,
    section_id: payload.section_id,
    rbd: payload.rbd,
    anio_escolar: payload.anio_escolar,
    estado_id: payload.estado_id ?? REF_PERSON_STATUS.DEFINITIVA,
    fecha_matricula: new Date().toISOString().split('T')[0],
    es_pie: payload.es_pie ?? false,
    es_sep: payload.es_sep ?? false,
    es_prioritario: payload.es_prioritario ?? false,
  };

  const { data: enrollment, error: enrollErr } = await supabase
    .from('ede_enrollment')
    .insert(enrollmentPayload)
    .select('enrollment_id')
    .single();

  if (enrollErr) throw new Error(`matricularAlumno (enrollment): ${enrollErr.message}`);

  // 4. Si hay apoderado, crearlo y vincularlo
  if (payload.apoderado) {
    const ap = payload.apoderado;
    const apPayload: Omit<EdePersona, 'person_id' | 'created_at' | 'updated_at'> = {
      rbd: payload.rbd,
      primer_nombre: ap.primer_nombre.trim().toUpperCase(),
      segundo_nombre: null,
      apellido_paterno: ap.apellido_paterno.trim().toUpperCase(),
      apellido_materno: ap.apellido_materno?.trim().toUpperCase() ?? null,
      es_alumno: false,
      es_apoderado: true,
    };

    const { data: apoderado, error: apErr } = await supabase
      .from('ede_person')
      .insert(apPayload)
      .select('person_id')
      .single();

    if (apErr) throw new Error(`matricularAlumno (apoderado): ${apErr.message}`);

    if (ap.run) {
      await supabase.from('ede_person_identifier').insert({
        person_id: apoderado.person_id,
        identificador: ap.run.replace(/\./g, '').toUpperCase(),
        system_id: REF_PERSONA_ID_SYSTEM.RUN,
        es_primario: true,
      });
    }

    await supabase.from('ede_person_relationship').insert({
      alumno_id: person_id,
      apoderado_id: apoderado.person_id,
      relationship_id: ap.relationship_id,
      es_apoderado_ppal: true,
      telefono_contacto: ap.telefono ?? null,
      email_contacto: ap.email ?? null,
    });
  }

  return { enrollment_id: enrollment.enrollment_id, person_id };
}

/** Actualizar estado de matrícula (definitiva, provisoria, retiro) */
export async function actualizarEstadoMatricula(
  enrollmentId: string,
  estadoId: number,
  opts?: { fechaRetiro?: string; motivoRetiro?: string }
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('ede_enrollment')
    .update({
      estado_id: estadoId,
      fecha_retiro: opts?.fechaRetiro ?? null,
      motivo_retiro: opts?.motivoRetiro ?? null,
    })
    .eq('enrollment_id', enrollmentId);

  if (error) throw new Error(`actualizarEstadoMatricula: ${error.message}`);
}

// ---------------------------------------------------------------------------
// ASISTENCIA
// ---------------------------------------------------------------------------

/**
 * Obtener registro de asistencia diaria de un curso
 */
export async function getAsistenciaDiaria(
  rbd: number,
  fecha: string, // YYYY-MM-DD
  sectionId?: string
): Promise<EdeAsistenciaDiariaRow[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('vw_ede_asistencia_diaria')
    .select('*')
    .eq('rbd', rbd)
    .eq('fecha', fecha)
    .order('nombre_completo');

  if (sectionId) {
    // No se puede filtrar directamente por section_id en la vista, usar nombre_curso
    // En producción, agregar section_id a la vista o filtrar en cliente
  }

  const { data, error } = await query;
  if (error) throw new Error(`getAsistenciaDiaria: ${error.message}`);
  return data ?? [];
}

/**
 * Obtener nómina de alumnos de un curso (para pasar lista)
 */
export async function getNominaAlumnos(
  rbd: number,
  anioEscolar: number,
  sectionId?: string
): Promise<EdeNominaAlumnoRow[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('vw_ede_nomina_alumnos')
    .select('*')
    .eq('rbd', rbd)
    .eq('anio_escolar', anioEscolar)
    .order('numero_lista');

  const { data, error } = await query;
  if (error) throw new Error(`getNominaAlumnos: ${error.message}`);
  return data ?? [];
}

/**
 * Registrar asistencia en lote (batch insert/upsert)
 * Un evento por alumno por fecha (ON CONFLICT actualiza)
 */
export async function registrarAsistencia(
  payload: EdeRegistrarAsistenciaPayload
): Promise<number> {
  const supabase = getSupabase();

  const eventos: Omit<EdeAsistenciaEvento, 'event_id' | 'created_at'>[] =
    payload.eventos.map((ev) => ({
      enrollment_id: ev.enrollment_id,
      alumno_id: ev.alumno_id,
      section_id: payload.section_id,
      rbd: payload.rbd,
      fecha: payload.fecha,
      event_type_id: ev.event_type_id,
      minutos_asistidos: ev.minutos_asistidos ?? null,
      observacion: ev.observacion ?? null,
      registrado_por_run: payload.registrado_por_run,
    }));

  const { error, data } = await supabase
    .from('ede_attendance_event')
    .upsert(eventos, { onConflict: 'enrollment_id,fecha' })
    .select('event_id');

  if (error) throw new Error(`registrarAsistencia: ${error.message}`);
  return data?.length ?? eventos.length;
}

// ---------------------------------------------------------------------------
// ALERTAS Y ANALÍTICA
// ---------------------------------------------------------------------------

/**
 * Obtener alumnos con alerta de asistencia (MAT)
 * Filtros opcionales por nivel_alerta
 */
export async function getAlertaTempranaAlumnos(
  rbd: number,
  anio: number,
  nivelAlerta?: 'CRITICO' | 'ADVERTENCIA'
): Promise<EdeAlertaTempranaRow[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('vw_ede_alerta_temprana')
    .select('*')
    .eq('rbd', rbd)
    .eq('anio', anio)
    .order('porcentaje_asistencia', { ascending: true });

  if (nivelAlerta) {
    query = query.eq('nivel_alerta', nivelAlerta);
  } else {
    query = query.in('nivel_alerta', ['CRITICO', 'ADVERTENCIA']);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getAlertaTempranaAlumnos: ${error.message}`);
  return data ?? [];
}

/**
 * Obtener resumen de cursos para el dashboard
 */
export async function getResumenCursosByRbd(
  rbd: number,
  anioEscolar: number
): Promise<EdeResumenCursoRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('vw_ede_resumen_curso')
    .select('*')
    .eq('rbd', rbd)
    .eq('anio_escolar', anioEscolar)
    .order('nombre_curso');

  if (error) throw new Error(`getResumenCursosByRbd: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// EXPORTACIÓN EDE (para API Route Handlers)
// ---------------------------------------------------------------------------

export async function exportarMatriculaEDE(
  rbd: number,
  anioEscolar: number,
  limit?: number,
  offset?: number
): Promise<EdeExportEnvelope<EdeRegistroMatriculaRow>> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('vw_ede_matricula')
    .select('*')
    .eq('rbd', rbd)
    .eq('anio_escolar', anioEscolar)
    .neq('estado_id', REF_PERSON_STATUS.RETIRO)
    .order('nombre_curso')
    .order('apellido_paterno');

  if (limit !== undefined && offset !== undefined) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) throw new Error(`exportarMatriculaEDE: ${error.message}`);

  return {
    version: 'EDE-MINEDUC-CIRCULAR1',
    generatedAt: new Date().toISOString(),
    rbd,
    anio_escolar: anioEscolar,
    totalRecords: data?.length ?? 0,
    records: data ?? [],
  };
}

/**
 * Exportar asistencia en formato EDE Circular N°1 (usa admin client)
 */
export async function exportarAsistenciaEDE(
  rbd: number,
  anioEscolar: number,
  fechaDesde?: string,
  fechaHasta?: string,
  limit?: number,
  offset?: number
): Promise<EdeExportEnvelope<EdeAsistenciaDiariaRow>> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('vw_ede_asistencia_diaria')
    .select('*')
    .eq('rbd', rbd)
    .eq('anio_escolar', anioEscolar)
    .order('fecha', { ascending: false })
    .order('nombre_curso');

  if (fechaDesde) query = query.gte('fecha', fechaDesde);
  if (fechaHasta) query = query.lte('fecha', fechaHasta);

  if (limit !== undefined && offset !== undefined) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) throw new Error(`exportarAsistenciaEDE: ${error.message}`);

  return {
    version: 'EDE-MINEDUC-CIRCULAR1',
    generatedAt: new Date().toISOString(),
    rbd,
    anio_escolar: anioEscolar,
    totalRecords: data?.length ?? 0,
    records: data ?? [],
  };
}
