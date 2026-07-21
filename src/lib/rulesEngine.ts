import { Establecimiento, Contrato, AsignacionAula, CargoPersonalizado, RegistroRemuneracion, Funcionario, CursoDinamico, HorasCronologicasAdicionales, FinanciamientoContrato } from './types';
import { calcularJornadaDocente, calcularJornadaDocenteMixta } from './jornadaDocente';

export interface PlanEstudioNivel {
  nivel: string;
  regimen: 'JEC' | 'No JEC';
  horasObligatorias: number;
  asignaturasBase: { nombre: string; horasSugeridas: number }[];
}

export const DATA_PLANES_ESTUDIO_MINEDUC = {
  "1_4_basico": {
    "nombre": "1° a 4° año de Educación Básica",
    "regimen": {
      "JEC": { "total": 38, "libre": 6.5 },
      "No_JEC": { "total": 30, "libre": 0 }
    },
    "asignaturas": [
      { "nombre": "Lenguaje y Comunicación", "JEC": 8, "No_JEC": 8 },
      { "nombre": "Matemática", "JEC": 6, "No_JEC": 6 },
      { "nombre": "Historia, Geografía y Ciencias Sociales", "JEC": 3, "No_JEC": 3 },
      { "nombre": "Artes Visuales", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Música", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Educación Física y Salud", "JEC": 4, "No_JEC": 3 },
      { "nombre": "Orientación", "JEC": 0.5, "No_JEC": 0.5 },
      { "nombre": "Tecnología", "JEC": 1, "No_JEC": 0.5 },
      { "nombre": "Religión", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Ciencias Naturales", "JEC": 3, "No_JEC": 3 }
    ]
  },
  "5_6_basico": {
    "nombre": "5° a 6° año de Educación Básica",
    "regimen": {
      "JEC": { "total": 38, "libre": 6 },
      "No_JEC": { "total": 30, "libre": 0 }
    },
    "asignaturas": [
      { "nombre": "Lenguaje y Comunicación", "JEC": 6, "No_JEC": 6 },
      { "nombre": "Matemática", "JEC": 6, "No_JEC": 6 },
      { "nombre": "Historia, Geografía y Ciencias Sociales", "JEC": 4, "No_JEC": 4 },
      { "nombre": "Artes Visuales", "JEC": 1.5, "No_JEC": 1 },
      { "nombre": "Música", "JEC": 1.5, "No_JEC": 1 },
      { "nombre": "Educación Física y Salud", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Orientación", "JEC": 1, "No_JEC": 1 },
      { "nombre": "Tecnología", "JEC": 1, "No_JEC": 1 },
      { "nombre": "Religión", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Ciencias Naturales", "JEC": 4, "No_JEC": 3 },
      { "nombre": "Idioma Extranjero: Inglés", "JEC": 3, "No_JEC": 3 }
    ]
  },
  "7_8_basico": {
    "nombre": "7° a 8° año de Educación Básica (Estándar)",
    "regimen": {
      "JEC": { "total": 38, "libre": 6 },
      "No_JEC": { "total": 33, "libre": 2 }
    },
    "asignaturas": [
      { "nombre": "Lengua y Literatura", "JEC": 6, "No_JEC": 6 },
      { "nombre": "Matemática", "JEC": 6, "No_JEC": 6 },
      { "nombre": "Historia, Geografía y Ciencias Sociales", "JEC": 4, "No_JEC": 4 },
      { "nombre": "Artes Visuales y Música", "JEC": 3, "No_JEC": 2 },
      { "nombre": "Educación Física y Salud", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Orientación", "JEC": 1, "No_JEC": 1 },
      { "nombre": "Tecnología", "JEC": 1, "No_JEC": 1 },
      { "nombre": "Religión", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Ciencias Naturales", "JEC": 4, "No_JEC": 4 },
      { "nombre": "Idioma Extranjero: Inglés", "JEC": 3, "No_JEC": 3 }
    ]
  },
  "7_8_basico_indigena": {
    "nombre": "7° a 8° año de Educación Básica - Con Sector Lengua Indígena",
    "regimen": {
      "JEC": { "total": 38, "libre": 6 },
      "No_JEC": { "total": 33, "libre": 2 }
    },
    "asignaturas": [
      { "nombre": "Lengua y Literatura", "JEC": 5, "No_JEC": 4 },
      { "nombre": "Lengua Indígena", "JEC": 4, "No_JEC": 4 },
      { "nombre": "Idioma Extranjero: Inglés", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Matemática", "JEC": 6, "No_JEC": 6 },
      { "nombre": "Historia, Geografía y Ciencias Sociales", "JEC": 3, "No_JEC": 3 },
      { "nombre": "Artes Visuales y Música", "JEC": 3, "No_JEC": 2 },
      { "nombre": "Educación Física y Salud", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Orientación", "JEC": 1, "No_JEC": 1 },
      { "nombre": "Tecnología", "JEC": 1, "No_JEC": 1 },
      { "nombre": "Religión", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Ciencias Naturales", "JEC": 3, "No_JEC": 4 }
    ]
  },
  "1_2_medio": {
    "nombre": "1° y 2° año de Educación Media",
    "regimen": {
      "JEC": { "total": 42, "libre": 6 },
      "No_JEC": { "total": 33, "libre": 0 }
    },
    "asignaturas": [
      { "nombre": "Lengua y Literatura", "JEC": 6, "No_JEC": 6 },
      { "nombre": "Matemática", "JEC": 7, "No_JEC": 6 },
      { "nombre": "Historia, Geografía y Ciencias Sociales", "JEC": 4, "No_JEC": 4 },
      { "nombre": "Artes Visuales o Música", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Educación Física y Salud", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Orientación", "JEC": 1, "No_JEC": 1 },
      { "nombre": "Tecnología", "JEC": 2, "No_JEC": 1 },
      { "nombre": "Religión", "JEC": 2, "No_JEC": 2 },
      { "nombre": "Ciencias Naturales", "JEC": 6, "No_JEC": 6 },
      { "nombre": "Idioma Extranjero: Inglés", "JEC": 4, "No_JEC": 3 }
    ]
  },
  "3_4_medio": {
    "nombre": "3° y 4° año de Educación Media",
    "plan_comun_general": [
      { "nombre": "Lengua y Literatura", "horas": 3 },
      { "nombre": "Matemática", "horas": 3 },
      { "nombre": "Educación Ciudadana", "horas": 2 },
      { "nombre": "Filosofía", "horas": 2 },
      { "nombre": "Inglés", "horas": 2 },
      { "nombre": "Ciencias para la Ciudadanía", "horas": 2 }
    ],
    "plan_comun_electivo": [
      { "nombre": "Electivo Común (Religión/Historia/Artes/Ed.Física)", "horas": 2 }
    ],
    "modalidades": {
      "humanistico_cientifico": { "nombre": "Humanístico-Científico", "diferenciada": 18, "JEC": { "total": 42, "libre": 8 }, "No_JEC": { "total": 36, "libre": 2 } },
      "tecnico_profesional": { "nombre": "Técnico-Profesional", "diferenciada": 22, "JEC": { "total": 42, "libre": 6 }, "No_JEC": { "total": 38, "libre": 2 } },
      "artistico": { "nombre": "Artístico", "diferenciada": 21, "JEC": { "total": 42, "libre": 5 }, "No_JEC": { "total": 0, "libre": 0 } }
    }
  }
};

export function getPlanesMineducConvertidos(): PlanEstudioNivel[] {
  const result: PlanEstudioNivel[] = [];

  // 1. 1_4_basico
  const p14 = DATA_PLANES_ESTUDIO_MINEDUC["1_4_basico"];
  result.push({
    nivel: "1° a 4° Básico",
    regimen: "JEC",
    horasObligatorias: p14.regimen.JEC.total,
    asignaturasBase: p14.asignaturas.map(a => ({ nombre: a.nombre, horasSugeridas: a.JEC }))
  });
  result.push({
    nivel: "1° a 4° Básico",
    regimen: "No JEC",
    horasObligatorias: p14.regimen.No_JEC.total,
    asignaturasBase: p14.asignaturas.map(a => ({ nombre: a.nombre, horasSugeridas: a.No_JEC }))
  });

  // 2. 5_6_basico
  const p56 = DATA_PLANES_ESTUDIO_MINEDUC["5_6_basico"];
  result.push({
    nivel: "5° a 6° Básico",
    regimen: "JEC",
    horasObligatorias: p56.regimen.JEC.total,
    asignaturasBase: p56.asignaturas.map(a => ({ nombre: a.nombre, horasSugeridas: a.JEC }))
  });
  result.push({
    nivel: "5° a 6° Básico",
    regimen: "No JEC",
    horasObligatorias: p56.regimen.No_JEC.total,
    asignaturasBase: p56.asignaturas.map(a => ({ nombre: a.nombre, horasSugeridas: a.No_JEC }))
  });

  // 3. 7_8_basico
  const p78 = DATA_PLANES_ESTUDIO_MINEDUC["7_8_basico"];
  result.push({
    nivel: "7° a 8° Básico",
    regimen: "JEC",
    horasObligatorias: p78.regimen.JEC.total,
    asignaturasBase: p78.asignaturas.map(a => ({ nombre: a.nombre, horasSugeridas: a.JEC }))
  });
  result.push({
    nivel: "7° a 8° Básico",
    regimen: "No JEC",
    horasObligatorias: p78.regimen.No_JEC.total,
    asignaturasBase: p78.asignaturas.map(a => ({ nombre: a.nombre, horasSugeridas: a.No_JEC }))
  });

  // 4. 7_8_basico_indigena
  const p78i = DATA_PLANES_ESTUDIO_MINEDUC["7_8_basico_indigena"];
  result.push({
    nivel: "7° a 8° Básico (Indígena)",
    regimen: "JEC",
    horasObligatorias: p78i.regimen.JEC.total,
    asignaturasBase: p78i.asignaturas.map(a => ({ nombre: a.nombre, horasSugeridas: a.JEC }))
  });
  result.push({
    nivel: "7° a 8° Básico (Indígena)",
    regimen: "No JEC",
    horasObligatorias: p78i.regimen.No_JEC.total,
    asignaturasBase: p78i.asignaturas.map(a => ({ nombre: a.nombre, horasSugeridas: a.No_JEC }))
  });

  // 5. 1_2_medio
  const p12m = DATA_PLANES_ESTUDIO_MINEDUC["1_2_medio"];
  result.push({
    nivel: "1° y 2° Medio",
    regimen: "JEC",
    horasObligatorias: p12m.regimen.JEC.total,
    asignaturasBase: p12m.asignaturas.map(a => ({ nombre: a.nombre, horasSugeridas: a.JEC }))
  });
  result.push({
    nivel: "1° y 2° Medio",
    regimen: "No JEC",
    horasObligatorias: p12m.regimen.No_JEC.total,
    asignaturasBase: p12m.asignaturas.map(a => ({ nombre: a.nombre, horasSugeridas: a.No_JEC }))
  });

  // 6. 3_4_medio
  const p34 = DATA_PLANES_ESTUDIO_MINEDUC["3_4_medio"];
  const general = p34.plan_comun_general;
  const electivo = p34.plan_comun_electivo;
  
  for (const [key, mod] of Object.entries(p34.modalidades)) {
    const listBase = [
      ...general.map(g => ({ nombre: g.nombre, horasSugeridas: g.horas })),
      ...electivo.map(e => ({ nombre: e.nombre, horasSugeridas: e.horas })),
      { nombre: `Formación Diferenciada (${mod.nombre})`, horasSugeridas: mod.diferenciada }
    ];

    if (mod.JEC.total > 0) {
      result.push({
        nivel: `3° y 4° Medio (${mod.nombre.toUpperCase()})`,
        regimen: "JEC",
        horasObligatorias: mod.JEC.total,
        asignaturasBase: listBase
      });
    }

    if (mod.No_JEC.total > 0) {
      result.push({
        nivel: `3° y 4° Medio (${mod.nombre.toUpperCase()})`,
        regimen: "No JEC",
        horasObligatorias: mod.No_JEC.total,
        asignaturasBase: listBase
      });
    }
  }

  return result;
}

export const PLANES_MINEDUC: PlanEstudioNivel[] = getPlanesMineducConvertidos();

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

export function obtenerRatioPorCurso(
  rbd: string,
  cursoNombre: string,
  cursosDinamicos: CursoDinamico[] = []
): {
  lectivasProp: number;
  noLectivasProp: number;
  esParvularia: boolean;
  esExcepcion: boolean;
} {
  const rbdNorm = (val: any) => String(val || '').trim().replace(/^0+/, '');
  const cleanCurso = String(cursoNombre || '').toLowerCase();
  
  const esParvularia = cleanCurso.includes('parvulo') || 
                       cleanCurso.includes('parvularia') || 
                       cleanCurso.includes('kínder') || 
                       cleanCurso.includes('kinder') || 
                       cleanCurso.includes('pre-kínder') || 
                       cleanCurso.includes('prekinder') || 
                       cleanCurso.includes('transición') || 
                       cleanCurso.includes('transicion') || 
                       cleanCurso.includes('nt1') || 
                       cleanCurso.includes('nt2');

  const cursoInfo = cursosDinamicos.find(
    c => rbdNorm(c.rbd) === rbdNorm(rbd) && String(c.nombre || '').toLowerCase() === cleanCurso
  );

  let esExcepcion = false;
  if (cursoInfo) {
    const level = String(cursoInfo.nivel || '').toLowerCase();
    const is1To4 = level.includes('1°') || level.includes('2°') || level.includes('3°') || level.includes('4°') ||
                   level.includes('1o') || level.includes('2o') || level.includes('3o') || level.includes('4o') ||
                   level.includes('primero') || level.includes('segundo') || level.includes('tercero') || level.includes('cuarto') ||
                   cleanCurso.includes('1°') || cleanCurso.includes('2°') || cleanCurso.includes('3°') || cleanCurso.includes('4°') ||
                   cleanCurso.includes('1o') || cleanCurso.includes('2o') || cleanCurso.includes('3o') || cleanCurso.includes('4o');
    const isBasico = level.includes('bás') || level.includes('bas') || level.includes('primaria') ||
                     cleanCurso.includes('bás') || cleanCurso.includes('bas');
    const isMedio = level.includes('med') || level.includes('sec') || cleanCurso.includes('med');
    
    const prioritarios = cursoInfo.concentracion_prioritarios ?? 0;
    if (is1To4 && isBasico && !isMedio && prioritarios >= 80) {
      esExcepcion = true;
    }
  }

  if (esExcepcion) {
    return { lectivasProp: 60, noLectivasProp: 40, esParvularia, esExcepcion: true };
  }
  return { lectivasProp: 65, noLectivasProp: 35, esParvularia, esExcepcion: false };
}

/**
 * Calculate non‑lective (colaborativas) hours from aula hours using the appropriate ratio.
 * Returns 0 for Parvularia (continuous hours).
 */
export function calcularHorasNoLectivas(
  horasAula: number,
  nivel: string,
  concentracionPrioritarios: number,
  esParvularia: boolean
): number {
  // For Parvularia, pedagogical hour is 60 min instead of 45 min. Apply scaling factor before ratio.
  const scalingFactor = esParvularia ? 4 / 3 : 1;
  const adjustedHorasAula = horasAula * scalingFactor;
  const esBasico1a4 = /1[°o]|2[°o]|3[°o]|4[°o]/.test(nivel) && /bás|bas|primaria/.test(nivel);
  const usarExcepcion = esBasico1a4 && concentracionPrioritarios >= 80;
  const ratio = usarExcepcion ? 0.40 / 0.60 : 0.35 / 0.65;
  return Number((adjustedHorasAula * ratio).toFixed(2));
}

export interface DesgloseContrato {
  horasAula: number;
  horasColaborativas: number;
  horasCronologicasAdicionales: number;
  horasDirectivas: number;
  horasTecnicoPedagogicas: number;
  horasTotales: number;
  esParvularia: boolean;
  esExcepcion: boolean;
  docenciaAulaCronologica: number;
  recreoCalculado: number;
  bloquePresencialTotal: number;
  esEspecial: boolean;
  esLenguaje: boolean;
  duracionMinutos: number;
  topeMaximoDocencia: number;
  docenciaEfectivaPIE: number;
  esPIE: boolean;
}

export function getDecretoConfig(
  contrato: Contrato,
  cargo: string,
  cursoNombre: string = '',
  establecimientoNombre: string = ''
): {
  duracionLectivaMinutos: number;
  esParvularia: boolean;
  esEspecial: boolean;
  esLenguaje: boolean;
} {
  const cleanCargo = String(cargo || contrato.funcion_principal || '').trim().toUpperCase();
  const cleanCurso = String(cursoNombre || '').trim().toUpperCase();
  const estName = String(establecimientoNombre || contrato.establecimientos?.nombre || '').trim().toUpperCase();

  const esParvularia = cleanCargo.includes('PARVULO') || 
                       cleanCargo.includes('PARVULARIA') || 
                       cleanCargo.includes('EDUCADORA DE PARVULOS') ||
                       cleanCurso.includes('KINDER') ||
                       cleanCurso.includes('KÍNDER') ||
                       cleanCurso.includes('PREKINDER') ||
                       cleanCurso.includes('PRE-KÍNDER') ||
                       cleanCurso.includes('TRANSICION') ||
                       cleanCurso.includes('TRANSICIÓ') ||
                       cleanCurso.includes('NT1') ||
                       cleanCurso.includes('NT2');

  const esEspecial = estName.includes('ESPECIAL') || 
                     estName.includes('DIFERENCIAL') || 
                     estName.includes('DEFICIENCIA MENTAL') ||
                     cleanCurso.includes('LABORAL') ||
                     cleanCurso.includes('DIFERENCIAL') ||
                     cleanCurso.includes('ESPECIAL') ||
                     cleanCurso.includes('DECRETO 87');

  const esLenguaje = !esEspecial && (
                     estName.includes('LENGUAJE') || 
                     estName.includes('DECRETO 1300') ||
                     cleanCurso.includes('LENGUAJE')
  );

  let duracionLectivaMinutos = 45;
  if (esParvularia) {
    if (esEspecial) {
      duracionLectivaMinutos = 30; // Decreto 87 Nivel Parvulario
    } else {
      duracionLectivaMinutos = 60; // Parvularia Regular
    }
  } else if (esEspecial) {
    duracionLectivaMinutos = 40; // Decreto 87 Nivel Básico y Laboral
  }

  return {
    duracionLectivaMinutos,
    esParvularia,
    esEspecial,
    esLenguaje
  };
}

export function calcularDesgloseContrato(
  contrato: Contrato,
  cursosDinamicos: CursoDinamico[] = [],
  asignaciones: AsignacionAula[] = [],
  horasCronologicasList: HorasCronologicasAdicionales[] = [],
  funcionarioEstamento?: string,
  funcionarioCargo?: string
): DesgloseContrato {
  const rbdNorm = (val: any) => String(val || '').trim().replace(/^0+/, '');

  const contratoAsigs = asignaciones.filter(a => a.contrato_id === contrato.id);
  const sumAsigHoras = contratoAsigs.reduce((sum, a) => sum + a.horas, 0);

  const cargoClean = String(funcionarioCargo || contrato.funcion_principal || '').trim().toUpperCase();
  const config = getDecretoConfig(contrato, cargoClean, contratoAsigs[0]?.curso);

  let esParvularia = config.esParvularia;
  let esExcepcion = false;

  if (contratoAsigs.length > 0) {
    contratoAsigs.forEach(a => {
      const { esParvularia: parv, esExcepcion: ex } = obtenerRatioPorCurso(contrato.rbd, a.curso, cursosDinamicos);
      if (parv) esParvularia = true;
      if (ex) esExcepcion = true;
    });
  }

  const ratioLectivo = esExcepcion ? 0.60 : 0.65;

  let horasAula = contrato.horas_aula;
  let horasTotales = contrato.horas_totales;

  if (horasTotales && horasTotales > 0) {
    if (horasAula === undefined || horasAula === null || horasAula === 0) {
      if (config.esParvularia && config.duracionLectivaMinutos === 60) {
        horasAula = Math.round(horasTotales * ratioLectivo);
      } else {
        const factorLectivasHC = config.duracionLectivaMinutos / 60;
        horasAula = Math.round((horasTotales * ratioLectivo) / factorLectivasHC);
      }
    }
  } else if (horasAula !== undefined && horasAula !== null && horasAula > 0) {
    if (config.esParvularia && config.duracionLectivaMinutos === 60) {
      horasTotales = Math.round(horasAula / ratioLectivo);
    } else {
      const factorLectivasHC = config.duracionLectivaMinutos / 60;
      horasTotales = Math.round((horasAula * factorLectivasHC) / ratioLectivo);
    }
  } else {
    horasAula = sumAsigHoras;
  }

  let docenciaAulaCronologica = 0;
  let recreoCalculado = 0;
  let horasColaborativas = 0;
  let calculatedTopeMaxDoc = 0;

  if (config.duracionLectivaMinutos === 45 && !config.esParvularia && horasTotales > 0) {
    const esPIE = contrato.calidad_juridica.includes('PIE') || 
                  String(contrato.funcion_principal).toUpperCase().includes('PIE');

    let l65 = 0;
    let l60 = 0;
    let pie = 0;

    if (esPIE) {
      pie = horasTotales;
    } else {
      if (contratoAsigs.length > 0) {
        contratoAsigs.forEach(a => {
          const { esParvularia: parv, esExcepcion: ex } = obtenerRatioPorCurso(contrato.rbd, a.curso, cursosDinamicos);
          if (ex) {
            l60 += a.horas;
          } else {
            l65 += a.horas;
          }
        });
      } else {
        if (esExcepcion) {
          l60 = Math.round(horasTotales * 0.60 / 0.75);
        } else {
          l65 = Math.round(horasTotales * 0.65 / 0.75);
        }
      }
    }

    const result = calcularJornadaDocenteMixta(l65, l60, pie, horasTotales);
    horasAula = l65 + l60;
    if (contratoAsigs.length === 0) {
      horasAula = result.aulaMaxTotal;
    }
    docenciaAulaCronologica = result.horasLectivasHC;
    recreoCalculado = result.recreoHC;
    horasColaborativas = result.hnlHC;
    calculatedTopeMaxDoc = parseFloat((result.aulaMaxTotal * 0.75).toFixed(2));
  } else {
    docenciaAulaCronologica = parseFloat((horasAula * (config.duracionLectivaMinutos / 60)).toFixed(2));
    if (config.duracionLectivaMinutos === 45) {
      recreoCalculado = parseFloat((horasTotales * (3 / 44)).toFixed(2));
    } else if (config.esParvularia && config.duracionLectivaMinutos === 60) {
      recreoCalculado = 0; 
    } else {
      recreoCalculado = parseFloat((horasAula * (5 / 60)).toFixed(2));
    }
    horasColaborativas = parseFloat((horasTotales - docenciaAulaCronologica - recreoCalculado).toFixed(2));
    horasColaborativas = Math.max(0, horasColaborativas);
  }

  const bloquePresencialTotal = parseFloat((docenciaAulaCronologica + recreoCalculado).toFixed(2));

  const esPIE = contrato.calidad_juridica.includes('PIE') || 
                String(contrato.funcion_principal).toUpperCase().includes('PIE');

  const docenciaEfectivaPIE = docenciaAulaCronologica;

  const cronList = (contrato.horas_cronologicas_adicionales || []).length > 0
    ? (contrato.horas_cronologicas_adicionales || [])
    : horasCronologicasList.filter(h => h.contrato_id === contrato.id);
  const horasCronAdic = cronList.reduce((sum, h) => sum + h.horas, 0);

  let horasDirectivas = contrato.horas_directivas || 0;
  if (contrato.es_uniprofesional) {
    horasDirectivas = Math.min(10, horasDirectivas);
  }
  const horasTecnicoPedagogicas = contrato.horas_tecnico_pedagogicas || 0;

  const baseTope = esExcepcion ? 26.25 : 28.5;
  const topeMaximoDocencia = calculatedTopeMaxDoc > 0 ? calculatedTopeMaxDoc : parseFloat((baseTope * (horasTotales / 44)).toFixed(2));

  return {
    horasAula,
    horasColaborativas,
    horasCronologicasAdicionales: horasCronAdic,
    horasDirectivas,
    horasTecnicoPedagogicas,
    horasTotales,
    esParvularia: config.esParvularia,
    esExcepcion,
    docenciaAulaCronologica,
    recreoCalculado,
    bloquePresencialTotal,
    esEspecial: config.esEspecial,
    esLenguaje: config.esLenguaje,
    duracionMinutos: config.duracionLectivaMinutos,
    topeMaximoDocencia,
    docenciaEfectivaPIE,
    esPIE
  };
}

/**
 * Calculates the legal teaching/non-teaching hour distribution based on Ley 20.903
 */
export function calcularLey20903(
  horasContrato: number,
  ivmEstablecimiento: number,
  esEnseBajoIvmEspecial: boolean // 1° a 4° Básico
): ResultadoProporcionHoraria {
  const esEspecial = ivmEstablecimiento > 80 && esEnseBajoIvmEspecial;
  
  const proporcionLectiva = esEspecial ? 60 : 65;
  const proporcionNoLectiva = esEspecial ? 40 : 35;

  const horasLectivasMaximas = parseFloat(((horasContrato * proporcionLectiva) / 100).toFixed(2));
  const horasNoLectivasMinimas = parseFloat(((horasContrato * proporcionNoLectiva) / 100).toFixed(2));

  return {
    horasContrato,
    horasLectivasMaximas,
    horasNoLectivasMinimas,
    horasLectivasAsignadas: 0,
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
  asignaciones: AsignacionAula[],
  cargos: CargoPersonalizado[] = [],
  cursosDinamicos: CursoDinamico[] = [],
  horasCronologicasList: HorasCronologicasAdicionales[] = []
): ResultadoProporcionHoraria {
  const desglose = calcularDesgloseContrato(contrato, cursosDinamicos, asignaciones, horasCronologicasList);
  
  const horasLectivasAsignadas = contrato.estado === 'Licencia Médica' 
    ? 0 
    : asignaciones.filter(a => a.contrato_id === contrato.id).reduce((sum, a) => sum + a.horas, 0);

  const horasLectivasMaximas = desglose.horasAula;
  const horasNoLectivasMinimas = desglose.horasColaborativas;

  const horasDisponibles = parseFloat((horasLectivasMaximas - horasLectivasAsignadas).toFixed(2));
  const cumpleLey20903 = horasLectivasAsignadas <= horasLectivasMaximas + 0.01;

  const totalAsignadas = asignaciones.filter(a => a.contrato_id === contrato.id).reduce((sum, a) => sum + a.horas, 0);
  let proporcionLectiva = 65;
  let proporcionNoLectiva = 35;
  if (totalAsignadas > 0) {
    let sumLectivaP = 0;
    let sumNoLectivaP = 0;
    asignaciones.filter(a => a.contrato_id === contrato.id).forEach(a => {
      const { lectivasProp, noLectivasProp } = obtenerRatioPorCurso(contrato.rbd, a.curso, cursosDinamicos);
      sumLectivaP += a.horas * lectivasProp;
      sumNoLectivaP += a.horas * noLectivasProp;
    });
    proporcionLectiva = sumLectivaP / totalAsignadas;
    proporcionNoLectiva = sumNoLectivaP / totalAsignadas;
  } else if (desglose.esExcepcion) {
    proporcionLectiva = 60;
    proporcionNoLectiva = 40;
  }

  return {
    horasContrato: desglose.horasTotales,
    horasLectivasMaximas,
    horasNoLectivasMinimas,
    horasLectivasAsignadas,
    horasDisponibles,
    leyEspecialAplicada: desglose.esExcepcion,
    cumpleLey20903,
    proporcionLectiva,
    proporcionNoLectiva
  };
}

export interface ReemplazoAuditoria {
  titularContrato: Contrato;
  reemplazoContrato: Contrato;
  horasEspejo: number;
  horasAsignadas: number;
  costoDuplicadoEstimado: number;
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

  const costoHora = 18500;
  const horasEspejo = titular.horas_totales;
  
  return {
    titularContrato: titular,
    reemplazoContrato: contratoReemplazo,
    horasEspejo,
    horasAsignadas: contratoReemplazo.horas_totales,
    costoDuplicadoEstimado: contratoReemplazo.horas_totales * costoHora * 4
  };
}

export function calcularHaberBaseEUS(grado: number): number {
  if (grado < 1 || grado > 24) return 0;
  const baseGrado24 = 380000;
  return Math.round(baseGrado24 * Math.pow(1.075, 24 - grado));
}

export function conciliarFuncionario(
  runNormalizado: string,
  contratos: Contrato[],
  asignaciones: AsignacionAula[],
  remuneraciones: RegistroRemuneracion[]
): {
  contratadas: number;
  aula: number;
  pagadas: number;
  discrepancia: boolean;
  mensaje: string;
} {
  const contrs = contratos.filter(c => normalizarRun(c.funcionario_run) === normalizarRun(runNormalizado));
  const totalContratadas = contrs.reduce((sum, c) => sum + c.horas_totales, 0);

  const contrIds = contrs.map(c => c.id);
  const totalAula = asignaciones.filter(a => contrIds.includes(a.contrato_id)).reduce((sum, a) => sum + a.horas, 0);

  const remuns = remuneraciones.filter(r => normalizarRun(r.funcionario_run) === normalizarRun(runNormalizado));
  const totalPagadas = remuns.reduce((sum, r) => sum + r.horas_pagadas, 0);

  const isLicencia = contrs.some(c => c.estado === 'Licencia Médica');

  let discrepancia = false;
  let mensaje = 'Conciliado correctamente.';

  if (contrs.length > 0) {
    if (totalContratadas !== totalPagadas) {
      discrepancia = true;
      mensaje = `Descalce financiero: Contratadas ${totalContratadas} hrs vs Pagadas ${totalPagadas} hrs.`;
    } else if (!isLicencia && totalAula > totalContratadas) {
      discrepancia = true;
      mensaje = `Sobrecarga de Aula: Registradas ${totalAula} hrs en aula vs Contratadas ${totalContratadas} hrs.`;
    } else {
      const aplicaArt5 = remuns.some(r => r.aplica_ley_20903_art5 === 'Sí');
      if (aplicaArt5) {
        const totalComplementaria = remuns.reduce((sum, r) => sum + (r.planilla_complementaria_ley_20903 || 0), 0);
        if (totalComplementaria === 0) {
          discrepancia = true;
          mensaje = `Infracción Art. 5 Ley 20903: Indica que aplica pero Planilla Complementaria es $0.`;
        }
      }

      if (!discrepancia) {
        const esDirector = contrs.some(c => c.funcion_principal.toLowerCase().includes('director'));
        const esUTP = contrs.some(c => c.funcion_principal.toLowerCase().includes('utp') || c.funcion_principal.toLowerCase().includes('pedagógica') || c.funcion_principal.toLowerCase().includes('pedagógico'));
        
        if (esDirector) {
          const totalAsigDirector = remuns.reduce((sum, r) => sum + (r.asignacion_res_director || 0), 0);
          if (totalAsigDirector === 0) {
            discrepancia = true;
            mensaje = `Falta asignación directiva: Director/a registra $0 en Asig. Res. Director.`;
          }
        } else if (esUTP) {
          const totalAsigUTP = remuns.reduce((sum, r) => sum + (r.asignacion_resp_tec_ped || 0), 0);
          if (totalAsigUTP === 0) {
            discrepancia = true;
            mensaje = `Falta asignación técnico-pedagógica: Jefe UTP registra $0 en asignación Resp. Téc-Ped.`;
          }
        }
      }
    }
  } else if (totalPagadas > 0) {
    discrepancia = true;
    mensaje = `Pago sin contrato: Registrado pago de ${totalPagadas} hrs pero no tiene contrato activo en RR.HH.`;
  }

  return {
    contratadas: totalContratadas,
    aula: totalAula,
    pagadas: totalPagadas,
    discrepancia,
    mensaje
  };
}

/**
 * Calculates teacher workload reconciliation
 */
export function calcularCargaDocente(
  funcionario: Funcionario,
  contratos: Contrato[],
  establecimientos: Establecimiento[],
  asignaciones: AsignacionAula[],
  cursosDinamicos: CursoDinamico[] = [],
  horasCronologicasList: HorasCronologicasAdicionales[] = []
) {
  const teacherConts = contratos.filter(c => normalizarRun(c.funcionario_run) === normalizarRun(funcionario.run));
  if (teacherConts.length === 0) {
    return {
      horasContrato: 0,
      horasAula: 0,
      horasNoLectivas: 0,
      horasNoDestinadas: 0,
      horasCronologicasAdicionales: 0
    };
  }

  let totalContrato = 0;
  let totalAula = 0;
  let totalNoLectiva = 0;
  let totalCronologicas = 0;

  teacherConts.forEach(c => {
    const desglose = calcularDesgloseContrato(c, cursosDinamicos, asignaciones, horasCronologicasList, funcionario.estamento, funcionario.cargo);
    totalContrato += desglose.horasTotales;
    totalAula += desglose.horasAula;
    totalNoLectiva += desglose.horasColaborativas;
    totalCronologicas += desglose.horasCronologicasAdicionales;
  });

  const teacherAsigIds = teacherConts.map(c => c.id);
  const totalAsignadasAula = asignaciones
    .filter(a => teacherAsigIds.includes(a.contrato_id))
    .reduce((sum, a) => sum + a.horas, 0);

  const horasNoDestinadas = parseFloat((totalAula - totalAsignadasAula).toFixed(2));

  return {
    horasContrato: totalContrato,
    horasAula: totalAula,
    horasNoLectivas: totalNoLectiva,
    horasNoDestinadas: horasNoDestinadas > 0 ? horasNoDestinadas : 0,
    horasCronologicasAdicionales: totalCronologicas
  };
}

export function validarHardCap44Horas(
  run: string,
  contratos: Contrato[],
  cursosDinamicos: CursoDinamico[] = [],
  asignaciones: AsignacionAula[] = [],
  horasCronologicasList: HorasCronologicasAdicionales[] = [],
  contratoEditado?: Contrato,
  horasCronologicasEditadas?: HorasCronologicasAdicionales[]
): {
  valido: boolean;
  sumaTotal: number;
  detalle: string;
} {
  const normRun = normalizarRun(run);
  
  let activeConts = contratos.filter(c => normalizarRun(c.funcionario_run) === normRun);
  if (contratoEditado) {
    activeConts = activeConts.filter(c => c.id !== contratoEditado.id);
    activeConts.push(contratoEditado);
  }

  let sumaTotal = 0;
  let detalle = '';
  let valido = true;
  const errores: string[] = [];

  activeConts.forEach(c => {
    let cronList = horasCronologicasList;
    if (contratoEditado && c.id === contratoEditado.id && horasCronologicasEditadas) {
      cronList = [
        ...horasCronologicasList.filter(h => h.contrato_id !== c.id),
        ...horasCronologicasEditadas
      ];
    }

    const desglose = calcularDesgloseContrato(c, cursosDinamicos, asignaciones, cronList);
    const sumContrato = (c.horas_totales !== undefined && c.horas_totales !== null && c.horas_totales > 0) ? c.horas_totales : desglose.horasTotales;
    sumaTotal += sumContrato;
    detalle += `RBD ${c.rbd}: Total Contrato = ${sumContrato} hrs (Aula ${desglose.horasAula} ped, Colab ${desglose.horasColaborativas} hrs, Crono ${desglose.horasCronologicasAdicionales} hrs).\n`;

    // 1. Validate limits on Docencia de Aula Efectiva
    const docenciaEfectiva = desglose.docenciaAulaCronologica;
    if (docenciaEfectiva > desglose.topeMaximoDocencia + 0.005) {
      valido = false;
      errores.push(`[RBD ${c.rbd}] Docencia de Aula Efectiva (${docenciaEfectiva} hrs cronológicas) excede el tope máximo legal de ${desglose.topeMaximoDocencia} hrs.`);
    }

    // 2. Validate Distribution (between 5 and 6 days)
    const dias = c.dias_trabajados || 5;
    if (dias < 5 || dias > 6) {
      valido = false;
      errores.push(`[RBD ${c.rbd}] El contrato semanal debe estar distribuido en no menos de 5 días ni más de 6 días (actual: ${dias} días).`);
    }

    // 3. Validate Daily Cap (max 10 hours daily, including 30 minutes for colación which is non-work)
    const horasDiariasPromedio = sumContrato / dias;
    const jornadaDiariaTotal = horasDiariasPromedio + 0.5; // adding 30-min colación
    if (jornadaDiariaTotal > 10.005) {
      valido = false;
      errores.push(`[RBD ${c.rbd}] La jornada diaria promedio (${jornadaDiariaTotal.toFixed(2)} hrs incluyendo colación) supera el límite máximo de 10 horas.`);
    }

    // 4. Validate HNL destination (at least 40% reserved for prep & evaluation)
    // Assume we validate if the registered HNL meets the minimum criteria
    if (desglose.horasColaborativas > 0) {
      const hnlPreparacion = desglose.horasColaborativas * 0.40;
      detalle += `  (HNL Preparación Mínimo: ${hnlPreparacion.toFixed(2)} hrs)\n`;
    }
  });

  // 5. Weekly Cap (44 hours absolute weekly cap)
  sumaTotal = parseFloat(sumaTotal.toFixed(2));
  if (sumaTotal > 44.005) {
    valido = false;
    errores.push(`Tope Semanal Superado: La suma total de horas (${sumaTotal} hrs) de todos los contratos supera las 44 horas cronológicas semanales.`);
  }

  if (errores.length > 0) {
    detalle += `\n⚠️ ERRORES DE VALIDACIÓN:\n- ` + errores.join('\n- ');
  }

  return {
    valido,
    sumaTotal,
    detalle
  };
}

// Utility to combine multiple DesgloseContrato results for mixed ratio calculations
/**
 * Aggregates an array of DesgloseContrato objects into a single summary.
 * Numeric fields are summed, boolean flags are combined with logical OR.
 */
export function combinarDesgloses(desgloses: DesgloseContrato[]): DesgloseContrato {
  const result: DesgloseContrato = {
    horasAula: 0,
    horasColaborativas: 0,
    horasCronologicasAdicionales: 0,
    horasDirectivas: 0,
    horasTecnicoPedagogicas: 0,
    horasTotales: 0,
    esParvularia: false,
    esExcepcion: false,
    docenciaAulaCronologica: 0,
    recreoCalculado: 0,
    bloquePresencialTotal: 0,
    esEspecial: false,
    esLenguaje: false,
    duracionMinutos: 0,
    topeMaximoDocencia: 0,
    docenciaEfectivaPIE: 0,
    esPIE: false
  };
  for (const d of desgloses) {
    result.horasAula += d.horasAula;
    result.horasColaborativas += d.horasColaborativas;
    result.horasCronologicasAdicionales += d.horasCronologicasAdicionales;
    result.horasDirectivas += d.horasDirectivas;
    result.horasTecnicoPedagogicas += d.horasTecnicoPedagogicas;
    result.horasTotales += d.horasTotales;
    result.docenciaAulaCronologica += d.docenciaAulaCronologica;
    result.recreoCalculado += d.recreoCalculado;
    result.bloquePresencialTotal += d.bloquePresencialTotal;
    result.topeMaximoDocencia += d.topeMaximoDocencia;
    result.docenciaEfectivaPIE += d.docenciaEfectivaPIE;
    result.esParvularia = result.esParvularia || d.esParvularia;
    result.esExcepcion = result.esExcepcion || d.esExcepcion;
    result.esEspecial = result.esEspecial || d.esEspecial;
    result.esLenguaje = result.esLenguaje || d.esLenguaje;
    result.esPIE = result.esPIE || d.esPIE;
    result.duracionMinutos = Math.max(result.duracionMinutos, d.duracionMinutos);
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  result.horasAula = round(result.horasAula);
  result.horasColaborativas = round(result.horasColaborativas);
  result.horasCronologicasAdicionales = round(result.horasCronologicasAdicionales);
  result.horasDirectivas = round(result.horasDirectivas);
  result.horasTecnicoPedagogicas = round(result.horasTecnicoPedagogicas);
  result.horasTotales = round(result.horasTotales);
  result.docenciaAulaCronologica = round(result.docenciaAulaCronologica);
  result.recreoCalculado = round(result.recreoCalculado);
  result.bloquePresencialTotal = round(result.bloquePresencialTotal);
  result.topeMaximoDocencia = round(result.topeMaximoDocencia);
  result.docenciaEfectivaPIE = round(result.docenciaEfectivaPIE);
  return result;
}

export function normalizarRun(run: string): string {
  if (!run) return '';
  return run.trim().toUpperCase().replace(/\./g, '').replace(/[^0-9K]/g, '');
}

export interface AuditFinanciamientoIrregularResult {
  contratoId: string;
  funcionarioRun: string;
  funcionarioNombre: string;
  rbd: string;
  origenFondo: 'PIE' | 'SEP';
  horasImputadas: number;
  nivelAlerta: 'critica' | 'advertencia';
  mensaje: string;
  detalle: string;
}

/**
 * Audits contracts with sensitive funding sources (PIE / SEP) assigned to standard classroom subjects without proper tags or PME action codes.
 */
export function auditarFinanciamientoIrregular(
  contratos: Contrato[],
  financiamientos: FinanciamientoContrato[],
  asignaciones: AsignacionAula[],
  funcionarios: Funcionario[]
): AuditFinanciamientoIrregularResult[] {
  const resultados: AuditFinanciamientoIrregularResult[] = [];

  contratos.forEach(c => {
    const f = funcionarios.find(fn => normalizarRun(fn.run) === normalizarRun(c.funcionario_run));
    const funcNombre = f ? f.nombre : `RUN ${c.funcionario_run}`;

    const cFins = financiamientos.filter(fi => fi.contrato_id === c.id);
    const cAsigs = asignaciones.filter(a => a.contrato_id === c.id);

    const horasPIE = cFins.filter(fi => fi.origen_fondo === 'PIE').reduce((s, fi) => s + fi.horas, 0);
    const horasSEP = cFins.filter(fi => fi.origen_fondo === 'SEP').reduce((s, fi) => s + fi.horas, 0);

    // 1. Audit PIE
    if (horasPIE > 0) {
      const tieneRespaldoPIE = cAsigs.some(a => 
        a.es_co_ensenanza || 
        a.es_apoyo_pie || 
        (a.codigo_accion_pme && a.codigo_accion_pme.trim().length > 0) ||
        a.asignatura.toLowerCase().includes('pie') || 
        a.asignatura.toLowerCase().includes('apoyo') || 
        a.asignatura.toLowerCase().includes('diferencial')
      );

      const cargoLower = (c.funcion_principal || '').toLowerCase();
      const esDocenteEspecial = cargoLower.includes('diferencial') || cargoLower.includes('pie') || cargoLower.includes('psicopedagog');

      if (!tieneRespaldoPIE && !esDocenteEspecial && cAsigs.length > 0) {
        resultados.push({
          contratoId: c.id,
          funcionarioRun: c.funcionario_run,
          funcionarioNombre: funcNombre,
          rbd: c.rbd,
          origenFondo: 'PIE',
          horasImputadas: horasPIE,
          nivelAlerta: 'critica',
          mensaje: `⚠️ Imputación PIE Irregular: Docente registra ${horasPIE} hrs PIE destinadas a Plan Común sin acreditar Co-Enseñanza o Apoyo PIE.`,
          detalle: `El contrato de ${funcNombre} en RBD ${c.rbd} registra ${horasPIE} hrs con fondo PIE, pero sus clases asignadas (${cAsigs.map(a => a.asignatura).join(', ')}) son del Plan Común general sin etiquetar Co-Enseñanza ni Apoyo Especialista.`
        });
      }
    }

    // 2. Audit SEP
    if (horasSEP > 0) {
      const tieneAccionPME = cFins.some(fi => fi.origen_fondo === 'SEP' && fi.codigo_accion_pme && fi.codigo_accion_pme.trim().length > 0) ||
        cAsigs.some(a => (a.codigo_accion_pme && a.codigo_accion_pme.trim().length > 0) || a.asignatura.toLowerCase().includes('sep') || a.asignatura.toLowerCase().includes('reforzamiento') || a.asignatura.toLowerCase().includes('taller'));

      if (!tieneAccionPME && cAsigs.length > 0) {
        resultados.push({
          contratoId: c.id,
          funcionarioRun: c.funcionario_run,
          funcionarioNombre: funcNombre,
          rbd: c.rbd,
          origenFondo: 'SEP',
          horasImputadas: horasSEP,
          nivelAlerta: 'advertencia',
          mensaje: `⚠️ Subvención SEP Irregular: Contrato de ${horasSEP} hrs SEP imputado a Plan Común sin Código de Acción PME.`,
          detalle: `El docente ${funcNombre} en RBD ${c.rbd} posee ${horasSEP} hrs financiadas por Ley SEP, pero sus clases asignadas no están vinculadas a ningún Código de Acción PME o taller/reforzamiento focalizado.`
        });
      }
    }
  });

  return resultados;
}
