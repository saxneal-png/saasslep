import { Establecimiento, Contrato, AsignacionAula, CargoPersonalizado, RegistroRemuneracion, Funcionario } from './types';

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
  asignaciones: AsignacionAula[],
  cargos: CargoPersonalizado[] = []
): ResultadoProporcionHoraria {
  // If replacement, it inherits the same, but let's check its own capacity.
  // If Licencia Médica, the contract's teaching workload is logically frozen (does not count towards this teacher).
  
  // Let's check if the assignments contain any 1° a 4° Básico courses
  const tieneCursosIvmEspecial = asignaciones.some(a => {
    const cName = (a.curso || '').toLowerCase();
    const is1To4 = cName.includes('1°') || cName.includes('2°') || cName.includes('3°') || cName.includes('4°') ||
                   cName.includes('1o') || cName.includes('2o') || cName.includes('3o') || cName.includes('4o');
    const isBasico = cName.includes('bás') || cName.includes('bas') || cName.includes('primaria');
    const isMedio = cName.includes('med') || cName.includes('sec');
    return is1To4 && isBasico && !isMedio;
  });

  // Calculate non-pedagogical hours from custom cargos assigned to this teacher
  const horasCargo = cargos
    .filter(c => c.funcionario_run === contrato.funcionario_run)
    .reduce((sum, c) => sum + c.horas, 0);

  // The contract hours that can be split under Ley 20.903 are the total minus directivas, técnicas, and custom cargo hours
  const horasEfectivasContrato = Math.max(0, contrato.horas_totales - (contrato.horas_directivas || 0) - (contrato.horas_tecnico_pedagogicas || 0) - horasCargo);

  const calculo = calcularLey20903(
    horasEfectivasContrato,
    establecimiento.ivm,
    tieneCursosIvmEspecial
  );

  // Set the total contract hours back on the calculation
  calculo.horasContrato = contrato.horas_totales;

  // If Licence, active teaching load is 0
  const horasLectivasAsignadas = contrato.estado === 'Licencia Médica' 
    ? 0 
    : asignaciones.reduce((sum, a) => sum + a.horas, 0);

  calculo.horasLectivasAsignadas = horasLectivasAsignadas;
  // Available hours to assign in classrooms
  calculo.horasDisponibles = parseFloat((calculo.horasLectivasMaximas - horasLectivasAsignadas).toFixed(2));
  
  // Validation check: cannot exceed max teaching hours and total assigned cannot exceed contract hours
  const cumpleProporcion = calculo.horasLectivasAsignadas <= calculo.horasLectivasMaximas + 0.01;
  const cumpleTotalContrato = (calculo.horasLectivasAsignadas + horasCargo) <= contrato.horas_totales + 0.01;
  calculo.cumpleLey20903 = cumpleProporcion && cumpleTotalContrato;

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

export function calcularHaberBaseEUS(grado: number): number {
  if (grado < 1 || grado > 24) return 0;
  const baseGrado24 = 380000; // base minimum salary for grade 24
  // Grado 1 is highest, Grado 24 is lowest. Exponential scale:
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
  const contrs = contratos.filter(c => c.funcionario_run === runNormalizado);
  const totalContratadas = contrs.reduce((sum, c) => sum + c.horas_totales, 0);

  const contrIds = contrs.map(c => c.id);
  const totalAula = asignaciones.filter(a => contrIds.includes(a.contrato_id)).reduce((sum, a) => sum + a.horas, 0);

  const remuns = remuneraciones.filter(r => r.funcionario_run === runNormalizado);
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
      // 1. Ley 20.903 Art 5 Cross-check
      // If any of the pay records for this user has aplica_ley_20903_art5 === 'Sí'
      const aplicaArt5 = remuns.some(r => r.aplica_ley_20903_art5 === 'Sí');
      if (aplicaArt5) {
        const totalComplementaria = remuns.reduce((sum, r) => sum + (r.planilla_complementaria_ley_20903 || 0), 0);
        if (totalComplementaria === 0) {
          discrepancia = true;
          mensaje = `Infracción Art. 5 Ley 20903: Indica que aplica pero Planilla Complementaria es $0.`;
        }
      }

      // 2. Leadership Allowance Checks
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
 * Calculates teacher workload reconciliation (horas_no_destinadas = contrato - (aula + proporcion_no_lectiva))
 */
export function calcularCargaDocente(
  funcionario: Funcionario,
  contratos: Contrato[],
  establecimientos: Establecimiento[],
  asignaciones: AsignacionAula[]
) {
  // Find all contracts for this teacher
  const teacherConts = contratos.filter(c => c.funcionario_run === funcionario.run);
  if (teacherConts.length === 0) {
    return {
      horasContrato: 0,
      horasAula: 0,
      horasNoLectivas: 0,
      horasNoDestinadas: 0
    };
  }

  let totalContrato = 0;
  let totalAula = 0;
  let totalNoLectiva = 0;

  teacherConts.forEach(c => {
    totalContrato += c.horas_totales;

    // Find establishment to get IVM
    const est = establecimientos.find(e => e.rbd === c.rbd);
    const ivm = est ? est.ivm : 80;

    // Find assignments for this contract
    const teacherAsigs = asignaciones.filter(a => a.contrato_id === c.id);
    const horasAula = teacherAsigs.reduce((sum, a) => sum + a.horas, 0);
    totalAula += horasAula;

    // Determine non-pedagogical proportion based on Ley 20903 rules
    const tieneCursosIvmEspecial = teacherAsigs.some(a => 
      a.curso.includes('1°') || a.curso.includes('2°') || a.curso.includes('3°') || a.curso.includes('4°')
    );
    const esEspecial = ivm > 80 && tieneCursosIvmEspecial;
    const proporcionNoLectiva = esEspecial ? 40 : 35;
    const noLectivaHours = parseFloat(((c.horas_totales * proporcionNoLectiva) / 100).toFixed(2));
    totalNoLectiva += noLectivaHours;
  });

  const horasNoDestinadas = parseFloat((totalContrato - (totalAula + totalNoLectiva)).toFixed(2));

  return {
    horasContrato: totalContrato,
    horasAula: totalAula,
    horasNoLectivas: totalNoLectiva,
    horasNoDestinadas: horasNoDestinadas > 0 ? horasNoDestinadas : 0
  };
}
