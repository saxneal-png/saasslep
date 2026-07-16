import { Establecimiento, Contrato, AsignacionAula, CargoPersonalizado, RegistroRemuneracion, Funcionario, CursoDinamico, HorasCronologicasAdicionales } from './types';

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

export interface DesgloseContrato {
  horasAula: number;
  horasColaborativas: number;
  horasCronologicasAdicionales: number;
  horasDirectivas: number;
  horasTecnicoPedagogicas: number;
  horasTotales: number;
  esParvularia: boolean;
  esExcepcion: boolean;
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
  const horasAula = contrato.horas_aula !== undefined && contrato.horas_aula !== null
    ? contrato.horas_aula
    : sumAsigHoras;

  let sumColabAsigs = 0;
  let esParvularia = false;
  let esExcepcion = false;

  const cargoClean = String(funcionarioCargo || contrato.funcion_principal || '').trim().toUpperCase();
  if (cargoClean.includes('PARVULO') || cargoClean.includes('PARVULARIA') || cargoClean.includes('EDUCADORA DE PARVULOS')) {
    esParvularia = true;
  }

  if (contratoAsigs.length > 0) {
    contratoAsigs.forEach(a => {
      const { lectivasProp, noLectivasProp, esParvularia: parv, esExcepcion: ex } = obtenerRatioPorCurso(contrato.rbd, a.curso, cursosDinamicos);
      if (parv) esParvularia = true;
      if (ex) esExcepcion = true;
      sumColabAsigs += a.horas * (noLectivasProp / lectivasProp);
    });
  }

  let ratioNoLectivas = 35 / 65; // default standard
  if (contratoAsigs.length > 0 && sumAsigHoras > 0) {
    ratioNoLectivas = sumColabAsigs / sumAsigHoras;
  }

  const horasColaborativas = parseFloat((horasAula * ratioNoLectivas).toFixed(2));

  const cronList = (contrato.horas_cronologicas_adicionales || []).length > 0
    ? (contrato.horas_cronologicas_adicionales || [])
    : horasCronologicasList.filter(h => h.contrato_id === contrato.id);
  const horasCronAdic = cronList.reduce((sum, h) => sum + h.horas, 0);

  let horasDirectivas = contrato.horas_directivas || 0;
  if (contrato.es_uniprofesional) {
    horasDirectivas = Math.min(10, horasDirectivas);
  }
  const horasTecnicoPedagogicas = contrato.horas_tecnico_pedagogicas || 0;

  const horasTotales = parseFloat((horasAula + horasColaborativas + horasCronAdic + horasDirectivas + horasTecnicoPedagogicas).toFixed(2));

  return {
    horasAula,
    horasColaborativas,
    horasCronologicasAdicionales: horasCronAdic,
    horasDirectivas,
    horasTecnicoPedagogicas,
    horasTotales,
    esParvularia,
    esExcepcion
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

  activeConts.forEach(c => {
    let cronList = horasCronologicasList;
    if (contratoEditado && c.id === contratoEditado.id && horasCronologicasEditadas) {
      cronList = [
        ...horasCronologicasList.filter(h => h.contrato_id !== c.id),
        ...horasCronologicasEditadas
      ];
    }

    const desglose = calcularDesgloseContrato(c, cursosDinamicos, asignaciones, cronList);
    const sumContrato = desglose.horasAula + desglose.horasColaborativas + desglose.horasCronologicasAdicionales + desglose.horasDirectivas + desglose.horasTecnicoPedagogicas;
    sumaTotal += sumContrato;
    detalle += `RBD ${c.rbd}: Aula ${desglose.horasAula} + Colab ${desglose.horasColaborativas} + Crono ${desglose.horasCronologicasAdicionales} + Dir ${desglose.horasDirectivas} + UTP ${desglose.horasTecnicoPedagogicas} = ${sumContrato} hrs.\n`;
  });

  sumaTotal = parseFloat(sumaTotal.toFixed(2));
  const valido = sumaTotal <= 44.001;

  return {
    valido,
    sumaTotal,
    detalle
  };
}

export function normalizarRun(run: string): string {
  if (!run) return '';
  return run.trim().toUpperCase().replace(/\./g, '').replace(/[^0-9K]/g, '');
}
