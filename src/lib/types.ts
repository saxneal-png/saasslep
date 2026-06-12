export interface Establecimiento {
  rbd: string; // Unique primary key
  nombre: string;
  ivm: number; // Índice de Vulnerabilidad Multidimensional (0 to 100)
  comuna: string;
  regimen: 'JEC' | 'No JEC';
}

export type CalidadJuridica = 'Titular' | 'Contrata';
export type EstadoContrato = 'Activo' | 'Licencia Médica' | 'Reemplazo';

export interface Funcionario {
  run: string; // Unique primary key (normalized)
  nombre: string;
  email?: string;
  telefono?: string;
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
}

export type OrigenFondo = 'Subvención Regular' | 'SEP' | 'PIE' | 'Reforzamiento' | 'Pro-retención' | 'Otro';

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
  tipo: 'descalce_horas' | 'discrepancia_funcion' | 'infraccion_ley_20903' | 'sobrecarga_horas';
  nivel_alerta: 'critica' | 'advertencia';
  mensaje: string;
  detalle: string;
  resuelta: boolean;
}
