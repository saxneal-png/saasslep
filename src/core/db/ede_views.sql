-- =============================================================================
-- VISTAS EDE NORMATIVAS - Circular N°1 MINEDUC (Libro de Clases Digital)
-- Compatible con exportación al sistema EDE del MINEDUC
-- =============================================================================

-- =============================================================================
-- VISTA 1: Registro de Matrícula (Nómina Oficial)
-- Equivalente a: Formulario A1 / Nómina de Matrícula
-- =============================================================================
CREATE OR REPLACE VIEW public.vw_ede_matricula AS
SELECT
  -- Identificación del establecimiento
  cs.rbd,
  est.nombre                              AS nombre_establecimiento,
  cs.anio_escolar,
  cs.nombre_curso,
  cs.nivel,
  cs.letra,
  cs.jornada,

  -- Identificación del alumno
  p.person_id                             AS alumno_id,
  COALESCE(run.identificador, ipe.identificador)
                                          AS rut_ipe_estudiante,
  CASE
    WHEN run.identificador IS NOT NULL THEN 'RUN'
    WHEN ipe.identificador IS NOT NULL THEN 'IPE'
    ELSE 'SIN_ID'
  END                                     AS tipo_identificador,
  num_mat.identificador                   AS numero_correlativo_matricula,
  p.primer_nombre,
  p.segundo_nombre,
  p.apellido_paterno,
  p.apellido_materno,
  p.fecha_nacimiento,
  EXTRACT(YEAR FROM AGE(p.fecha_nacimiento))::INT
                                          AS edad,
  CASE p.sexo_id
    WHEN 1 THEN 'M'
    WHEN 2 THEN 'F'
    ELSE 'NB'
  END                                     AS sexo,
  p.nacionalidad,

  -- Estado de matrícula
  e.enrollment_id,
  e.estado_id,
  rs.codigo                               AS estado_matricula,
  rs.descripcion                          AS descripcion_estado,
  e.fecha_matricula,
  e.fecha_retiro,
  e.motivo_retiro,
  e.es_pie,
  e.es_sep,
  e.es_prioritario,

  -- Docente jefe
  f.nombre                                AS docente_jefe,
  cs.docente_jefe_run

FROM public.ede_enrollment e
JOIN public.ede_person p             ON p.person_id   = e.alumno_id
JOIN public.ede_course_section cs    ON cs.section_id = e.section_id
JOIN public.establecimientos est     ON est.rbd        = cs.rbd
JOIN public.ede_ref_person_status rs ON rs.id          = e.estado_id
LEFT JOIN public.ede_person_identifier run
  ON run.person_id = p.person_id AND run.system_id = 51  -- RUN
LEFT JOIN public.ede_person_identifier ipe
  ON ipe.person_id = p.person_id AND ipe.system_id = 52  -- IPE
LEFT JOIN public.ede_person_identifier num_mat
  ON num_mat.person_id = p.person_id AND num_mat.system_id = 55  -- N° Matrícula
LEFT JOIN public.funcionarios f
  ON f.run = cs.docente_jefe_run;


-- =============================================================================
-- VISTA 2: Asistencia Diaria (Libro de Clases)
-- Equivalente a: Registro de Asistencia del Libro de Clases Digital
-- =============================================================================
CREATE OR REPLACE VIEW public.vw_ede_asistencia_diaria AS
SELECT
  ae.rbd,
  cs.nombre_curso,
  cs.nivel,
  cs.anio_escolar,
  ae.fecha,
  p.person_id                             AS alumno_id,
  COALESCE(run.identificador, ipe.identificador)
                                          AS rut_ipe_estudiante,
  p.primer_nombre || ' ' || p.apellido_paterno
                                          AS nombre_completo,
  ae.event_type_id,
  evt.codigo                              AS tipo_asistencia,
  evt.descripcion                         AS descripcion_asistencia,
  ae.minutos_asistidos,
  ae.observacion,
  ae.registrado_por_run

FROM public.ede_attendance_event ae
JOIN public.ede_enrollment e         ON e.enrollment_id  = ae.enrollment_id
JOIN public.ede_person p             ON p.person_id      = ae.alumno_id
JOIN public.ede_course_section cs    ON cs.section_id    = ae.section_id
JOIN public.ede_ref_attendance_event_type evt ON evt.id  = ae.event_type_id
LEFT JOIN public.ede_person_identifier run
  ON run.person_id = p.person_id AND run.system_id = 51
LEFT JOIN public.ede_person_identifier ipe
  ON ipe.person_id = p.person_id AND ipe.system_id = 52;


-- =============================================================================
-- VISTA 3: Nómina de Alumnos por Curso (para cabecera Libro de Clases)
-- =============================================================================
CREATE OR REPLACE VIEW public.vw_ede_nomina_alumnos AS
SELECT
  cs.rbd,
  cs.nombre_curso,
  cs.nivel,
  cs.letra,
  cs.anio_escolar,
  ROW_NUMBER() OVER (
    PARTITION BY e.section_id
    ORDER BY p.apellido_paterno, p.primer_nombre
  )::INT                                  AS numero_lista,
  p.person_id                             AS alumno_id,
  COALESCE(run.identificador, ipe.identificador)
                                          AS rut_ipe_estudiante,
  p.primer_nombre,
  p.segundo_nombre,
  p.apellido_paterno,
  p.apellido_materno,
  p.fecha_nacimiento,
  CASE p.sexo_id WHEN 1 THEN 'M' WHEN 2 THEN 'F' ELSE 'NB' END
                                          AS sexo,
  rs.codigo                               AS estado_matricula,
  e.es_pie,
  e.es_sep

FROM public.ede_enrollment e
JOIN public.ede_person p             ON p.person_id   = e.alumno_id
JOIN public.ede_course_section cs    ON cs.section_id = e.section_id
JOIN public.ede_ref_person_status rs ON rs.id         = e.estado_id
LEFT JOIN public.ede_person_identifier run
  ON run.person_id = p.person_id AND run.system_id = 51
LEFT JOIN public.ede_person_identifier ipe
  ON ipe.person_id = p.person_id AND ipe.system_id = 52
WHERE e.estado_id != 30;  -- Excluir retirados


-- =============================================================================
-- VISTA 4: Resumen de Asistencia por Alumno (para Alerta Temprana MAT)
-- Umbral MINEDUC: < 85% de asistencia = Alerta Temprana
-- =============================================================================
CREATE OR REPLACE VIEW public.vw_ede_alerta_temprana AS
WITH estadisticas AS (
  SELECT
    ae.alumno_id,
    ae.section_id,
    ae.rbd,
    EXTRACT(YEAR FROM ae.fecha)::INT          AS anio,
    COUNT(*)                                   AS total_sesiones,
    COUNT(*) FILTER (WHERE ae.event_type_id = 1) AS sesiones_presente,
    COUNT(*) FILTER (WHERE ae.event_type_id = 2) AS ausencias_sin_justif,
    COUNT(*) FILTER (WHERE ae.event_type_id = 3) AS ausencias_justif,
    ROUND(
      COUNT(*) FILTER (WHERE ae.event_type_id = 1)::NUMERIC /
      NULLIF(COUNT(*), 0) * 100,
      1
    )                                          AS porcentaje_asistencia
  FROM public.ede_attendance_event ae
  GROUP BY ae.alumno_id, ae.section_id, ae.rbd, EXTRACT(YEAR FROM ae.fecha)
)
SELECT
  est.rbd,
  est.nombre                              AS nombre_establecimiento,
  cs.nombre_curso,
  cs.nivel,
  p.person_id                             AS alumno_id,
  COALESCE(run.identificador, ipe.identificador)
                                          AS rut_ipe_estudiante,
  p.primer_nombre || ' ' || p.apellido_paterno || ' ' || p.apellido_materno
                                          AS nombre_completo,
  e2.total_sesiones,
  e2.sesiones_presente,
  e2.ausencias_sin_justif,
  e2.ausencias_justif,
  e2.porcentaje_asistencia,
  CASE
    WHEN e2.porcentaje_asistencia IS NULL THEN 'SIN_DATOS'
    WHEN e2.porcentaje_asistencia < 85   THEN 'CRITICO'
    WHEN e2.porcentaje_asistencia < 90   THEN 'ADVERTENCIA'
    ELSE                                      'NORMAL'
  END                                     AS nivel_alerta,
  e2.anio

FROM estadisticas e2
JOIN public.ede_person p             ON p.person_id   = e2.alumno_id
JOIN public.ede_course_section cs    ON cs.section_id = e2.section_id
JOIN public.establecimientos est     ON est.rbd        = e2.rbd
LEFT JOIN public.ede_person_identifier run
  ON run.person_id = p.person_id AND run.system_id = 51
LEFT JOIN public.ede_person_identifier ipe
  ON ipe.person_id = p.person_id AND ipe.system_id = 52;


-- =============================================================================
-- VISTA 5: Resumen por Curso (para Dashboard de Sostenedor)
-- =============================================================================
CREATE OR REPLACE VIEW public.vw_ede_resumen_curso AS
SELECT
  cs.rbd,
  est.nombre                                        AS nombre_establecimiento,
  cs.nombre_curso,
  cs.nivel,
  cs.letra,
  cs.anio_escolar,
  cs.docente_jefe_run,
  f.nombre                                          AS docente_jefe,
  COUNT(e.enrollment_id)                            AS total_matriculados,
  COUNT(e.enrollment_id) FILTER (WHERE e.estado_id = 27)  AS matriculados_definitivos,
  COUNT(e.enrollment_id) FILTER (WHERE e.estado_id = 29)  AS matriculados_provisorios,
  COUNT(e.enrollment_id) FILTER (WHERE e.estado_id = 30)  AS retirados,
  COUNT(e.enrollment_id) FILTER (WHERE e.es_pie)           AS alumnos_pie,
  COUNT(e.enrollment_id) FILTER (WHERE e.es_sep)           AS alumnos_sep,
  COUNT(e.enrollment_id) FILTER (WHERE e.es_prioritario)   AS alumnos_prioritarios

FROM public.ede_course_section cs
JOIN public.establecimientos est   ON est.rbd = cs.rbd
LEFT JOIN public.ede_enrollment e  ON e.section_id = cs.section_id
LEFT JOIN public.funcionarios f    ON f.run = cs.docente_jefe_run
GROUP BY
  cs.rbd, est.nombre, cs.section_id, cs.nombre_curso,
  cs.nivel, cs.letra, cs.anio_escolar, cs.docente_jefe_run,
  f.nombre;
