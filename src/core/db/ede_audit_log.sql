-- =============================================================================
-- ESQUEMA DE AUDITORÍA EDE — Circular N° 1 MINEDUC (Libro de Clases Digital)
-- Registro inmutable para cambios en asistencia y calificaciones
-- =============================================================================

-- 1. Tabla de Logs de Auditoría
CREATE TABLE IF NOT EXISTS public.ede_audit_log (
  log_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      TEXT NOT NULL,                  -- 'ede_attendance_event' o 'ede_assessment_result'
  action          TEXT NOT NULL,                  -- 'INSERT', 'UPDATE', 'DELETE'
  record_id       UUID NOT NULL,                  -- ID del registro afectado
  old_data        JSONB,                          -- Estado previo del registro
  new_data        JSONB,                          -- Estado nuevo del registro
  changed_by      TEXT,                           -- RUT o correo electrónico del usuario
  changed_at      TIMESTAMPTZ DEFAULT NOW(),      -- Fecha y hora del cambio
  justificacion   TEXT                            -- Motivo o justificación del cambio
);

-- Habilitar RLS en la tabla de auditoría (Solo lectura para sostenedores/admin)
ALTER TABLE public.ede_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ede_audit_sostenedor_select" ON public.ede_audit_log;
CREATE POLICY "ede_audit_sostenedor_select" ON public.ede_audit_log
  FOR SELECT
  USING (
    (auth.jwt() ->> 'user_role') IN ('sostenedor_maestro', 'profesional_slep') OR
    (auth.jwt() ->> 'role') = 'service_role'
  );

-- =============================================================================
-- 2. Trigger para Auditoría de Asistencia (ede_attendance_event)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.ede_audit_attendance_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user TEXT;
  v_justificacion TEXT;
BEGIN
  -- Obtener el RUN/email del usuario desde el JWT de Supabase
  v_user := COALESCE(
    auth.jwt() ->> 'user_rut',
    auth.jwt() ->> 'email',
    current_user
  );

  IF TG_OP = 'UPDATE' THEN
    v_justificacion := NEW.observacion;
    
    -- Solo guardar en log si hay cambios sustanciales en el estado de la asistencia
    IF OLD.event_type_id IS DISTINCT FROM NEW.event_type_id OR OLD.minutos_asistidos IS DISTINCT FROM NEW.minutos_asistidos THEN
      INSERT INTO public.ede_audit_log (
        table_name, action, record_id, old_data, new_data, changed_by, justificacion
      ) VALUES (
        'ede_attendance_event', 'UPDATE', OLD.event_id,
        row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb,
        v_user, COALESCE(v_justificacion, 'Modificación de registro de asistencia')
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.ede_audit_log (
      table_name, action, record_id, old_data, new_data, changed_by, justificacion
    ) VALUES (
      'ede_attendance_event', 'DELETE', OLD.event_id,
      row_to_json(OLD)::jsonb, NULL,
      v_user, 'Registro de asistencia eliminado'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjuntar trigger a la tabla de asistencia
DROP TRIGGER IF EXISTS trg_ede_audit_attendance ON public.ede_attendance_event;
CREATE TRIGGER trg_ede_audit_attendance
  AFTER UPDATE OR DELETE ON public.ede_attendance_event
  FOR EACH ROW EXECUTE FUNCTION public.ede_audit_attendance_trigger();


-- =============================================================================
-- 3. Trigger para Auditoría de Calificaciones (ede_assessment_result)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.ede_audit_assessment_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user TEXT;
  v_justificacion TEXT;
  v_rec_id UUID;
BEGIN
  v_user := COALESCE(
    auth.jwt() ->> 'user_rut',
    auth.jwt() ->> 'email',
    current_user
  );

  IF TG_OP = 'UPDATE' THEN
    v_justificacion := NEW.descripcion;
    
    -- Solo guardar log si cambia la calificación (numérica o conceptual)
    IF OLD.nota_numerica IS DISTINCT FROM NEW.nota_numerica OR OLD.nota_conceptual IS DISTINCT FROM NEW.nota_conceptual THEN
      INSERT INTO public.ede_audit_log (
        table_name, action, record_id, old_data, new_data, changed_by, justificacion
      ) VALUES (
        'ede_assessment_result', 'UPDATE', OLD.result_id,
        row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb,
        v_user, COALESCE(v_justificacion, 'Modificación de calificación')
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.ede_audit_log (
      table_name, action, record_id, old_data, new_data, changed_by, justificacion
    ) VALUES (
      'ede_assessment_result', 'DELETE', OLD.result_id,
      row_to_json(OLD)::jsonb, NULL,
      v_user, 'Calificación eliminada'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjuntar trigger a la tabla de calificaciones
DROP TRIGGER IF EXISTS trg_ede_audit_assessment ON public.ede_assessment_result;
CREATE TRIGGER trg_ede_audit_assessment
  AFTER UPDATE OR DELETE ON public.ede_assessment_result
  FOR EACH ROW EXECUTE FUNCTION public.ede_audit_assessment_trigger();
