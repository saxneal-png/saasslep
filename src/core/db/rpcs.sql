-- =============================================================================
-- FUNCIONES RPC DE ALTA VELOCIDAD PARA POSTGRESQL / SUPABASE - SAAS SLEP
-- =============================================================================

-- 1. RPC Macro para el Dashboard del Sostenedor SLEP
CREATE OR REPLACE FUNCTION public.obtener_metricas_macro_sostenedor()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalDocentes', COALESCE(total_docentes, 0),
    'totalEscuelas', COALESCE(total_escuelas, 0),
    'totalHorasContratadas', COALESCE(total_horas_contratadas, 0),
    'totalHorasLectivasAsignadas', COALESCE(total_horas_lectivas_asignadas, 0),
    'totalHorasPie', COALESCE(total_horas_pie, 0),
    'docentesSemaforoRojoCount', COALESCE(docentes_sobreasignados_count, 0),
    'porcentajeCumplimientoNormativo', CASE 
      WHEN total_docentes > 0 THEN ROUND(((total_docentes - docentes_sobreasignados_count)::NUMERIC / total_docentes::NUMERIC) * 100, 1)
      ELSE 100.0
    END
  )
  INTO v_result
  FROM public.vw_resumen_sostenedor_macro;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;

-- 2. RPC Auditoría UATP por RBD
CREATE OR REPLACE FUNCTION public.obtener_auditoria_rbd(p_rbd TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'rbd', p_rbd,
    'nombreEstablecimiento', e.nombre,
    'cantidadDocentes', COUNT(DISTINCT c.funcionario_rut),
    'horasContratadasTotales', COALESCE(SUM(c.horas_contrato), 0),
    'horasLectivasAsignadas', COALESCE(SUM(c.horas_lectivas_asignadas), 0),
    'docentesRiesgoCount', COUNT(CASE WHEN (c.horas_lectivas_asignadas * 45) > (c.horas_contrato * 45 * 0.65) THEN 1 END),
    'estadoSemaforo', CASE 
      WHEN COUNT(CASE WHEN (c.horas_lectivas_asignadas * 45) > (c.horas_contrato * 45 * 0.65) THEN 1 END) > 0 THEN 'ROJO'
      ELSE 'VERDE'
    END
  )
  INTO v_result
  FROM public.establecimientos e
  LEFT JOIN public.contratos c ON c.rbd = e.rbd
  WHERE e.rbd = p_rbd
  GROUP BY e.rbd, e.nombre;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;
