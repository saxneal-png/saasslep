import { Establecimiento, Contrato, AsignacionAula } from './types';

export interface PlanEstudioNivel {
  nivel: string;
  regimen: 'JEC' | 'No JEC';
  horasObligatorias: number;
  asignaturasBase: { nombre: string; horasSugeridas: number }[];
}

export const PLANES_MINEDUC: PlanEstudioNivel[] = [
  {
    nivel: '1° a 4° Básico',
    regimen: 'JEC',
    horasObligatorias: 38,
    asignaturasBase: [
      { nombre: 'Lenguaje y Comunicación', horasSugeridas: 8 },
      { nombre: 'Matemática', horasSugeridas: 8 },
      { nombre: 'Ciencias Naturales', horasSugeridas: 3 },
      { nombre: 'Historia, Geografía y Ciencias Sociales', horasSugeridas: 3 },
      { nombre: 'Artes Visuales', horasSugeridas: 2 },
      { nombre: 'Música', horasSugeridas: 2 },
      { nombre: 'Educación Física y Salud', horasSugeridas: 4 },
      { nombre: 'Tecnología', horasSugeridas: 1 },
      { nombre: 'Orientación', horasSugeridas: 1 },
      { nombre: 'Religión', horasSugeridas: 2 },
      { nombre: 'Taller JEC (Reforzamiento)', horasSugeridas: 4 }
    ]
  },
  {
    nivel: '1° a 4° Básico',
    regimen: 'No JEC',
    horasObligatorias: 33,
    asignaturasBase: [
      { nombre: 'Lenguaje y Comunicación', horasSugeridas: 8 },
      { nombre: 'Matemática', horasSugeridas: 8 },
      { nombre: 'Ciencias Naturales', horasSugeridas: 3 },
      { nombre: 'Historia, Geografía y Ciencias Sociales', horasSugeridas: 3 },
      { nombre: 'Artes Visuales', horasSugeridas: 2 },
      { nombre: 'Música', horasSugeridas: 2 },
      { nombre: 'Educación Física y Salud', horasSugeridas: 3 },
      { nombre: 'Tecnología', horasSugeridas: 1 },
      { nombre: 'Orientación', horasSugeridas: 1 },
      { nombre: 'Religión', horasSugeridas: 2 }
    ]
  },
  {
    nivel: '5° a 8° Básico',
    regimen: 'JEC',
    horasObligatorias: 38,
    asignaturasBase: [
      { nombre: 'Lenguaje y Comunicación', horasSugeridas: 6 },
      { nombre: 'Matemática', horasSugeridas: 6 },
      { nombre: 'Ciencias Naturales', horasSugeridas: 4 },
      { nombre: 'Historia, Geografía y Ciencias Sociales', horasSugeridas: 4 },
      { nombre: 'Idioma Extranjero: Inglés', horasSugeridas: 3 },
      { nombre: 'Artes Visuales', horasSugeridas: 2 },
      { nombre: 'Música', horasSugeridas: 2 },
      { nombre: 'Educación Física y Salud', horasSugeridas: 4 },
      { nombre: 'Tecnología', horasSugeridas: 1 },
      { nombre: 'Orientación', horasSugeridas: 1 },
      { nombre: 'Religión', horasSugeridas: 2 },
      { nombre: 'Taller JEC', horasSugeridas: 3 }
    ]
  },
  {
    nivel: 'Educación Parvularia (Pre-Kínder y Kínder)',
    regimen: 'JEC',
    horasObligatorias: 30,
    asignaturasBase: [
      { nombre: 'Ámbito Desarrollo Personal y Social', horasSugeridas: 10 },
      { nombre: 'Ámbito Comunicación Integral', horasSugeridas: 10 },
      { nombre: 'Ámbito Relación con el Medio Natural y Cultural', horasSugeridas: 10 }
    ]
  }
];

export interface ResultadoProporcionHoraria {
  horasContrato: number;
  horasLectivasMaximas: number; // Maximum teaching hours in classroom allowed
  horasNoLectivasMinimas: number; // Minimum non-classroom hours (planning/grading)
  horasLectivasAsignadas: number; // What they are actually teaching
  horasDisponibles: number; // Free hours remaining
  leyEspecialAplicada: boolean;
  cumpleLey20903: boolean;
  proporcionLectiva: number; // percentage (e.g. 60 or 65)
  proporcionNoLectiva: number; // percentage (e.g. 40 or 35)
}

/**
 * Calculates the legal teaching/non-teaching hour distribution based on Ley 20.903
 */
export function calcularLey20903(
  horasContrato: number,
  ivmEstablecimiento: number,
  esEnseBajoIvmEspecial: boolean // 1° a 4° Básico
): ResultadoProporcionHoraria {
  // Check if school has IVM > 80% and we are in 1° to 4° Básico -> Proporcion is 60% classroom (lectiva), 40% non-classroom (no lectiva)
  // Otherwise it is 65% classroom (lectiva), 35% non-classroom (no lectiva)
  const esEspecial = ivmEstablecimiento > 80 && esEnseBajoIvmEspecial;
  
  const proporcionLectiva = esEspecial ? 60 : 65;
  const proporcionNoLectiva = esEspecial ? 40 : 35;

  // Mathematically compute exact hours (with float support)
  const horasLectivasMaximas = parseFloat(((horasContrato * proporcionLectiva) / 100).toFixed(2));
  const horasNoLectivasMinimas = parseFloat(((horasContrato * proporcionNoLectiva) / 100).toFixed(2));

  return {
    horasContrato,
    horasLectivasMaximas,
    horasNoLectivasMinimas,
    horasLectivasAsignadas: 0, // Filled subsequently
    horasDisponibles: horasContrato,
    leyEspecialAplicada: esEspecial,
    cumpleLey20903: true,
    proporcionLectiva,
    proporcionNoLectiva
  };
}

/**
 * Validates a contract's actual load against Ley 20.903 rules
 */
export function validarCargaDocente(
  contrato: Contrato,
  establecimiento: Establecimiento,
  asignaciones: AsignacionAula[]
): ResultadoProporcionHoraria {
  // If replacement, it inherits the same, but let's check its own capacity.
  // If Licencia Médica, the contract's teaching workload is logically frozen (does not count towards this teacher).
  
  // Let's check if the assignments contain any 1° a 4° Básico courses
  const tieneCursosIvmEspecial = asignaciones.some(a => 
    a.curso.includes('1°') || a.curso.includes('2°') || a.curso.includes('3°') || a.curso.includes('4°')
  );

  const calculo = calcularLey20903(
    contrato.horas_totales,
    establecimiento.ivm,
    tieneCursosIvmEspecial
  );

  // If Licence, active teaching load is 0
  const horasLectivasAsignadas = contrato.estado === 'Licencia Médica' 
    ? 0 
    : asignaciones.reduce((sum, a) => sum + a.horas, 0);

  calculo.horasLectivasAsignadas = horasLectivasAsignadas;
  // Available hours to assign in classrooms
  calculo.horasDisponibles = parseFloat((calculo.horasLectivasMaximas - horasLectivasAsignadas).toFixed(2));
  
  // Validation check: cannot exceed max teaching hours
  calculo.cumpleLey20903 = calculo.horasLectivasAsignadas <= calculo.horasLectivasMaximas + 0.01;

  return calculo;
}

export interface ReemplazoAuditoria {
  titularContrato: Contrato;
  reemplazoContrato: Contrato;
  horasEspejo: number;
  horasAsignadas: number;
  costoDuplicadoEstimado: number; // Simulated extra financial cost
}

/**
 * Calculates replacement costs and mirrors
 */
export function auditarReemplazo(
  contratos: Contrato[],
  contratoReemplazo: Contrato
): ReemplazoAuditoria | null {
  if (contratoReemplazo.estado !== 'Reemplazo' || !contratoReemplazo.vinculo_titular_id) {
    return null;
  }

  const titular = contratos.find(c => c.id === contratoReemplazo.vinculo_titular_id);
  if (!titular) return null;

  // Average cost per CLP per hour could be simulated (e.g. 18500 per hour)
  const costoHora = 18500;
  const horasEspejo = titular.horas_totales;
  
  return {
    titularContrato: titular,
    reemplazoContrato: contratoReemplazo,
    horasEspejo,
    horasAsignadas: contratoReemplazo.horas_totales,
    costoDuplicadoEstimado: contratoReemplazo.horas_totales * costoHora * 4 // Monthly cost (4 weeks approx)
  };
}
