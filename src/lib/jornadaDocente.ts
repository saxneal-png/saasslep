/**
 * Resultado del cálculo de jornada docente según tablas oficiales MINEDUC.
 */
export interface JornadaDocenteResult {
  /** Horas totales del contrato (cronológicas) */
  contrato: number;
  /** Aula disponible máxima en horas pedagógicas */
  aulaDisponiblePed: number;
  /** Aula asignada en horas pedagógicas */
  aulaAsignadaPed: number;
  /** Horas lectivas usadas en cronológicas */
  horasLectivasHC: number;
  /** Horas de recreo asignadas en cronológicas */
  recreoHC: number;
  /** Horas no lectivas (planificación) asignadas en cronológicas */
  hnlHC: number;
  /** Total de horas usadas (cronológicas) */
  horasUsadasHC: number;
  /** Horas vacantes del contrato (cronológicas) */
  horasVacantesHC: number;
}

/**
 * Cálculo preciso de la jornada docente siguiendo la normativa MINEDUC.
 *
 * @param contrato Horas cronológicas semanales del contrato.
 * @param proporcion '65/35' o '60/40' según la tabla aplicable.
 * @param aulaAsignadaPed Horas pedagógicas reales asignadas (por defecto = aulaDisponiblePed).
 * @returns JornadaDocenteResult con todos los valores calculados y cuadra exactamente el contrato.
 */
export function calcularJornadaDocente(
  contrato: number,
  proporcion: '65/35' | '60/40',
  aulaAsignadaPed: number
): JornadaDocenteResult {
  // 1. Ratio lectivo según la proporción solicitada
  const ratioLectivo = proporcion === '65/35' ? 0.65 : 0.60;

  // 2. Aula disponible máxima (pedagógica) – redondeo estándar
  const aulaDisponiblePed = Math.round((contrato * ratioLectivo) / 0.75);

  // 3. Recreo máximo (minutos) y conversión a horas cronológicas
  const recreoMaxMinutos = Math.round(contrato * (180 / 44));
  const recreoMaxHC = recreoMaxMinutos / 60;

  // 4. HNL máximo por residuo estricto (horas cronológicas)
  const hnlMaxHC = contrato - aulaDisponiblePed * 0.75 - recreoMaxHC;

  // 5. Factor de asignación real (si el aula asignada es menor al tope)
  const factorAsignacion = aulaDisponiblePed > 0 ? aulaAsignadaPed / aulaDisponiblePed : 0;

  // 6. Cálculos proporcionales finales
  const horasLectivasHC = Number((aulaAsignadaPed * 0.75).toFixed(4));
  const recreoHC = Number((recreoMaxHC * factorAsignacion).toFixed(4));
  const hnlHC = Number((hnlMaxHC * factorAsignacion).toFixed(4));

  // 7. Sumatorias y control de cuadratura
  const horasUsadasHC = Number((horasLectivasHC + recreoHC + hnlHC).toFixed(2));
  const horasVacantesHC = Number((contrato - horasUsadasHC).toFixed(2));

  return {
    contrato,
    aulaDisponiblePed,
    aulaAsignadaPed,
    horasLectivasHC,
    recreoHC,
    hnlHC,
    horasUsadasHC,
    horasVacantesHC,
  };
}
