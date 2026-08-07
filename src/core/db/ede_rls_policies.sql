-- =============================================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY) - TABLAS EDE/CEDS
-- Compatible con el sistema de auth existente (JWT claims: user_role, user_rbd)
-- Roles: 'sostenedor_maestro' | 'profesional_slep' | 'director_escuela'
-- =============================================================================

-- Habilitar RLS en todas las tablas EDE
ALTER TABLE public.ede_person               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ede_person_identifier    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ede_person_relationship  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ede_course_section       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ede_enrollment           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ede_attendance_event     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ede_assessment_result    ENABLE ROW LEVEL SECURITY;

-- Las tablas de catálogo son de solo lectura sin restricción
-- (No requieren RLS ya que son datos de referencia públicos del estándar)

-- =============================================================================
-- ede_person
-- =============================================================================
DROP POLICY IF EXISTS "ede_person_sostenedor_all" ON public.ede_person;
CREATE POLICY "ede_person_sostenedor_all" ON public.ede_person
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_role') IN ('sostenedor_maestro', 'profesional_slep') OR
    (auth.jwt() ->> 'role') = 'service_role'
  );

DROP POLICY IF EXISTS "ede_person_director_rbd" ON public.ede_person;
CREATE POLICY "ede_person_director_rbd" ON public.ede_person
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_role') = 'director_escuela' AND
    rbd = NULLIF(auth.jwt() ->> 'user_rbd', '')::INTEGER
  );

-- =============================================================================
-- ede_person_identifier
-- =============================================================================
DROP POLICY IF EXISTS "ede_identifier_sostenedor_all" ON public.ede_person_identifier;
CREATE POLICY "ede_identifier_sostenedor_all" ON public.ede_person_identifier
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ede_person p
      WHERE p.person_id = ede_person_identifier.person_id
        AND (
          (auth.jwt() ->> 'user_role') IN ('sostenedor_maestro', 'profesional_slep') OR
          (auth.jwt() ->> 'role') = 'service_role' OR
          (
            (auth.jwt() ->> 'user_role') = 'director_escuela' AND
            p.rbd = NULLIF(auth.jwt() ->> 'user_rbd', '')::INTEGER
          )
        )
    )
  );

-- =============================================================================
-- ede_person_relationship
-- =============================================================================
DROP POLICY IF EXISTS "ede_relationship_sostenedor_all" ON public.ede_person_relationship;
CREATE POLICY "ede_relationship_sostenedor_all" ON public.ede_person_relationship
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ede_person p
      WHERE p.person_id = ede_person_relationship.alumno_id
        AND (
          (auth.jwt() ->> 'user_role') IN ('sostenedor_maestro', 'profesional_slep') OR
          (auth.jwt() ->> 'role') = 'service_role' OR
          (
            (auth.jwt() ->> 'user_role') = 'director_escuela' AND
            p.rbd = NULLIF(auth.jwt() ->> 'user_rbd', '')::INTEGER
          )
        )
    )
  );

-- =============================================================================
-- ede_course_section
-- =============================================================================
DROP POLICY IF EXISTS "ede_section_sostenedor_all" ON public.ede_course_section;
CREATE POLICY "ede_section_sostenedor_all" ON public.ede_course_section
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_role') IN ('sostenedor_maestro', 'profesional_slep') OR
    (auth.jwt() ->> 'role') = 'service_role'
  );

DROP POLICY IF EXISTS "ede_section_director_rbd" ON public.ede_course_section;
CREATE POLICY "ede_section_director_rbd" ON public.ede_course_section
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_role') = 'director_escuela' AND
    rbd = NULLIF(auth.jwt() ->> 'user_rbd', '')::INTEGER
  );

-- =============================================================================
-- ede_enrollment
-- =============================================================================
DROP POLICY IF EXISTS "ede_enrollment_sostenedor_all" ON public.ede_enrollment;
CREATE POLICY "ede_enrollment_sostenedor_all" ON public.ede_enrollment
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_role') IN ('sostenedor_maestro', 'profesional_slep') OR
    (auth.jwt() ->> 'role') = 'service_role'
  );

DROP POLICY IF EXISTS "ede_enrollment_director_rbd" ON public.ede_enrollment;
CREATE POLICY "ede_enrollment_director_rbd" ON public.ede_enrollment
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_role') = 'director_escuela' AND
    rbd = NULLIF(auth.jwt() ->> 'user_rbd', '')::INTEGER
  );

-- =============================================================================
-- ede_attendance_event
-- =============================================================================
DROP POLICY IF EXISTS "ede_attendance_sostenedor_all" ON public.ede_attendance_event;
CREATE POLICY "ede_attendance_sostenedor_all" ON public.ede_attendance_event
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_role') IN ('sostenedor_maestro', 'profesional_slep') OR
    (auth.jwt() ->> 'role') = 'service_role'
  );

DROP POLICY IF EXISTS "ede_attendance_director_rbd" ON public.ede_attendance_event;
CREATE POLICY "ede_attendance_director_rbd" ON public.ede_attendance_event
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_role') = 'director_escuela' AND
    rbd = NULLIF(auth.jwt() ->> 'user_rbd', '')::INTEGER
  );

DROP POLICY IF EXISTS "ede_attendance_docente_section" ON public.ede_attendance_event;
CREATE POLICY "ede_attendance_docente_section" ON public.ede_attendance_event
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'user_role') = 'profesional_slep' AND
    EXISTS (
      SELECT 1 FROM public.ede_course_section cs
      WHERE cs.section_id = ede_attendance_event.section_id
        AND cs.docente_jefe_run = (auth.jwt() ->> 'user_rut')
    )
  );

-- =============================================================================
-- ede_assessment_result
-- =============================================================================
DROP POLICY IF EXISTS "ede_assessment_sostenedor_all" ON public.ede_assessment_result;
CREATE POLICY "ede_assessment_sostenedor_all" ON public.ede_assessment_result
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_role') IN ('sostenedor_maestro', 'profesional_slep') OR
    (auth.jwt() ->> 'role') = 'service_role'
  );

DROP POLICY IF EXISTS "ede_assessment_director_rbd" ON public.ede_assessment_result;
CREATE POLICY "ede_assessment_director_rbd" ON public.ede_assessment_result
  FOR SELECT
  USING (
    (auth.jwt() ->> 'user_role') = 'director_escuela' AND
    EXISTS (
      SELECT 1 FROM public.ede_course_section cs
      WHERE cs.section_id = ede_assessment_result.section_id
        AND cs.rbd = NULLIF(auth.jwt() ->> 'user_rbd', '')::INTEGER
    )
  );
