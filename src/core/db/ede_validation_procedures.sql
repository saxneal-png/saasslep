-- =============================================================================
-- PROCEDIMIENTOS DE DIAGNÓSTICO Y VALIDACIÓN EDE (MINEDUC)
-- Funciones almacenadas para pre-auditoría del Libro de Clases Digital
-- =============================================================================

/**
 * 1. Buscar eventos de asistencia registrados con fecha posterior al retiro del alumno
 * Regla de negocio: FV-ASI-004
 */
CREATE OR REPLACE FUNCTION public.check_attendance_after_withdrawal(p_rbd INTEGER)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  attendance_date DATE,
  exit_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.person_id AS student_id,
    (p.primer_nombre || ' ' || p.apellido_paterno)::TEXT AS student_name,
    ae.fecha AS attendance_date,
    e.fecha_retiro AS exit_date
  FROM public.ede_attendance_event ae
  JOIN public.ede_enrollment e ON e.enrollment_id = ae.enrollment_id
  JOIN public.ede_person p ON p.person_id = ae.alumno_id
  WHERE e.rbd = p_rbd
    AND e.fecha_retiro IS NOT NULL
    AND ae.fecha > e.fecha_retiro;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


/**
 * 2. Buscar alumnos matriculados activamente en más de un curso en el mismo año
 * Regla de negocio: FV-MAT-002
 */
CREATE OR REPLACE FUNCTION public.check_duplicate_active_enrollments(p_rbd INTEGER, p_anio INT)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  sections_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.alumno_id AS student_id,
    (p.primer_nombre || ' ' || p.apellido_paterno)::TEXT AS student_name,
    COUNT(e.section_id) AS sections_count
  FROM public.ede_enrollment e
  JOIN public.ede_person p ON p.person_id = e.alumno_id
  WHERE e.rbd = p_rbd
    AND e.anio_escolar = p_anio
    AND e.estado_id IN (27, 29) -- Matrícula Definitiva (27) o Provisoria (29)
  GROUP BY e.alumno_id, p.primer_nombre, p.apellido_paterno
  HAVING COUNT(e.section_id) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
