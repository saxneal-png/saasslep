// =============================================================================
// TIPOS EDE/CEDS - saasslep
// Estándar: Common Education Data Standards (CEDS) adaptado a Chile
// Circular N°1 MINEDUC (Libro de Clases Digital)
// =============================================================================

// ---------------------------------------------------------------------------
// Catálogos de referencia (Ref Tables)
// ---------------------------------------------------------------------------

/** Sistema de identificación de persona */
export const REF_PERSONA_ID_SYSTEM = {
  RUN: 51,
  IPE: 52,
  NUM_MATRICULA: 55,
} as const;

export type RefPersonaIdSystemId = (typeof REF_PERSONA_ID_SYSTEM)[keyof typeof REF_PERSONA_ID_SYSTEM];

/** Tipo de organización */
export const REF_ORGANIZATION_TYPE = {
  RBD: 10,
  CURSO: 21,
  MODALIDAD: 38,
  JORNADA: 39,
  NIVEL: 40,
  GRADO: 46,
} as const;

export type RefOrganizationTypeId = (typeof REF_ORGANIZATION_TYPE)[keyof typeof REF_ORGANIZATION_TYPE];

/** Relación persona (apoderado-alumno) */
export const REF_PERSON_RELATIONSHIP = {
  PADRE: 8,
  MADRE: 19,
  APODERADO: 31,
} as const;

export type RefPersonRelationshipId = (typeof REF_PERSON_RELATIONSHIP)[keyof typeof REF_PERSON_RELATIONSHIP];

/** Estado de matrícula */
export const REF_PERSON_STATUS = {
  DEFINITIVA: 27,
  PROVISORIA: 29,
  RETIRO: 30,
} as const;

export type RefPersonStatusId = (typeof REF_PERSON_STATUS)[keyof typeof REF_PERSON_STATUS];

/** Tipo de evento de asistencia */
export const REF_ATTENDANCE_EVENT_TYPE = {
  PRESENTE: 1,
  AUSENTE: 2,
  AUSENTE_JUSTIF: 3,
  ATRASO: 4,
  RETIRO_ANTICIPADO: 5,
} as const;

export type RefAttendanceEventTypeId = (typeof REF_ATTENDANCE_EVENT_TYPE)[keyof typeof REF_ATTENDANCE_EVENT_TYPE];

/** Nivel de alerta temprana (MAT) */
export type NivelAlertaMAT = 'CRITICO' | 'ADVERTENCIA' | 'NORMAL' | 'SIN_DATOS';

/** Sexo / género */
export type SexoId = 1 | 2 | 3; // 1=M, 2=F, 3=NB
export type SexoCodigo = 'M' | 'F' | 'NB';

// ---------------------------------------------------------------------------
// Entidades principales (tablas EDE)
// ---------------------------------------------------------------------------

/** Persona base (alumno o apoderado) — tabla: ede_person */
export interface EdePersona {
  person_id: string;
  rbd: number;  // INTEGER — FK a establecimientos.rbd
  primer_nombre: string;
  segundo_nombre?: string | null;
  apellido_paterno: string;
  apellido_materno?: string | null;
  fecha_nacimiento?: string | null; // ISO date YYYY-MM-DD
  sexo_id?: SexoId | null;
  nacionalidad?: string | null; // ISO 3166-1 alpha-2
  es_alumno: boolean;
  es_apoderado: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Identificador de persona (RUN, IPE, N° Matrícula) — tabla: ede_person_identifier */
export interface EdeIdentificador {
  id: string;
  person_id: string;
  identificador: string;
  system_id: RefPersonaIdSystemId;
  es_primario: boolean;
  created_at?: string;
}

/** Relación apoderado-alumno — tabla: ede_person_relationship */
export interface EdeRelacionPersona {
  id: string;
  alumno_id: string;
  apoderado_id: string;
  relationship_id: RefPersonRelationshipId;
  es_apoderado_ppal: boolean;
  telefono_contacto?: string | null;
  email_contacto?: string | null;
  created_at?: string;
}

/** Sección de curso — tabla: ede_course_section */
export interface EdeSectionCurso {
  section_id: string;
  rbd: number;  // INTEGER — FK a establecimientos.rbd
  nombre_curso: string; // e.g. '3° Básico A'
  nivel: string;
  letra?: string | null;
  anio_escolar: number;
  jornada?: 'JEC' | 'No JEC' | null;
  modalidad?: string | null;
  docente_jefe_run?: string | null;
  capacidad_maxima?: number;
  created_at?: string;
}

/** Matrícula — tabla: ede_enrollment */
export interface EdeMatricula {
  enrollment_id: string;
  alumno_id: string;
  section_id: string;
  rbd: number;  // INTEGER — FK a establecimientos.rbd
  anio_escolar: number;
  estado_id: RefPersonStatusId;
  fecha_matricula: string; // ISO date
  fecha_retiro?: string | null;
  motivo_retiro?: string | null;
  numero_matricula?: string | null;
  es_pie: boolean;
  es_sep: boolean;
  es_prioritario: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Evento de asistencia — tabla: ede_attendance_event */
export interface EdeAsistenciaEvento {
  event_id: string;
  enrollment_id: string;
  alumno_id: string;
  section_id: string;
  rbd: number;  // INTEGER — FK a establecimientos.rbd
  fecha: string; // ISO date
  event_type_id: RefAttendanceEventTypeId;
  minutos_asistidos?: number | null;
  observacion?: string | null;
  registrado_por_run?: string | null;
  created_at?: string;
}

/** Resultado de evaluación — tabla: ede_assessment_result */
export interface EdeResultadoEvaluacion {
  result_id: string;
  enrollment_id: string;
  alumno_id: string;
  section_id: string;
  asignatura: string;
  periodo: string; // 'Semestre 1', 'Semestre 2', 'Anual'
  tipo_evaluacion: string; // 'Formativa', 'Sumativa', 'Parcial', 'Final'
  descripcion?: string | null;
  nota_numerica?: number | null; // 1.0 - 7.0
  nota_conceptual?: 'MB' | 'B' | 'S' | 'I' | null;
  fecha_evaluacion: string;
  anio_escolar: number;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Tipos de VISTAS (resultados de queries a las vistas EDE)
// ---------------------------------------------------------------------------

/** Vista: vw_ede_matricula — Nómina oficial de matrícula */
export interface EdeRegistroMatriculaRow {
  rbd: number;  // INTEGER
  nombre_establecimiento: string;
  anio_escolar: number;
  nombre_curso: string;
  nivel: string;
  letra: string | null;
  jornada: string | null;
  alumno_id: string;
  rut_ipe_estudiante: string | null;
  tipo_identificador: 'RUN' | 'IPE' | 'SIN_ID';
  numero_correlativo_matricula: string | null;
  primer_nombre: string;
  segundo_nombre: string | null;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  edad: number | null;
  sexo: SexoCodigo;
  nacionalidad: string | null;
  enrollment_id: string;
  estado_id: RefPersonStatusId;
  estado_matricula: string;
  descripcion_estado: string;
  fecha_matricula: string;
  fecha_retiro: string | null;
  motivo_retiro: string | null;
  es_pie: boolean;
  es_sep: boolean;
  es_prioritario: boolean;
  docente_jefe: string | null;
  docente_jefe_run: string | null;
}

/** Vista: vw_ede_asistencia_diaria */
export interface EdeAsistenciaDiariaRow {
  rbd: number;  // INTEGER
  nombre_curso: string;
  nivel: string;
  anio_escolar: number;
  fecha: string;
  alumno_id: string;
  rut_ipe_estudiante: string | null;
  nombre_completo: string;
  event_type_id: RefAttendanceEventTypeId;
  tipo_asistencia: string;
  descripcion_asistencia: string;
  minutos_asistidos: number | null;
  observacion: string | null;
  registrado_por_run: string | null;
}

/** Vista: vw_ede_nomina_alumnos */
export interface EdeNominaAlumnoRow {
  rbd: number;  // INTEGER
  nombre_curso: string;
  nivel: string;
  letra: string | null;
  anio_escolar: number;
  numero_lista: number;
  alumno_id: string;
  rut_ipe_estudiante: string | null;
  primer_nombre: string;
  segundo_nombre: string | null;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  sexo: SexoCodigo;
  estado_matricula: string;
  es_pie: boolean;
  es_sep: boolean;
}

/** Vista: vw_ede_alerta_temprana */
export interface EdeAlertaTempranaRow {
  rbd: number;  // INTEGER
  nombre_establecimiento: string;
  nombre_curso: string;
  nivel: string;
  alumno_id: string;
  rut_ipe_estudiante: string | null;
  nombre_completo: string;
  total_sesiones: number;
  sesiones_presente: number;
  ausencias_sin_justif: number;
  ausencias_justif: number;
  porcentaje_asistencia: number | null;
  nivel_alerta: NivelAlertaMAT;
  anio: number;
}

/** Vista: vw_ede_resumen_curso */
export interface EdeResumenCursoRow {
  rbd: number;  // INTEGER
  nombre_establecimiento: string;
  nombre_curso: string;
  nivel: string;
  letra: string | null;
  anio_escolar: number;
  docente_jefe_run: string | null;
  docente_jefe: string | null;
  total_matriculados: number;
  matriculados_definitivos: number;
  matriculados_provisorios: number;
  retirados: number;
  alumnos_pie: number;
  alumnos_sep: number;
  alumnos_prioritarios: number;
}

// ---------------------------------------------------------------------------
// Payloads de inserción / actualización
// ---------------------------------------------------------------------------

/** Payload para matricular un alumno nuevo */
export interface EdeMatricularAlumnoPayload {
  rbd: number;  // INTEGER — RBD del establecimiento
  anio_escolar: number;
  section_id: string;
  // Datos de la persona
  primer_nombre: string;
  segundo_nombre?: string;
  apellido_paterno: string;
  apellido_materno?: string;
  fecha_nacimiento?: string;
  sexo_id?: SexoId;
  nacionalidad?: string;
  // Identificadores
  run?: string;   // Si tiene RUN
  ipe?: string;   // Si tiene IPE
  // Estado matrícula
  estado_id?: RefPersonStatusId;
  es_pie?: boolean;
  es_sep?: boolean;
  es_prioritario?: boolean;
  // Apoderado principal
  apoderado?: {
    primer_nombre: string;
    apellido_paterno: string;
    apellido_materno?: string;
    run?: string;
    telefono?: string;
    email?: string;
    relationship_id: RefPersonRelationshipId;
  };
}

/** Payload para registrar asistencia en lote */
export interface EdeRegistrarAsistenciaPayload {
  section_id: string;
  rbd: number;  // INTEGER — RBD del establecimiento
  fecha: string;
  registrado_por_run: string;
  eventos: Array<{
    enrollment_id: string;
    alumno_id: string;
    event_type_id: RefAttendanceEventTypeId;
    minutos_asistidos?: number;
    observacion?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Respuesta EDE JSON (formato exportación Circular N°1)
// ---------------------------------------------------------------------------

/** Envelope de exportación EDE para MINEDUC */
export interface EdeExportEnvelope<T> {
  version: 'EDE-MINEDUC-CIRCULAR1';
  generatedAt: string; // ISO datetime
  rbd: number;  // INTEGER — RBD del establecimiento
  anio_escolar: number;
  totalRecords: number;
  records: T[];
}
