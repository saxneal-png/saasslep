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

export interface MineducTableEntry {
  jornada_semanal: number;
  horas_lectivas_HA: number;
  horas_lectivas_hc: string;
  recreo: string;
  horas_no_lectivas: string;
}

export const TABLA_HORAS_ESTRUCTURADA: {
  fuente: string;
  hora_aula_minutos: number;
  regimen_65_35: MineducTableEntry[];
  regimen_60_40: MineducTableEntry[];
} = {
  "fuente": "Tabla Comparativa de Horas No Lectivas Oficial MINEDUC",
  "hora_aula_minutos": 45,
  "regimen_65_35": [
    {"jornada_semanal": 44, "horas_lectivas_HA": 38, "horas_lectivas_hc": "28 h 30 m", "recreo": "3 h 0 m", "horas_no_lectivas": "12 h 30 m"},
    {"jornada_semanal": 43, "horas_lectivas_HA": 37, "horas_lectivas_hc": "27 h 45 m", "recreo": "2 h 56 m", "horas_no_lectivas": "12 h 19 m"},
    {"jornada_semanal": 42, "horas_lectivas_HA": 36, "horas_lectivas_hc": "27 h 0 m", "recreo": "2 h 52 m", "horas_no_lectivas": "12 h 8 m"},
    {"jornada_semanal": 41, "horas_lectivas_HA": 35, "horas_lectivas_hc": "26 h 15 m", "recreo": "2 h 48 m", "horas_no_lectivas": "11 h 57 m"},
    {"jornada_semanal": 40, "horas_lectivas_HA": 35, "horas_lectivas_hc": "26 h 15 m", "recreo": "2 h 44 m", "horas_no_lectivas": "11 h 1 m"},
    {"jornada_semanal": 39, "horas_lectivas_HA": 34, "horas_lectivas_hc": "25 h 30 m", "recreo": "2 h 40 m", "horas_no_lectivas": "10 h 50 m"},
    {"jornada_semanal": 38, "horas_lectivas_HA": 33, "horas_lectivas_hc": "24 h 45 m", "recreo": "2 h 35 m", "horas_no_lectivas": "10 h 40 m"},
    {"jornada_semanal": 37, "horas_lectivas_HA": 32, "horas_lectivas_hc": "24 h 0 m", "recreo": "2 h 31 m", "horas_no_lectivas": "10 h 29 m"},
    {"jornada_semanal": 36, "horas_lectivas_HA": 31, "horas_lectivas_hc": "23 h 15 m", "recreo": "2 h 27 m", "horas_no_lectivas": "10 h 18 m"},
    {"jornada_semanal": 35, "horas_lectivas_HA": 30, "horas_lectivas_hc": "22 h 30 m", "recreo": "2 h 23 m", "horas_no_lectivas": "10 h 7 m"},
    {"jornada_semanal": 34, "horas_lectivas_HA": 29, "horas_lectivas_hc": "21 h 45 m", "recreo": "2 h 19 m", "horas_no_lectivas": "9 h 56 m"},
    {"jornada_semanal": 33, "horas_lectivas_HA": 29, "horas_lectivas_hc": "21 h 45 m", "recreo": "2 h 15 m", "horas_no_lectivas": "9 h 0 m"},
    {"jornada_semanal": 32, "horas_lectivas_HA": 28, "horas_lectivas_hc": "21 h 0 m", "recreo": "2 h 11 m", "horas_no_lectivas": "8 h 49 m"},
    {"jornada_semanal": 31, "horas_lectivas_HA": 27, "horas_lectivas_hc": "20 h 15 m", "recreo": "2 h 7 m", "horas_no_lectivas": "8 h 38 m"},
    {"jornada_semanal": 30, "horas_lectivas_HA": 26, "horas_lectivas_hc": "19 h 30 m", "recreo": "2 h 3 m", "horas_no_lectivas": "8 h 27 m"},
    {"jornada_semanal": 29, "horas_lectivas_HA": 25, "horas_lectivas_hc": "18 h 45 m", "recreo": "1 h 59 m", "horas_no_lectivas": "8 h 16 m"},
    {"jornada_semanal": 28, "horas_lectivas_HA": 24, "horas_lectivas_hc": "18 h 0 m", "recreo": "1 h 55 m", "horas_no_lectivas": "8 h 5 m"},
    {"jornada_semanal": 27, "horas_lectivas_HA": 23, "horas_lectivas_hc": "17 h 15 m", "recreo": "1 h 50 m", "horas_no_lectivas": "7 h 55 m"},
    {"jornada_semanal": 26, "horas_lectivas_HA": 22, "horas_lectivas_hc": "16 h 30 m", "recreo": "1 h 46 m", "horas_no_lectivas": "7 h 44 m"},
    {"jornada_semanal": 25, "horas_lectivas_HA": 22, "horas_lectivas_hc": "16 h 30 m", "recreo": "1 h 42 m", "horas_no_lectivas": "6 h 48 m"},
    {"jornada_semanal": 24, "horas_lectivas_HA": 21, "horas_lectivas_hc": "15 h 45 m", "recreo": "1 h 38 m", "horas_no_lectivas": "6 h 37 m"},
    {"jornada_semanal": 23, "horas_lectivas_HA": 20, "horas_lectivas_hc": "15 h 0 m", "recreo": "1 h 34 m", "horas_no_lectivas": "6 h 26 m"},
    {"jornada_semanal": 22, "horas_lectivas_HA": 19, "horas_lectivas_hc": "14 h 15 m", "recreo": "1 h 30 m", "horas_no_lectivas": "6 h 15 m"},
    {"jornada_semanal": 21, "horas_lectivas_HA": 18, "horas_lectivas_hc": "13 h 30 m", "recreo": "1 h 26 m", "horas_no_lectivas": "6 h 4 m"},
    {"jornada_semanal": 20, "horas_lectivas_HA": 17, "horas_lectivas_hc": "12 h 45 m", "recreo": "1 h 22 m", "horas_no_lectivas": "5 h 53 m"},
    {"jornada_semanal": 19, "horas_lectivas_HA": 16, "horas_lectivas_hc": "12 h 0 m", "recreo": "1 h 18 m", "horas_no_lectivas": "5 h 42 m"},
    {"jornada_semanal": 18, "horas_lectivas_HA": 16, "horas_lectivas_hc": "12 h 0 m", "recreo": "1 h 14 m", "horas_no_lectivas": "4 h 46 m"},
    {"jornada_semanal": 17, "horas_lectivas_HA": 15, "horas_lectivas_hc": "11 h 15 m", "recreo": "1 h 10 m", "horas_no_lectivas": "4 h 35 m"},
    {"jornada_semanal": 16, "horas_lectivas_HA": 14, "horas_lectivas_hc": "10 h 30 m", "recreo": "1 h 5 m", "horas_no_lectivas": "4 h 25 m"},
    {"jornada_semanal": 15, "horas_lectivas_HA": 13, "horas_lectivas_hc": "9 h 45 m", "recreo": "1 h 1 m", "horas_no_lectivas": "4 h 14 m"},
    {"jornada_semanal": 14, "horas_lectivas_HA": 12, "horas_lectivas_hc": "9 h 0 m", "recreo": "0 h 57 m", "horas_no_lectivas": "4 h 3 m"},
    {"jornada_semanal": 13, "horas_lectivas_HA": 11, "horas_lectivas_hc": "8 h 15 m", "recreo": "0 h 53 m", "horas_no_lectivas": "3 h 52 m"},
    {"jornada_semanal": 12, "horas_lectivas_HA": 10, "horas_lectivas_hc": "7 h 30 m", "recreo": "0 h 49 m", "horas_no_lectivas": "3 h 41 m"},
    {"jornada_semanal": 11, "horas_lectivas_HA": 10, "horas_lectivas_hc": "7 h 30 m", "recreo": "0 h 45 m", "horas_no_lectivas": "2 h 45 m"},
    {"jornada_semanal": 10, "horas_lectivas_HA": 9, "horas_lectivas_hc": "6 h 45 m", "recreo": "0 h 41 m", "horas_no_lectivas": "2 h 34 m"},
    {"jornada_semanal": 9, "horas_lectivas_HA": 8, "horas_lectivas_hc": "6 h 0 m", "recreo": "0 h 37 m", "horas_no_lectivas": "2 h 23 m"},
    {"jornada_semanal": 8, "horas_lectivas_HA": 7, "horas_lectivas_hc": "5 h 15 m", "recreo": "0 h 33 m", "horas_no_lectivas": "2 h 12 m"},
    {"jornada_semanal": 7, "horas_lectivas_HA": 6, "horas_lectivas_hc": "4 h 30 m", "recreo": "0 h 29 m", "horas_no_lectivas": "2 h 1 m"},
    {"jornada_semanal": 6, "horas_lectivas_HA": 5, "horas_lectivas_hc": "3 h 45 m", "recreo": "0 h 25 m", "horas_no_lectivas": "1 h 50 m"},
    {"jornada_semanal": 5, "horas_lectivas_HA": 4, "horas_lectivas_hc": "3 h 0 m", "recreo": "0 h 20 m", "horas_no_lectivas": "1 h 40 m"},
    {"jornada_semanal": 4, "horas_lectivas_HA": 3, "horas_lectivas_hc": "2 h 15 m", "recreo": "0 h 16 m", "horas_no_lectivas": "1 h 29 m"},
    {"jornada_semanal": 3, "horas_lectivas_HA": 3, "horas_lectivas_hc": "2 h 15 m", "recreo": "0 h 12 m", "horas_no_lectivas": "0 h 33 m"},
    {"jornada_semanal": 2, "horas_lectivas_HA": 2, "horas_lectivas_hc": "1 h 30 m", "recreo": "0 h 8 m", "horas_no_lectivas": "0 h 22 m"},
    {"jornada_semanal": 1, "horas_lectivas_HA": 1, "horas_lectivas_hc": "0 h 45 m", "recreo": "0 h 4 m", "horas_no_lectivas": "0 h 11 m"}
  ],
  "regimen_60_40": [
    {"jornada_semanal": 44, "horas_lectivas_HA": 35, "horas_lectivas_hc": "26 h 15 m", "recreo": "3 h 0 m", "horas_no_lectivas": "14 h 45 m"},
    {"jornada_semanal": 43, "horas_lectivas_HA": 34, "horas_lectivas_hc": "25 h 30 m", "recreo": "2 h 56 m", "horas_no_lectivas": "14 h 34 m"},
    {"jornada_semanal": 42, "horas_lectivas_HA": 33, "horas_lectivas_hc": "24 h 45 m", "recreo": "2 h 52 m", "horas_no_lectivas": "14 h 23 m"},
    {"jornada_semanal": 41, "horas_lectivas_HA": 33, "horas_lectivas_hc": "24 h 45 m", "recreo": "2 h 48 m", "horas_no_lectivas": "13 h 27 m"},
    {"jornada_semanal": 40, "horas_lectivas_HA": 32, "horas_lectivas_hc": "24 h 0 m", "recreo": "2 h 44 m", "horas_no_lectivas": "13 h 16 m"},
    {"jornada_semanal": 39, "horas_lectivas_HA": 31, "horas_lectivas_hc": "23 h 15 m", "recreo": "2 h 40 m", "horas_no_lectivas": "13 h 5 m"},
    {"jornada_semanal": 38, "horas_lectivas_HA": 30, "horas_lectivas_hc": "22 h 30 m", "recreo": "2 h 35 m", "horas_no_lectivas": "12 h 55 m"},
    {"jornada_semanal": 37, "horas_lectivas_HA": 29, "horas_lectivas_hc": "21 h 45 m", "recreo": "2 h 31 m", "horas_no_lectivas": "12 h 44 m"},
    {"jornada_semanal": 36, "horas_lectivas_HA": 29, "horas_lectivas_hc": "21 h 45 m", "recreo": "2 h 27 m", "horas_no_lectivas": "11 h 48 m"},
    {"jornada_semanal": 35, "horas_lectivas_HA": 28, "horas_lectivas_hc": "21 h 0 m", "recreo": "2 h 23 m", "horas_no_lectivas": "11 h 37 m"},
    {"jornada_semanal": 34, "horas_lectivas_HA": 27, "horas_lectivas_hc": "20 h 15 m", "recreo": "2 h 19 m", "horas_no_lectivas": "11 h 26 m"},
    {"jornada_semanal": 33, "horas_lectivas_HA": 26, "horas_lectivas_hc": "19 h 30 m", "recreo": "2 h 15 m", "horas_no_lectivas": "11 h 15 m"},
    {"jornada_semanal": 32, "horas_lectivas_HA": 25, "horas_lectivas_hc": "18 h 45 m", "recreo": "2 h 11 m", "horas_no_lectivas": "11 h 4 m"},
    {"jornada_semanal": 31, "horas_lectivas_HA": 25, "horas_lectivas_hc": "18 h 45 m", "recreo": "2 h 7 m", "horas_no_lectivas": "10 h 8 m"},
    {"jornada_semanal": 30, "horas_lectivas_HA": 24, "horas_lectivas_hc": "18 h 0 m", "recreo": "2 h 3 m", "horas_no_lectivas": "9 h 57 m"},
    {"jornada_semanal": 29, "horas_lectivas_HA": 23, "horas_lectivas_hc": "17 h 15 m", "recreo": "1 h 59 m", "horas_no_lectivas": "9 h 46 m"},
    {"jornada_semanal": 28, "horas_lectivas_HA": 22, "horas_lectivas_hc": "16 h 30 m", "recreo": "1 h 55 m", "horas_no_lectivas": "9 h 35 m"},
    {"jornada_semanal": 27, "horas_lectivas_HA": 21, "horas_lectivas_hc": "15 h 45 m", "recreo": "1 h 50 m", "horas_no_lectivas": "9 h 25 m"},
    {"jornada_semanal": 26, "horas_lectivas_HA": 21, "horas_lectivas_hc": "15 h 45 m", "recreo": "1 h 46 m", "horas_no_lectivas": "8 h 29 m"},
    {"jornada_semanal": 25, "horas_lectivas_HA": 20, "horas_lectivas_hc": "15 h 0 m", "recreo": "1 h 42 m", "horas_no_lectivas": "8 h 18 m"},
    {"jornada_semanal": 24, "horas_lectivas_HA": 19, "horas_lectivas_hc": "14 h 15 m", "recreo": "1 h 38 m", "horas_no_lectivas": "8 h 7 m"},
    {"jornada_semanal": 23, "horas_lectivas_HA": 18, "horas_lectivas_hc": "13 h 30 m", "recreo": "1 h 34 m", "horas_no_lectivas": "7 h 56 m"},
    {"jornada_semanal": 22, "horas_lectivas_HA": 18, "horas_lectivas_hc": "13 h 30 m", "recreo": "1 h 30 m", "horas_no_lectivas": "7 h 0 m"},
    {"jornada_semanal": 21, "horas_lectivas_HA": 17, "horas_lectivas_hc": "12 h 45 m", "recreo": "1 h 26 m", "horas_no_lectivas": "6 h 49 m"},
    {"jornada_semanal": 20, "horas_lectivas_HA": 16, "horas_lectivas_hc": "12 h 0 m", "recreo": "1 h 22 m", "horas_no_lectivas": "6 h 38 m"},
    {"jornada_semanal": 19, "horas_lectivas_HA": 15, "horas_lectivas_hc": "11 h 15 m", "recreo": "1 h 18 m", "horas_no_lectivas": "6 h 27 m"},
    {"jornada_semanal": 18, "horas_lectivas_HA": 14, "horas_lectivas_hc": "10 h 30 m", "recreo": "1 h 14 m", "horas_no_lectivas": "6 h 16 m"},
    {"jornada_semanal": 17, "horas_lectivas_HA": 14, "horas_lectivas_hc": "10 h 30 m", "recreo": "1 h 10 m", "horas_no_lectivas": "5 h 20 m"},
    {"jornada_semanal": 16, "horas_lectivas_HA": 13, "horas_lectivas_hc": "9 h 45 m", "recreo": "1 h 5 m", "horas_no_lectivas": "5 h 10 m"},
    {"jornada_semanal": 15, "horas_lectivas_HA": 12, "horas_lectivas_hc": "9 h 0 m", "recreo": "1 h 1 m", "horas_no_lectivas": "4 h 59 m"},
    {"jornada_semanal": 14, "horas_lectivas_HA": 11, "horas_lectivas_hc": "8 h 15 m", "recreo": "0 h 57 m", "horas_no_lectivas": "4 h 48 m"},
    {"jornada_semanal": 13, "horas_lectivas_HA": 10, "horas_lectivas_hc": "7 h 30 m", "recreo": "0 h 53 m", "horas_no_lectivas": "4 h 37 m"},
    {"jornada_semanal": 12, "horas_lectivas_HA": 10, "horas_lectivas_hc": "7 h 30 m", "recreo": "0 h 49 m", "horas_no_lectivas": "3 h 41 m"},
    {"jornada_semanal": 11, "horas_lectivas_HA": 9, "horas_lectivas_hc": "6 h 45 m", "recreo": "0 h 45 m", "horas_no_lectivas": "3 h 30 m"},
    {"jornada_semanal": 10, "horas_lectivas_HA": 8, "horas_lectivas_hc": "6 h 0 m", "recreo": "0 h 41 m", "horas_no_lectivas": "3 h 19 m"},
    {"jornada_semanal": 9, "horas_lectivas_HA": 7, "horas_lectivas_hc": "5 h 15 m", "recreo": "0 h 37 m", "horas_no_lectivas": "3 h 8 m"},
    {"jornada_semanal": 8, "horas_lectivas_HA": 6, "horas_lectivas_hc": "4 h 30 m", "recreo": "0 h 33 m", "horas_no_lectivas": "2 h 57 m"},
    {"jornada_semanal": 7, "horas_lectivas_HA": 6, "horas_lectivas_hc": "4 h 30 m", "recreo": "0 h 29 m", "horas_no_lectivas": "2 h 1 m"},
    {"jornada_semanal": 6, "horas_lectivas_HA": 5, "horas_lectivas_hc": "3 h 45 m", "recreo": "0 h 25 m", "horas_no_lectivas": "1 h 50 m"},
    {"jornada_semanal": 5, "horas_lectivas_HA": 4, "horas_lectivas_hc": "3 h 0 m", "recreo": "0 h 20 m", "horas_no_lectivas": "1 h 40 m"},
    {"jornada_semanal": 4, "horas_lectivas_HA": 3, "horas_lectivas_hc": "2 h 15 m", "recreo": "0 h 16 m", "horas_no_lectivas": "1 h 29 m"},
    {"jornada_semanal": 3, "horas_lectivas_HA": 2, "horas_lectivas_hc": "1 h 30 m", "recreo": "0 h 12 m", "horas_no_lectivas": "1 h 18 m"},
    {"jornada_semanal": 2, "horas_lectivas_HA": 2, "horas_lectivas_hc": "1 h 30 m", "recreo": "0 h 8 m", "horas_no_lectivas": "0 h 22 m"},
    {"jornada_semanal": 1, "horas_lectivas_HA": 1, "horas_lectivas_hc": "0 h 45 m", "recreo": "0 h 4 m", "horas_no_lectivas": "0 h 11 m"}
  ]
};

// Helper para transformar minutos a formato "Xh Ym"
export function formatMinsToString(mins: number): string {
  if (mins <= 0) return "0h 0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

// Helper para transformar formato "X h Y m" o "Xh Ym" a minutos reales
export function parseStringToMins(str: string): number {
  if (!str) return 0;
  const regex = /(\d+)\s*h\s*(\d+)\s*m/;
  const match = str.match(regex);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
}

// Busca el contrato mínimo en la tabla oficial para cubrir la carga lectiva requerida
export function buscarContratoMinimoPorTabla(
  horasAulaRequeridas: number,
  regimenKey: 'regimen_65_35' | 'regimen_60_40'
): number {
  if (horasAulaRequeridas <= 0) return 0;
  
  const tramo = TABLA_HORAS_ESTRUCTURADA[regimenKey];
  if (!tramo) return 0;

  // Se recorre en reversa ya que el arreglo va de 44 a 1, buscando la jornada más económica que cubra las horas requeridas
  for (let i = tramo.length - 1; i >= 0; i--) {
    if (tramo[i].horas_lectivas_HA >= horasAulaRequeridas) {
      return tramo[i].jornada_semanal;
    }
  }
  
  // Extrapolación matemática de seguridad si supera el máximo
  const maxHorasAula = tramo[0].horas_lectivas_HA;
  const maxJornada = tramo[0].jornada_semanal;
  if (horasAulaRequeridas > maxHorasAula) {
    const factorExtra = maxJornada / maxHorasAula;
    return Math.ceil(horasAulaRequeridas * factorExtra);
  }
  return 0;
}

/**
 * Cálculo preciso de la jornada docente siguiendo la normativa MINEDUC (Lookup Tables).
 */
export function calcularJornadaDocente(
  contrato: number,
  proporcion: '65/35' | '60/40',
  aulaAsignadaPed: number
): JornadaDocenteResult {
  const regimenKey = proporcion === '65/35' ? 'regimen_65_35' : 'regimen_60_40';
  const tramo = TABLA_HORAS_ESTRUCTURADA[regimenKey];
  
  const roundedContrato = Math.round(contrato);
  
  if (roundedContrato <= 0) {
    return {
      contrato,
      aulaDisponiblePed: 0,
      aulaAsignadaPed,
      horasLectivasHC: 0,
      recreoHC: 0,
      hnlHC: 0,
      horasUsadasHC: 0,
      horasVacantesHC: 0
    };
  }

  // Look up entry
  let entry = tramo.find(e => e.jornada_semanal === roundedContrato);
  let scaleFactor = 1;

  if (!entry) {
    // Extrapolate if above 44 hours
    if (roundedContrato > 44) {
      entry = tramo[0]; // 44 hours entry
      scaleFactor = contrato / 44;
    } else {
      // Find closest entry
      entry = tramo.reduce((prev, curr) => {
        return Math.abs(curr.jornada_semanal - contrato) < Math.abs(prev.jornada_semanal - contrato) ? curr : prev;
      });
    }
  }

  // Exact maximums from table
  const aulaDisponiblePed = Math.round(entry.horas_lectivas_HA * scaleFactor);
  const recreoHC_max = (parseStringToMins(entry.recreo) / 60) * scaleFactor;
  const hnlHC_max = (parseStringToMins(entry.horas_no_lectivas) / 60) * scaleFactor;
  
  // Factor de asignación real
  const factorAsignacion = aulaDisponiblePed > 0 ? Math.min(1, aulaAsignadaPed / aulaDisponiblePed) : 0;
  
  // Cálculos proporcionales finales
  const horasLectivasHC = Number((aulaAsignadaPed * 0.75).toFixed(4));
  const recreoHC = Number((recreoHC_max * factorAsignacion).toFixed(4));
  const hnlHC = Number((hnlHC_max * factorAsignacion).toFixed(4));
  
  // Sumatorias y control de cuadratura
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
    horasVacantesHC
  };
}

export interface JornadaDocenteMixtaResult {
  contratoReal: number;
  pie: number;
  req65: number;
  req60: number;
  contratoSugerido: number;
  cReg: number;
  c65: number;
  c60: number;
  aulaMax65: number;
  aulaMax60: number;
  aulaMaxTotal: number;
  horasLectivasHC: number;
  recreoHC: number;
  hnlHC: number;
  prepDocenteHC: number;
  horasVacantesHC: number;
  saldo: number;
  estado: 'alerta' | 'deficit' | 'holgura' | 'exacto';
  mensaje: string;
}

/**
 * Cálculo detallado y auditoría de un contrato mixto (que combina 65/35, 60/40 y horas PIE/SEP).
 */
export function calcularJornadaDocenteMixta(
  l65: number, // horas pedagógicas de aula 65/35 asignadas
  l60: number, // horas pedagógicas de aula 60/40 asignadas
  pie: number, // horas cronológicas PIE/SEP de apoyo
  contratoReal: number // horas reales contratadas
): JornadaDocenteMixtaResult {
  // 1. Obtención de jornadas requeridas según la tabla oficial para cada tramo
  const req65 = buscarContratoMinimoPorTabla(l65, 'regimen_65_35');
  const req60 = buscarContratoMinimoPorTabla(l60, 'regimen_60_40');
  
  // Contrato recomendado acumulando los tramos y sumando horas de apoyo PIE/SEP
  const contratoSugerido = req65 + req60 + pie;
  
  // 2. Distribución del Contrato Real Regular (Excluyendo PIE)
  let cReg = 0;
  if (contratoReal > 0) {
    cReg = Math.max(0, contratoReal - pie);
  } else {
    cReg = req65 + req60; // Fallback al sugerido si no se ha ingresado contrato real
  }

  let c65 = 0;
  let c60 = 0;
  const reqTotalReg = req65 + req60;

  if (cReg > 0) {
    if (req65 > 0 && req60 === 0) {
      c65 = cReg;
      c60 = 0;
    } else if (req65 === 0 && req60 > 0) {
      c65 = 0;
      c60 = cReg;
    } else if (req65 > 0 && req60 > 0) {
      // Split proporcional según requerimientos mínimos de tabla de cada tramo
      c65 = Math.round(cReg * (req65 / reqTotalReg));
      c60 = cReg - c65;
      
      // Salvaguardas para que no queden tramos en cero si hay horas registradas
      if (c65 === 0 && cReg >= 1) {
        c65 = 1;
        c60 = cReg - 1;
      } else if (c60 === 0 && cReg >= 1) {
        c60 = 1;
        c65 = cReg - 1;
      }
    }
  }

  // Look up values for c65 and c60
  const tramo65 = TABLA_HORAS_ESTRUCTURADA.regimen_65_35;
  const tramo60 = TABLA_HORAS_ESTRUCTURADA.regimen_60_40;

  const lookupEntry = (c: number, tramo: MineducTableEntry[]) => {
    if (c <= 0) return null;
    const rc = Math.round(c);
    if (rc > 44) {
      return {
        entry: tramo[0],
        scale: c / 44
      };
    }
    const found = tramo.find(e => e.jornada_semanal === rc);
    return found ? { entry: found, scale: 1 } : null;
  };

  const lookup65 = lookupEntry(c65, tramo65);
  const lookup60 = lookupEntry(c60, tramo60);

  const aulaMax65 = lookup65 ? Math.round(lookup65.entry.horas_lectivas_HA * lookup65.scale) : 0;
  const aulaMax60 = lookup60 ? Math.round(lookup60.entry.horas_lectivas_HA * lookup60.scale) : 0;
  const aulaMaxTotal = aulaMax65 + aulaMax60;

  // Maxima capacities in HC from table
  const recreoMax65 = lookup65 ? (parseStringToMins(lookup65.entry.recreo) / 60) * lookup65.scale : 0;
  const recreoMax60 = lookup60 ? (parseStringToMins(lookup60.entry.recreo) / 60) * lookup60.scale : 0;
  
  const hnlMax65 = lookup65 ? (parseStringToMins(lookup65.entry.horas_no_lectivas) / 60) * lookup65.scale : 0;
  const hnlMax60 = lookup60 ? (parseStringToMins(lookup60.entry.horas_no_lectivas) / 60) * lookup60.scale : 0;

  // Proportional calculations based on real assigned hours vs maximums
  const factorAsignacion65 = aulaMax65 > 0 ? Math.min(1, l65 / aulaMax65) : 0;
  const factorAsignacion60 = aulaMax60 > 0 ? Math.min(1, l60 / aulaMax60) : 0;

  const horasLectivasHC = Number(((l65 + l60) * 0.75).toFixed(4));
  const recreoHC = Number((recreoMax65 * factorAsignacion65 + recreoMax60 * factorAsignacion60).toFixed(4));
  const hnlHC = Number((hnlMax65 * factorAsignacion65 + hnlMax60 * factorAsignacion60).toFixed(4));

  const prepDocenteHC = Number((hnlHC * 0.40).toFixed(4));
  
  const horasUsadasHC = Number((horasLectivasHC + recreoHC + hnlHC).toFixed(2));
  const horasVacantesHC = Number((contratoReal - horasUsadasHC).toFixed(2));

  // 3. Auditoría de estados e infracciones
  const saldo = contratoReal - contratoSugerido;
  let estado: 'alerta' | 'deficit' | 'holgura' | 'exacto' = 'exacto';
  let mensaje = 'Cumple rigurosamente con la dotación sugerida y la proporción de aula.';

  // Check classroom limits first (infraction alert)
  if (l65 > aulaMax65 || l60 > aulaMax60) {
    estado = 'alerta';
    const desc65 = l65 > aulaMax65 ? `Carga 65/35 excede el tope de ${aulaMax65} ped (actual: ${l65}). ` : '';
    const desc60 = l60 > aulaMax60 ? `Carga 60/40 excede el tope de ${aulaMax60} ped (actual: ${l60}). ` : '';
    mensaje = `⚠️ INFRACCIÓN LEGAL: ${desc65}${desc60}Excede horas de aula permitidas para el contrato regular asignado.`;
  } else if (contratoReal > 0 && contratoReal < contratoSugerido) {
    estado = 'deficit';
    mensaje = `Déficit de Horas: Faltan ${Math.abs(saldo)} hrs contratadas para cubrir la carga lectiva y no lectiva legal.`;
  } else if (contratoReal > 0 && contratoReal > contratoSugerido) {
    estado = 'holgura';
    mensaje = `Contrato Seguro: Cuenta con una holgura de ${saldo} hrs sobre el sugerido legal.`;
  } else if (contratoReal > 0 && contratoReal === contratoSugerido) {
    estado = 'exacto';
    mensaje = 'Exacto: Contrato ajustado al requerimiento mínimo de aula y recreos.';
  }

  return {
    contratoReal,
    pie,
    req65,
    req60,
    contratoSugerido,
    cReg,
    c65,
    c60,
    aulaMax65,
    aulaMax60,
    aulaMaxTotal,
    horasLectivasHC,
    recreoHC,
    hnlHC,
    prepDocenteHC,
    horasVacantesHC,
    saldo,
    estado,
    mensaje
  };
}
