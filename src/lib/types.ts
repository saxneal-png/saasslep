export interface Establecimiento {
  rbd: string; // Unique primary key
  nombre: string;
  ivm: number; // Índice de Vulnerabilidad Multidimensional (0 to 100)
  comuna: string;
  regimen: 'JEC' | 'No JEC';
}

export type CalidadJuridica = 'Titular' | 'A contrata' | 'Plazo fijo' | 'Indefinido' | 'Reemplazo' | 'Habilitación especial';
export type EstadoContrato = 'Activo' | 'Licencia Médica' | 'Reemplazo' | 'Pendiente_Aprobacion';
export type EstamentoType = 'Docente' | 'Asistente de la Educación';
export type LegislacionLaboral = 'Estatuto docente' | 'Asistentes de la educación';

export type GrupoEstamento = 'P01_Administrativo' | 'P02_Educacion';

export interface Funcionario {
  run: string; // Unique primary key (normalized)
  nombre: string;
  email?: string;
  telefono?: string;
  estamento?: EstamentoType; // Docente or Asistente
  cargo?: string; // Specific role, e.g. Docente Aula, Auxiliar, Psicopedagogo
  titulo?: string; // Professional title or degree
  grupo_estamento?: GrupoEstamento;
  calidad_juridica_p01?: 'Planta' | 'Contrata';
  escalafon_p01?: 'Directivo' | 'Profesional' | 'Técnico' | 'Administrativo' | 'Auxiliar';
  grado_eus?: number;
  genero?: string;
  fecha_nacimiento?: string;
}

export interface Contrato {
  id: string; // UUID
  funcionario_run: string;
  rbd: string;
  calidad_juridica: CalidadJuridica;
  funcion_principal: string;
  estado: EstadoContrato;
  horas_totales: number;
  vinculo_titular_id?: string | null; // For replacements to link to titular contracts
  dias_trabajados?: number;
  dias_licencia_medica?: number;
  inasistencias?: number;
  legislacion_laboral?: LegislacionLaboral;
  horas_directivas?: number;
  horas_aula?: number;
  horas_tecnico_pedagogicas?: number;
  fecha_inicio_licencia?: string;
  fecha_termino_licencia?: string;
}

export type OrigenFondo = 'Subvención Regular' | 'SEP' | 'PIE' | 'Reforzamiento' | 'Pro-retención' | 'Liceos Bicentenarios' | 'Otro';

export interface FinanciamientoContrato {
  id: string; // UUID
  contrato_id: string;
  origen_fondo: OrigenFondo;
  horas: number;
}

export interface AsignacionAula {
  id: string; // UUID
  contrato_id: string;
  curso: string; // e.g. '3° Básico A'
  asignatura: string; // e.g. 'Matemática'
  horas: number;
}

export interface AlertaConciliacion {
  id: string;
  run: string;
  nombre_funcionario: string;
  rbd: string;
  tipo: 'descalce_horas' | 'discrepancia_funcion' | 'infraccion_ley_20903' | 'sobrecarga_horas' | 'descalce_pie';
  nivel_alerta: 'critica' | 'advertencia';
  mensaje: string;
  detalle: string;
  resuelta: boolean;
}

// RBAC 3-roles definitions
export type UserRole = 'sostenedor_maestro' | 'profesional_slep' | 'director_escuela';

export interface ProfesionalEscuelaAsignada {
  profesional_run: string;
  establecimiento_rbd: string;
}

export interface CursoDinamico {
  rbd: string;
  nombre: string; // e.g. '3° Básico A'
  nivel: string; // e.g. '1° a 4° Básico'
  regimen: 'JEC' | 'No JEC';
  horasPIE?: number;
  profesor_jefe_run?: string;
}

export interface AsignaturaDinamica {
  rbd: string;
  cursoNombre: string;
  nombre: string;
  horasSugeridas: number;
}

// Advanced custom roles
export interface CargoPersonalizado {
  id: string;
  rbd: string;
  nombre: string; // e.g. "Encargado de Convivencia Escolar"
  horas: number;
  funcionario_run: string;
  origen_fondo: OrigenFondo; // Must associate to a specific subvention
}

// Standard Study Plan managed by Sostenedor
export interface PlanEstudioNorm {
  nivel: string;
  regimen: 'JEC' | 'No JEC';
  horasObligatorias: number;
  horasPIEReglamentarias: number; // Regulatory co-teaching/support hours required (e.g. 10 hrs per course)
  asignaturasBase: { nombre: string; horasSugeridas: number }[];
}

export interface Supervisor {
  run: string;
  nombre: string;
  email: string;
}

export interface RegistroRemuneracion {
  id: string;
  funcionario_run: string;
  nombre_esta?: string;
  horas_pagadas: number;
  total_haberes: number;
  mes_pago: string; // e.g. "2026-06"
  grupo_estamento: GrupoEstamento;
  dias_trabajados?: number;
  dias_licencia_medica?: number;
  inasistencias?: number;
  aplica_ley_20903_art5?: 'Sí' | 'No';
  planilla_complementaria_ley_20903?: number;
  asignacion_res_director?: number;
  asignacion_resp_tec_ped?: number;
}

export interface TareaReemplazo {
  id: string;
  rbd: string;
  funcionario_titular_run: string;
  funcionario_titular_nombre: string;
  horas_a_cubrir: number;
  estado: 'Pendiente' | 'Asignado';
  reemplazo_run?: string;
}

export const CARGOS_DOCENTES_LIST = [
  'DOCENTE DE AULA',
  'DOCENTE DIFERENCIAL',
  'DIRECTOR/A',
  'JEFE/A UTP',
  'DOCENTE ENCARGADO',
  'EDUCADORA DE PARVULOS',
  'INSPECTOR/A GENERAL',
  'DOCENTE TECNICO',
  'COORDINADOR/A PIE',
  'ORIENTADOR/A',
  'ENCARGADO/A DE CONVIVENCIA',
  'OTRO'
] as const;

export type CargoDocenteType = typeof CARGOS_DOCENTES_LIST[number];

export function normalizarCargoDocente(rawCargo: string): string {
  if (!rawCargo) return 'DOCENTE DE AULA';
  const clean = rawCargo.trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents
  
  if (clean.includes("DOCENTE DE AULA") || clean.includes("AULA") || clean.includes("DOCENTE AULA") || clean.includes("PROFESOR DE AULA") || clean.includes("DOCENTE BASICA") || clean.includes("DOCENTE MEDIA")) {
    return "DOCENTE DE AULA";
  }
  if (clean.includes("DOCENTE DIFERENCIAL") || clean.includes("DIFERENCIAL") || clean.includes("PSICOPEDAGOGO") || clean.includes("EDUCADORA DIFERENCIAL") || clean.includes("PSICOPEDAGOGA")) {
    return "DOCENTE DIFERENCIAL";
  }
  if (clean.includes("DIRECTOR") || clean.includes("DIRECTORA")) {
    return "DIRECTOR/A";
  }
  if (clean.includes("JEFE UTP") || clean.includes("JEFE/A UTP") || clean.includes("JEFA UTP") || clean.includes("JEFE DE UTP") || clean.includes("JEFE U.T.P.") || clean.includes("UTP")) {
    return "JEFE/A UTP";
  }
  if (clean.includes("DOCENTE ENCARGADO") || (clean.includes("ENCARGADO") && clean.includes("DOCENTE"))) {
    return "DOCENTE ENCARGADO";
  }
  if (clean.includes("PARVULO") || clean.includes("EDUCADORA DE PARVULOS") || clean.includes("EDUCADORA PARVULO")) {
    return "EDUCADORA DE PARVULOS";
  }
  if (clean.includes("INSPECTOR GENERAL") || clean.includes("INSPECTOR/A GENERAL") || clean.includes("INSPECTORA GENERAL")) {
    return "INSPECTOR/A GENERAL";
  }
  if (clean.includes("DOCENTE TECNICO") || clean.includes("TECNICO") || clean.includes("TECNICA")) {
    return "DOCENTE TECNICO";
  }
  if (clean.includes("COORDINADOR PIE") || clean.includes("COORDINADOR/A PIE") || (clean.includes("PIE") && clean.includes("COORDINAD"))) {
    return "COORDINADOR/A PIE";
  }
  if (clean.includes("ORIENTADOR") || clean.includes("ORIENTADORA")) {
    return "ORIENTADOR/A";
  }
  if (clean.includes("CONVIVENCIA") || clean.includes("CONVIVENCIA ESCOLAR") || clean.includes("ENCARGADO DE CONVIVENCIA") || clean.includes("ENCARGADA DE CONVIVENCIA")) {
    return "ENCARGADO/A DE CONVIVENCIA";
  }
  
  // Return the original clean uppercase version if it doesn't match, or return rawCargo
  return rawCargo;
}

export interface ReemplazoDetalle {
  id: string;
  contrato_titular_id: string;
  reemplazo_run: string;
  reemplazo_nombre: string;
  rbd: string;
  horas: number;
  fecha_inicio: string;
  fecha_termino: string;
}
