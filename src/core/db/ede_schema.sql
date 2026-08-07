-- =============================================================================
-- ESQUEMA EDE/CEDS - SAAS SLEP (Circular N°1 MINEDUC)
-- Estándar: Common Education Data Standards (CEDS) adaptado a Chile
-- Ejecutar en Supabase SQL Editor (orden secuencial)
-- =============================================================================

-- Habilitar extensión UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLAS DE CATÁLOGO / REFERENCIA (Ref Tables CEDS)
-- =============================================================================

-- 1. Sistemas de Identificación de Persona
--    51 = RUN, 52 = IPE, 55 = N° Correlativo Matrícula
CREATE TABLE IF NOT EXISTS public.ede_ref_persona_id_system (
  id            INT PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,  -- 'RUN', 'IPE', 'NUM_MATRICULA'
  descripcion   TEXT NOT NULL
);

INSERT INTO public.ede_ref_persona_id_system (id, codigo, descripcion) VALUES
  (51, 'RUN',          'Rol Único Nacional'),
  (52, 'IPE',          'Identificador Provisorio de Extranjero'),
  (43, 'NUM_MATRICULA','Número de Matrícula del Establecimiento'),
  (54, 'NUM_LISTA',    'Número de Lista del Estudiante'),
  (55, 'NUM_MATRICULA_OLD', 'Número Correlativo de Matrícula (Legacy)')
ON CONFLICT (id) DO NOTHING;

-- 2. Tipos de Organización (contexto escolar chileno)
--    10=RBD/Escuela, 21=Curso/Letra, 38=Modalidad, 39=Jornada, 40=Nivel, 46=Grado
CREATE TABLE IF NOT EXISTS public.ede_ref_organization_type (
  id            INT PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  descripcion   TEXT NOT NULL
);

INSERT INTO public.ede_ref_organization_type (id, codigo, descripcion) VALUES
  (10, 'RBD',       'Establecimiento Educacional (RBD)'),
  (21, 'CURSO',     'Curso / Letra'),
  (38, 'MODALIDAD', 'Modalidad Educativa'),
  (39, 'JORNADA',   'Jornada Escolar (JEC / No JEC)'),
  (40, 'NIVEL',     'Nivel Educativo'),
  (46, 'GRADO',     'Grado Escolar')
ON CONFLICT (id) DO NOTHING;

-- 3. Tipos de Relación Persona (apoderado-alumno)
--    8=Padre, 19=Madre, 31=Apoderado/Tutor
CREATE TABLE IF NOT EXISTS public.ede_ref_person_relationship (
  id            INT PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  descripcion   TEXT NOT NULL
);

INSERT INTO public.ede_ref_person_relationship (id, codigo, descripcion) VALUES
  (8,  'PADRE',    'Padre'),
  (19, 'MADRE',    'Madre'),
  (31, 'APODERADO','Apoderado / Tutor Legal')
ON CONFLICT (id) DO NOTHING;

-- 4. Estados de Persona (estado de matrícula)
--    27=Matrícula Definitiva, 29=Provisoria, 30=Retiro
CREATE TABLE IF NOT EXISTS public.ede_ref_person_status (
  id            INT PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  descripcion   TEXT NOT NULL
);

INSERT INTO public.ede_ref_person_status (id, codigo, descripcion) VALUES
  (27, 'DEFINITIVA', 'Matrícula Definitiva'),
  (29, 'PROVISORIA', 'Matrícula Provisoria'),
  (30, 'RETIRO',     'Retiro del Establecimiento')
ON CONFLICT (id) DO NOTHING;

-- 5. Tipos de Evento de Asistencia
CREATE TABLE IF NOT EXISTS public.ede_ref_attendance_event_type (
  id          INT PRIMARY KEY,
  codigo      TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL
);

INSERT INTO public.ede_ref_attendance_event_type (id, codigo, descripcion) VALUES
  (1, 'PRESENTE',          'Presente'),
  (2, 'AUSENTE',           'Ausente sin justificación'),
  (3, 'AUSENTE_JUSTIF',    'Ausente con justificación'),
  (4, 'ATRASO',            'Atraso'),
  (5, 'RETIRO_ANTICIPADO', 'Retiro Anticipado')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TABLAS PRINCIPALES
-- =============================================================================

-- 6. Persona (Alumnos y Apoderados)
--    Equivalente CEDS: K12Student / Person
CREATE TABLE IF NOT EXISTS public.ede_person (
  person_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rbd                INTEGER NOT NULL REFERENCES public.establecimientos(rbd) ON DELETE CASCADE,
  primer_nombre      TEXT NOT NULL,
  segundo_nombre     TEXT,
  apellido_paterno   TEXT NOT NULL,
  apellido_materno   TEXT,
  fecha_nacimiento   DATE,
  sexo_id            INT,  -- 1=Masculino, 2=Femenino, 3=No Binario
  nacionalidad       TEXT DEFAULT 'CL',  -- ISO 3166-1 alpha-2
  es_alumno          BOOLEAN NOT NULL DEFAULT TRUE,
  es_apoderado       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Identificadores de Persona (RUN, IPE, N° Matrícula)
CREATE TABLE IF NOT EXISTS public.ede_person_identifier (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id         UUID NOT NULL REFERENCES public.ede_person(person_id) ON DELETE CASCADE,
  identificador     TEXT NOT NULL,
  system_id         INT NOT NULL REFERENCES public.ede_ref_persona_id_system(id),
  es_primario       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identificador, system_id)
);

CREATE INDEX IF NOT EXISTS idx_ede_person_identifier_person ON public.ede_person_identifier(person_id);
CREATE INDEX IF NOT EXISTS idx_ede_person_identifier_system ON public.ede_person_identifier(system_id);

-- 8. Relaciones Persona (Apoderado-Alumno)
CREATE TABLE IF NOT EXISTS public.ede_person_relationship (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id          UUID NOT NULL REFERENCES public.ede_person(person_id) ON DELETE CASCADE,
  apoderado_id       UUID NOT NULL REFERENCES public.ede_person(person_id) ON DELETE CASCADE,
  relationship_id    INT NOT NULL REFERENCES public.ede_ref_person_relationship(id),
  es_apoderado_ppal  BOOLEAN NOT NULL DEFAULT FALSE,
  telefono_contacto  TEXT,
  email_contacto     TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, apoderado_id)
);

-- 9. Secciones de Curso (Curso + Asignatura + Docente)
--    Equivalente CEDS: CourseSection
CREATE TABLE IF NOT EXISTS public.ede_course_section (
  section_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rbd                INTEGER NOT NULL REFERENCES public.establecimientos(rbd) ON DELETE CASCADE,
  nombre_curso       TEXT NOT NULL,  -- e.g. '3° Básico A'
  nivel              TEXT NOT NULL,  -- e.g. '3° Básico'
  letra              TEXT,           -- 'A', 'B', 'C'
  anio_escolar       INT NOT NULL,   -- e.g. 2026
  jornada            TEXT,           -- 'JEC', 'No JEC'
  modalidad          TEXT,           -- 'Científico-Humanista', 'Técnico-Profesional'
  docente_jefe_run   TEXT,           -- RUN del docente jefe (sin FK para compatibilidad)
  capacidad_maxima   INT DEFAULT 45,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rbd, nombre_curso, anio_escolar)
);

CREATE INDEX IF NOT EXISTS idx_ede_section_rbd ON public.ede_course_section(rbd);
CREATE INDEX IF NOT EXISTS idx_ede_section_anio ON public.ede_course_section(anio_escolar);

-- 10. Matrícula (Enrollment)
--     Equivalente CEDS: K12Enrollment
CREATE TABLE IF NOT EXISTS public.ede_enrollment (
  enrollment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id           UUID NOT NULL REFERENCES public.ede_person(person_id) ON DELETE CASCADE,
  section_id          UUID NOT NULL REFERENCES public.ede_course_section(section_id) ON DELETE CASCADE,
  rbd                 INTEGER NOT NULL REFERENCES public.establecimientos(rbd) ON DELETE CASCADE,
  anio_escolar        INT NOT NULL,
  estado_id           INT NOT NULL REFERENCES public.ede_ref_person_status(id) DEFAULT 27,
  fecha_matricula     DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_retiro        DATE,
  motivo_retiro       TEXT,  -- 'Traslado', 'Repitencia', 'Deserción', 'Egreso', 'Otro'
  numero_matricula    TEXT,  -- N° correlativo asignado
  es_pie              BOOLEAN NOT NULL DEFAULT FALSE,
  es_sep              BOOLEAN NOT NULL DEFAULT FALSE,  -- Alumnos prioritarios SEP
  es_prioritario      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, section_id, anio_escolar)
);

CREATE INDEX IF NOT EXISTS idx_ede_enrollment_alumno ON public.ede_enrollment(alumno_id);
CREATE INDEX IF NOT EXISTS idx_ede_enrollment_section ON public.ede_enrollment(section_id);
CREATE INDEX IF NOT EXISTS idx_ede_enrollment_rbd ON public.ede_enrollment(rbd);
CREATE INDEX IF NOT EXISTS idx_ede_enrollment_estado ON public.ede_enrollment(estado_id);

-- 11. Eventos de Asistencia
--     Equivalente CEDS: DailyAttendance / ClassSectionAttendance
CREATE TABLE IF NOT EXISTS public.ede_attendance_event (
  event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id       UUID NOT NULL REFERENCES public.ede_enrollment(enrollment_id) ON DELETE CASCADE,
  alumno_id           UUID NOT NULL REFERENCES public.ede_person(person_id) ON DELETE CASCADE,
  section_id          UUID NOT NULL REFERENCES public.ede_course_section(section_id) ON DELETE CASCADE,
  rbd                 INTEGER NOT NULL,
  fecha               DATE NOT NULL,
  event_type_id       INT NOT NULL REFERENCES public.ede_ref_attendance_event_type(id) DEFAULT 1,
  minutos_asistidos   INT,  -- Para cálculo porcentual preciso
  observacion         TEXT,
  registrado_por_run  TEXT,           -- RUN del docente que registra (sin FK para compatibilidad)
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_ede_attendance_fecha ON public.ede_attendance_event(fecha);
CREATE INDEX IF NOT EXISTS idx_ede_attendance_section ON public.ede_attendance_event(section_id);
CREATE INDEX IF NOT EXISTS idx_ede_attendance_rbd ON public.ede_attendance_event(rbd);

-- 12. Resultados de Evaluación (Notas)
--     Equivalente CEDS: AssessmentResult / K12StudentCourseSection
CREATE TABLE IF NOT EXISTS public.ede_assessment_result (
  result_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id       UUID NOT NULL REFERENCES public.ede_enrollment(enrollment_id) ON DELETE CASCADE,
  alumno_id           UUID NOT NULL REFERENCES public.ede_person(person_id) ON DELETE CASCADE,
  section_id          UUID NOT NULL REFERENCES public.ede_course_section(section_id) ON DELETE CASCADE,
  asignatura          TEXT NOT NULL,
  periodo             TEXT NOT NULL,  -- 'Semestre 1', 'Semestre 2', 'Anual'
  tipo_evaluacion     TEXT NOT NULL,  -- 'Formativa', 'Sumativa', 'Parcial', 'Final'
  descripcion         TEXT,
  nota_numerica       NUMERIC(4,1),   -- Escala 1.0 a 7.0
  nota_conceptual     TEXT,           -- 'MB', 'B', 'S', 'I'
  fecha_evaluacion    DATE NOT NULL DEFAULT CURRENT_DATE,
  anio_escolar        INT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ede_assessment_alumno ON public.ede_assessment_result(alumno_id);
CREATE INDEX IF NOT EXISTS idx_ede_assessment_section ON public.ede_assessment_result(section_id);

-- =============================================================================
-- TRIGGER: updated_at automático
-- =============================================================================
CREATE OR REPLACE FUNCTION public.ede_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ede_person_updated_at ON public.ede_person;
CREATE TRIGGER trg_ede_person_updated_at
  BEFORE UPDATE ON public.ede_person
  FOR EACH ROW EXECUTE FUNCTION public.ede_set_updated_at();

DROP TRIGGER IF EXISTS trg_ede_enrollment_updated_at ON public.ede_enrollment;
CREATE TRIGGER trg_ede_enrollment_updated_at
  BEFORE UPDATE ON public.ede_enrollment
  FOR EACH ROW EXECUTE FUNCTION public.ede_set_updated_at();
