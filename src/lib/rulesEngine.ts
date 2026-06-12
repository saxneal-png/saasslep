import { Establecimiento, Contrato, AsignacionAula } from './types';

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
