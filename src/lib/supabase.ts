import { 
  Establecimiento, 
  Funcionario, 
  Contrato, 
  FinanciamientoContrato, 
  AsignacionAula, 
  AlertaConciliacion,
  EstadoContrato
} from './types';

// Comunas in Diguillín/Valle Diguillín area: Bulnes, Chillán Viejo, El Carmen, Pemuco, San Ignacio, Yungay, Quillón
const COMUNAS = ['Bulnes', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'San Ignacio', 'Yungay', 'Quillón'];

const NOMBRES_ESCUELAS = [
  'Liceo Polivalente Manuel Bulnes',
  'Escuela E-250 San Ignacio',
  'Liceo Arturo Prat Chacón',
  'Escuela F-270 El Carmen',
  'Liceo Polivalente de Yungay',
  'Escuela D-120 Pemuco',
  'Colegio Héroes de la Concepción',
  'Escuela República de Italia',
  'Liceo Técnico Puente Ñuble',
  'Escuela Las Mercedes',
  'Centro Educacional Valle Diguillín',
  'Escuela Básica Tres Esquinas',
];

// Generates 131 realistic establishments for the territorial heatmap
function generarEstablecimientosMock(): Establecimiento[] {
  const lista: Establecimiento[] = [];
  
  // First, add the primary ones with distinct characteristics for testing
  const primarias: Establecimiento[] = [
    { rbd: '10201', nombre: 'Liceo Polivalente Manuel Bulnes', ivm: 85.4, comuna: 'Bulnes', regimen: 'JEC' },
    { rbd: '10202', nombre: 'Escuela E-250 San Ignacio (Altamente Vulnerable)', ivm: 92.1, comuna: 'San Ignacio', regimen: 'JEC' },
    { rbd: '10203', nombre: 'Liceo Arturo Prat Chacón (No JEC)', ivm: 78.5, comuna: 'Quillón', regimen: 'No JEC' },
    { rbd: '10204', nombre: 'Escuela F-270 El Carmen (Baja Vulnerabilidad)', ivm: 65.2, comuna: 'El Carmen', regimen: 'JEC' },
    { rbd: '10205', nombre: 'Liceo Polivalente de Yungay', ivm: 81.0, comuna: 'Yungay', regimen: 'JEC' },
    { rbd: '10206', nombre: 'Escuela D-120 Pemuco', ivm: 74.3, comuna: 'Pemuco', regimen: 'No JEC' },
  ];
  
  lista.push(...primarias);
  
  // Fill up to 131 establishments
  let currentRbd = 10207;
  for (let i = lista.length; i < 131; i++) {
    const comuna = COMUNAS[i % COMUNAS.length];
    const baseNombre = NOMBRES_ESCUELAS[i % NOMBRES_ESCUELAS.length];
    const rbdStr = String(currentRbd++);
    
    // Distribute IVM and regimen dynamically
    const ivm = Math.round((60 + Math.random() * 38) * 10) / 10; // 60% to 98%
    const regimen = Math.random() > 0.3 ? 'JEC' : 'No JEC';
    
    lista.push({
      rbd: rbdStr,
      nombre: `${baseNombre} N° ${i - 5}`,
      ivm,
      comuna,
      regimen
    });
  }
  
  return lista;
}

const FUNCIONARIOS_MOCK_INICIAL: Funcionario[] = [
  { run: '12.345.678-9', nombre: 'María Loreto González Soto', email: 'mgonzalez@slepvallediguillin.cl' },
  { run: '15.432.987-K', nombre: 'Carlos Andrés Muñoz Riquelme', email: 'cmunoz@slepvallediguillin.cl' },
  { run: '16.789.012-3', nombre: 'Ana Luisa Parra Valenzuela', email: 'aparra@slepvallediguillin.cl' },
  { run: '14.567.890-1', nombre: 'José Pedro Valdés Letelier', email: 'jvaldes@slepvallediguillin.cl' },
  { run: '18.901.234-5', nombre: 'Daniela Paz Contreras Sepúlveda', email: 'dcontreras@slepvallediguillin.cl' },
  { run: '10.876.543-2', nombre: 'Héctor Manuel Olivares Pinto', email: 'holivares@slepvallediguillin.cl' },
  { run: '17.654.321-0', nombre: 'Verónica Andrea Torres Castro', email: 'vtorres@slepvallediguillin.cl' },
];

const CONTRATOS_MOCK_INICIAL: Contrato[] = [
  { id: 'c1', funcionario_run: '12.345.678-9', rbd: '10201', calidad_juridica: 'Titular', funcion_principal: 'Docente de Aula', estado: 'Activo', horas_totales: 44 },
  { id: 'c2', funcionario_run: '15.432.987-K', rbd: '10202', calidad_juridica: 'Contrata', funcion_principal: 'Docente de Aula', estado: 'Activo', horas_totales: 38 },
  // Ana Parra is "Licencia Médica" in school 10202, allowing replacement assignments
  { id: 'c3', funcionario_run: '16.789.012-3', rbd: '10202', calidad_juridica: 'Titular', funcion_principal: 'Docente de Aula', estado: 'Licencia Médica', horas_totales: 44 },
  // Héctor Olivares is a replacement for Ana Parra (linked via vinculo_titular_id)
  { id: 'c4', funcionario_run: '10.876.543-2', rbd: '10202', calidad_juridica: 'Contrata', funcion_principal: 'Docente de Aula', estado: 'Reemplazo', horas_totales: 44, vinculo_titular_id: 'c3' },
  // Itinerancia: Carlos Muñoz also teaches in 10201 (10 hours, totals 38 in 10202 and 10 in 10201)
  { id: 'c5', funcionario_run: '15.432.987-K', rbd: '10201', calidad_juridica: 'Contrata', funcion_principal: 'Docente de Aula', estado: 'Activo', horas_totales: 10 },
  // Verónica Torres is Active in 10204 (Baja Vulnerabilidad)
  { id: 'c6', funcionario_run: '17.654.321-0', rbd: '10204', calidad_juridica: 'Titular', funcion_principal: 'Docente de Aula', estado: 'Activo', horas_totales: 44 }
];

const FINANCIAMIENTOS_MOCK_INICIAL: FinanciamientoContrato[] = [
  { id: 'f1', contrato_id: 'c1', origen_fondo: 'Subvención Regular', horas: 30 },
  { id: 'f2', contrato_id: 'c1', origen_fondo: 'SEP', horas: 14 },
  { id: 'f3', contrato_id: 'c2', origen_fondo: 'PIE', horas: 38 },
  { id: 'f4', contrato_id: 'c3', origen_fondo: 'Subvención Regular', horas: 44 },
  { id: 'f5', contrato_id: 'c4', origen_fondo: 'Subvención Regular', horas: 44 },
  { id: 'f6', contrato_id: 'c5', origen_fondo: 'SEP', horas: 10 },
  { id: 'f7', contrato_id: 'c6', origen_fondo: 'Subvención Regular', horas: 44 }
];

// Classroom assignments for courses
const ASIGNACIONES_MOCK_INICIAL: AsignacionAula[] = [
  { id: 'a1', contrato_id: 'c1', curso: '7° Básico A', asignatura: 'Lenguaje y Comunicación', horas: 6 },
  { id: 'a2', contrato_id: 'c1', curso: '8° Básico A', asignatura: 'Lenguaje y Comunicación', horas: 6 },
  { id: 'a3', contrato_id: 'c1', curso: '1° Medio A', asignatura: 'Lenguaje y Comunicación', horas: 5 },
  // c2 teaches in 10202 (38 hours contract, JEC, IVM 92.1% so if elementary 60/40, but c2 is teaching 3° Básico A math: special ley 20903 applies)
  { id: 'a4', contrato_id: 'c2', curso: '3° Básico A', asignatura: 'Matemática', horas: 8 },
  { id: 'a5', contrato_id: 'c2', curso: '4° Básico A', asignatura: 'Matemática', horas: 8 },
];

const ALERTAS_MOCK_INICIAL: AlertaConciliacion[] = [
  {
    id: 'al1',
    run: '15.432.987-K',
    nombre_funcionario: 'Carlos Andrés Muñoz Riquelme',
    rbd: '10201',
    tipo: 'descalce_horas',
    nivel_alerta: 'critica',
    mensaje: 'Descalce financiero en contrato',
    detalle: 'El contrato estipula 10 horas totales, pero la suma de subvenciones asignadas es 0. Requiere conciliación.',
    resuelta: false
  }
];

class DatabaseLocal {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    const item = localStorage.getItem(`slep_db_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  }

  private setStorageItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`slep_db_${key}`, JSON.stringify(value));
  }

  get establecimientos(): Establecimiento[] {
    return this.getStorageItem('establecimientos', generarEstablecimientosMock());
  }

  get funcionarios(): Funcionario[] {
    return this.getStorageItem('funcionarios', FUNCIONARIOS_MOCK_INICIAL);
  }

  set funcionarios(val: Funcionario[]) {
    this.setStorageItem('funcionarios', val);
  }

  get contratos(): Contrato[] {
    return this.getStorageItem('contratos', CONTRATOS_MOCK_INICIAL);
  }

  set contratos(val: Contrato[]) {
    this.setStorageItem('contratos', val);
  }

  get financiamientoContratos(): FinanciamientoContrato[] {
    return this.getStorageItem('financiamientos', FINANCIAMIENTOS_MOCK_INICIAL);
  }

  set financiamientoContratos(val: FinanciamientoContrato[]) {
    this.setStorageItem('financiamientos', val);
  }

  get asignacionesAula(): AsignacionAula[] {
    return this.getStorageItem('asignaciones', ASIGNACIONES_MOCK_INICIAL);
  }

  set asignacionesAula(val: AsignacionAula[]) {
    this.setStorageItem('asignaciones', val);
  }

  get alertas(): AlertaConciliacion[] {
    return this.getStorageItem('alertas', ALERTAS_MOCK_INICIAL);
  }

  set alertas(val: AlertaConciliacion[]) {
    this.setStorageItem('alertas', val);
  }
}

export const dbLocal = new DatabaseLocal();

// API interfaces to query local DB or Supabase in the future
export const api = {
  getEstablecimientos: async (): Promise<Establecimiento[]> => {
    return dbLocal.establecimientos;
  },

  getEstablecimientoByRbd: async (rbd: string): Promise<Establecimiento | undefined> => {
    return dbLocal.establecimientos.find(e => e.rbd === rbd);
  },

  getFuncionarios: async (): Promise<Funcionario[]> => {
    return dbLocal.funcionarios;
  },

  getContratos: async (rbd?: string): Promise<Contrato[]> => {
    const contratos = dbLocal.contratos;
    return rbd ? contratos.filter(c => c.rbd === rbd) : contratos;
  },

  getFinanciamientosPorContrato: async (contratoId: string): Promise<FinanciamientoContrato[]> => {
    return dbLocal.financiamientoContratos.filter(f => f.contrato_id === contratoId);
  },

  getAsignacionesPorEstablecimiento: async (rbd: string): Promise<AsignacionAula[]> => {
    const contratos = dbLocal.contratos.filter(c => c.rbd === rbd);
    const contratoIds = contratos.map(c => c.id);
    return dbLocal.asignacionesAula.filter(a => contratoIds.includes(a.contrato_id));
  },

  getAlertas: async (rbd?: string): Promise<AlertaConciliacion[]> => {
    const alertas = dbLocal.alertas;
    return rbd ? alertas.filter(a => a.rbd === rbd) : alertas;
  },

  upsertFuncionario: async (funcionario: Funcionario): Promise<void> => {
    const funcionarios = dbLocal.funcionarios;
    const index = funcionarios.findIndex(f => f.run === funcionario.run);
    if (index >= 0) {
      funcionarios[index] = funcionario;
    } else {
      funcionarios.push(funcionario);
    }
    dbLocal.funcionarios = funcionarios;
  },

  upsertContratoCompleto: async (
    contrato: Contrato, 
    financiamientos: FinanciamientoContrato[]
  ): Promise<void> => {
    // Save Contract
    const contratos = dbLocal.contratos;
    const cIndex = contratos.findIndex(c => c.id === contrato.id);
    if (cIndex >= 0) {
      contratos[cIndex] = contrato;
    } else {
      contratos.push(contrato);
    }
    dbLocal.contratos = contratos;

    // Save Financiamientos
    let finList = dbLocal.financiamientoContratos.filter(f => f.contrato_id !== contrato.id);
    finList.push(...financiamientos);
    dbLocal.financiamientoContratos = finList;
  },

  updateContratoEstado: async (
    contratoId: string, 
    estado: EstadoContrato, 
    vinculoTitularId: string | null = null
  ): Promise<void> => {
    const contratos = dbLocal.contratos;
    const idx = contratos.findIndex(c => c.id === contratoId);
    if (idx >= 0) {
      contratos[idx].estado = estado;
      contratos[idx].vinculo_titular_id = vinculoTitularId;
      dbLocal.contratos = contratos;

      // Rule: If Licence, freeze academic load (we will manage this dynamically in rulesEngine but we can save changes)
      if (estado === 'Licencia Médica') {
        // Logically freeze classroom hours (we keep asignaciones but rule engine tags them)
      }
    }
  },

  saveAsignacion: async (asignacion: AsignacionAula): Promise<void> => {
    const asignaciones = dbLocal.asignacionesAula;
    const idx = asignaciones.findIndex(a => a.id === asignacion.id);
    if (idx >= 0) {
      asignaciones[idx] = asignacion;
    } else {
      asignaciones.push(asignacion);
    }
    dbLocal.asignacionesAula = asignaciones;
  },

  deleteAsignacion: async (id: string): Promise<void> => {
    dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => a.id !== id);
  },

  crearAlerta: async (alerta: AlertaConciliacion): Promise<void> => {
    const alertas = dbLocal.alertas;
    if (!alertas.some(a => a.id === alerta.id)) {
      alertas.push(alerta);
      dbLocal.alertas = alertas;
    }
  },

  resolverAlerta: async (alertaId: string): Promise<void> => {
    const alertas = dbLocal.alertas;
    const idx = alertas.findIndex(a => a.id === alertaId);
    if (idx >= 0) {
      alertas[idx].resuelta = true;
      dbLocal.alertas = alertas;
    }
  },

  limpiarAlertasPorRbd: async (rbd: string): Promise<void> => {
    dbLocal.alertas = dbLocal.alertas.filter(a => a.rbd !== rbd || a.resuelta);
  }
};
