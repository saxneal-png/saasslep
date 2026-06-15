import { 
  Establecimiento, 
  Funcionario, 
  Contrato, 
  FinanciamientoContrato, 
  AsignacionAula, 
  AlertaConciliacion,
  EstadoContrato,
  ProfesionalEscuelaAsignada,
  CursoDinamico,
  AsignaturaDinamica,
  CargoPersonalizado,
  PlanEstudioNorm,
  Supervisor,
  RegistroRemuneracion,
  TareaReemplazo,
  ReemplazoDetalle
} from './types';

// Comunas in Diguillín/Valle Diguillín area
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

// Default MINEDUC decrees
export const DECRETOS_MINEDUC_INICIAL: PlanEstudioNorm[] = [
  {
    nivel: '1° a 4° Básico',
    regimen: 'JEC',
    horasObligatorias: 38,
    horasPIEReglamentarias: 10,
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
    horasPIEReglamentarias: 8,
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
    horasPIEReglamentarias: 10,
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
    horasPIEReglamentarias: 6,
    asignaturasBase: [
      { nombre: 'Ámbito Desarrollo Personal y Social', horasSugeridas: 10 },
      { nombre: 'Ámbito Comunicación Integral', horasSugeridas: 10 },
      { nombre: 'Ámbito Relación con el Medio Natural y Cultural', horasSugeridas: 10 }
    ]
  }
];

function generarEstablecimientosMock(): Establecimiento[] {
  const lista: Establecimiento[] = [
    { rbd: '10201', nombre: 'Liceo Polivalente Manuel Bulnes', ivm: 85.4, comuna: 'Bulnes', regimen: 'JEC' },
    { rbd: '10202', nombre: 'Escuela E-250 San Ignacio (Altamente Vulnerable)', ivm: 92.1, comuna: 'San Ignacio', regimen: 'JEC' },
    { rbd: '10203', nombre: 'Liceo Arturo Prat Chacón (No JEC)', ivm: 78.5, comuna: 'Quillón', regimen: 'No JEC' },
    { rbd: '10204', nombre: 'Escuela F-270 El Carmen (Baja Vulnerabilidad)', ivm: 65.2, comuna: 'El Carmen', regimen: 'JEC' },
    { rbd: '10205', nombre: 'Liceo Polivalente de Yungay', ivm: 81.0, comuna: 'Yungay', regimen: 'JEC' },
    { rbd: '10206', nombre: 'Escuela D-120 Pemuco', ivm: 74.3, comuna: 'Pemuco', regimen: 'No JEC' },
  ];
  
  let currentRbd = 10207;
  for (let i = lista.length; i < 131; i++) {
    const comuna = COMUNAS[i % COMUNAS.length];
    const baseNombre = NOMBRES_ESCUELAS[i % NOMBRES_ESCUELAS.length];
    const rbdStr = String(currentRbd++);
    const ivm = Math.round((60 + Math.random() * 38) * 10) / 10;
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
  { run: '12.345.678-9', nombre: 'María Loreto González Soto', email: 'mgonzalez@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Docente de Aula' },
  { run: '15.432.987-K', nombre: 'Carlos Andrés Muñoz Riquelme', email: 'cmunoz@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Docente de Aula' },
  { run: '16.789.012-3', nombre: 'Ana Luisa Parra Valenzuela', email: 'aparra@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Docente PIE' },
  { run: '14.567.890-1', nombre: 'José Pedro Valdés Letelier', email: 'jvaldes@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Coordinador UTP' },
  { run: '18.901.234-5', nombre: 'Daniela Paz Contreras Sepúlveda', email: 'dcontreras@slepvallediguillin.cl', estamento: 'Asistente de la Educación', cargo: 'Psicóloga' },
  { run: '10.876.543-2', nombre: 'Héctor Manuel Olivares Pinto', email: 'holivares@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Docente de Aula' },
  { run: '17.654.321-0', nombre: 'Verónica Andrea Torres Castro', email: 'vtorres@slepvallediguillin.cl', estamento: 'Asistente de la Educación', cargo: 'Auxiliar de Servicios' },
  // Asesores
  { run: '11.111.111-1', nombre: 'Asesor Técnico UATP Diguillín', email: 'supervisor1@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Asesor UATP' },
  { run: '22.222.222-2', nombre: 'Evaluadora Curricular SLEP', email: 'evaluadora2@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Asesor UATP' },
];

const SUPERVISORES_INICIAL: Supervisor[] = [
  { run: '11.111.111-1', nombre: 'Asesor Técnico UATP Diguillín', email: 'supervisor1@slepvallediguillin.cl' },
  { run: '22.222.222-2', nombre: 'Evaluadora Curricular SLEP', email: 'evaluadora2@slepvallediguillin.cl' }
];

const CONTRATOS_MOCK_INICIAL: Contrato[] = [
  { id: 'c1', funcionario_run: '12.345.678-9', rbd: '10201', calidad_juridica: 'Titular', funcion_principal: 'Docente de Aula', estado: 'Activo', horas_totales: 44 },
  { id: 'c2', funcionario_run: '15.432.987-K', rbd: '10202', calidad_juridica: 'A contrata', funcion_principal: 'Docente de Aula', estado: 'Activo', horas_totales: 38 },
  { id: 'c3', funcionario_run: '16.789.012-3', rbd: '10202', calidad_juridica: 'Titular', funcion_principal: 'Docente PIE', estado: 'Licencia Médica', horas_totales: 44 },
  { id: 'c4', funcionario_run: '10.876.543-2', rbd: '10202', calidad_juridica: 'A contrata', funcion_principal: 'Docente de Aula', estado: 'Reemplazo', horas_totales: 44, vinculo_titular_id: 'c3' },
  { id: 'c5', funcionario_run: '15.432.987-K', rbd: '10201', calidad_juridica: 'A contrata', funcion_principal: 'Docente de Aula', estado: 'Activo', horas_totales: 10 },
  { id: 'c6', funcionario_run: '17.654.321-0', rbd: '10204', calidad_juridica: 'Titular', funcion_principal: 'Auxiliar de Servicios', estado: 'Activo', horas_totales: 44 }
];

const FINANCIAMIENTOS_MOCK_INICIAL: FinanciamientoContrato[] = [
  { id: 'f1', contrato_id: 'c1', origen_fondo: 'Subvención Regular', horas: 30 },
  { id: 'f2', contrato_id: 'c1', origen_fondo: 'SEP', horas: 14 },
  { id: 'f3', contrato_id: 'c2', origen_fondo: 'PIE', horas: 38 },
  { id: 'f4', contrato_id: 'c3', origen_fondo: 'PIE', horas: 44 },
  { id: 'f5', contrato_id: 'c4', origen_fondo: 'PIE', horas: 44 },
  { id: 'f6', contrato_id: 'c5', origen_fondo: 'SEP', horas: 10 },
  { id: 'f7', contrato_id: 'c6', origen_fondo: 'Subvención Regular', horas: 44 }
];

const ASIGNACIONES_MOCK_INICIAL: AsignacionAula[] = [
  { id: 'a1', contrato_id: 'c1', curso: '7° Básico A', asignatura: 'Lenguaje y Comunicación', horas: 6 },
  { id: 'a2', contrato_id: 'c1', curso: '8° Básico A', asignatura: 'Lenguaje y Comunicación', horas: 6 },
  { id: 'a3', contrato_id: 'c1', curso: '1° Medio A', asignatura: 'Lenguaje y Comunicación', horas: 5 },
  { id: 'a4', contrato_id: 'c2', curso: '3° Básico A', asignatura: 'Matemática', horas: 8 },
  { id: 'a5', contrato_id: 'c2', curso: '4° Básico A', asignatura: 'Matemática', horas: 8 },
];

const TUTELAS_INICIAL: ProfesionalEscuelaAsignada[] = [
  { profesional_run: '11.111.111-1', establecimiento_rbd: '10202' },
  { profesional_run: '11.111.111-1', establecimiento_rbd: '10204' },
];

const ALERTAS_MOCK_INICIAL: AlertaConciliacion[] = [
  {
    id: 'al1',
    run: '12.345.678-9',
    nombre_funcionario: 'María Loreto González Soto',
    rbd: '10201',
    tipo: 'descalce_horas',
    nivel_alerta: 'advertencia',
    mensaje: 'Horas contratadas no coinciden con horas asignadas',
    detalle: 'Contratada por 44 horas, pero tiene asignadas 17 horas lectivas en aula y requiere completar sus horas.',
    resuelta: false
  },
  {
    id: 'al2',
    run: '15.432.987-K',
    nombre_funcionario: 'Carlos Andrés Muñoz Riquelme',
    rbd: '10202',
    tipo: 'sobrecarga_horas',
    nivel_alerta: 'critica',
    mensaje: 'Funcionario excede el límite máximo de horas contratadas en el territorio',
    detalle: 'Registra un contrato de 38 horas en Escuela E-250 y otro contrato de 10 horas en Liceo Manuel Bulnes (Total: 48 horas, supera el límite legal de 44 horas).',
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

  set establecimientos(val: Establecimiento[]) {
    this.setStorageItem('establecimientos', val);
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

  get tutelas(): ProfesionalEscuelaAsignada[] {
    return this.getStorageItem('tutelas', TUTELAS_INICIAL);
  }

  set tutelas(val: ProfesionalEscuelaAsignada[]) {
    this.setStorageItem('tutelas', val);
  }

  get cursosDinamicos(): CursoDinamico[] {
    return this.getStorageItem('cursos_dinamicos', [
      { rbd: '10202', nombre: '3° Básico A', nivel: '1° a 4° Básico', regimen: 'JEC' },
      { rbd: '10202', nombre: '4° Básico A', nivel: '1° a 4° Básico', regimen: 'JEC' },
    ]);
  }

  set cursosDinamicos(val: CursoDinamico[]) {
    this.setStorageItem('cursos_dinamicos', val);
  }

  get asignaturasDinamicas(): AsignaturaDinamica[] {
    return this.getStorageItem('asignaturas_dinamicas', []);
  }

  set asignaturasDinamicas(val: AsignaturaDinamica[]) {
    this.setStorageItem('asignaturas_dinamicas', val);
  }

  get supervisores(): Supervisor[] {
    return this.getStorageItem('supervisores', SUPERVISORES_INICIAL);
  }

  set supervisores(val: Supervisor[]) {
    this.setStorageItem('supervisores', val);
  }

  get cargosPersonalizados(): CargoPersonalizado[] {
    return this.getStorageItem('cargos_personalizados', []);
  }

  set cargosPersonalizados(val: CargoPersonalizado[]) {
    this.setStorageItem('cargos_personalizados', val);
  }

  get planesEstudio(): PlanEstudioNorm[] {
    return this.getStorageItem('planes_estudio_json', DECRETOS_MINEDUC_INICIAL);
  }

  set planesEstudio(val: PlanEstudioNorm[]) {
    this.setStorageItem('planes_estudio_json', val);
  }

  get comunas(): string[] {
    return this.getStorageItem('comunas', ['Bulnes', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'San Ignacio', 'Yungay', 'Quillón']);
  }

  set comunas(val: string[]) {
    this.setStorageItem('comunas', val);
  }

  get libroRemuneraciones(): RegistroRemuneracion[] {
    return this.getStorageItem('libro_remuneraciones', []);
  }

  set libroRemuneraciones(val: RegistroRemuneracion[]) {
    this.setStorageItem('libro_remuneraciones', val);
  }

  get tareasReemplazo(): TareaReemplazo[] {
    return this.getStorageItem('tareas_reemplazo', []);
  }

  set tareasReemplazo(val: TareaReemplazo[]) {
    this.setStorageItem('tareas_reemplazo', val);
  }

  get reemplazosLicencias(): ReemplazoDetalle[] {
    return this.getStorageItem('reemplazos_licencias', []);
  }

  set reemplazosLicencias(val: ReemplazoDetalle[]) {
    this.setStorageItem('reemplazos_licencias', val);
  }
}

export const dbLocal = new DatabaseLocal();

export const api = {
  getEstablecimientos: async (): Promise<Establecimiento[]> => {
    return dbLocal.establecimientos;
  },

  getEstablecimientoByRbd: async (rbd: string): Promise<Establecimiento | undefined> => {
    return dbLocal.establecimientos.find(e => e.rbd === rbd);
  },

  upsertEstablecimiento: async (est: Establecimiento): Promise<void> => {
    const list = dbLocal.establecimientos;
    const idx = list.findIndex(e => e.rbd === est.rbd);
    if (idx >= 0) {
      list[idx] = est;
    } else {
      list.push(est);
    }
    dbLocal.establecimientos = list;
  },

  deleteEstablecimiento: async (rbd: string): Promise<void> => {
    dbLocal.establecimientos = dbLocal.establecimientos.filter(e => e.rbd !== rbd);
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
      funcionarios[index] = { ...funcionarios[index], ...funcionario };
    } else {
      funcionarios.push(funcionario);
    }
    dbLocal.funcionarios = funcionarios;
  },

  deleteFuncionario: async (run: string): Promise<void> => {
    dbLocal.funcionarios = dbLocal.funcionarios.filter(f => f.run !== run);
  },

  upsertContratoCompleto: async (
    contrato: Contrato, 
    financiamientos: FinanciamientoContrato[]
  ): Promise<void> => {
    const contratos = dbLocal.contratos;
    const cIndex = contratos.findIndex(c => c.id === contrato.id);
    if (cIndex >= 0) {
      contratos[cIndex] = contrato;
    } else {
      contratos.push(contrato);
    }
    dbLocal.contratos = contratos;

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
    }
  },

  deleteContrato: async (contratoId: string): Promise<void> => {
    dbLocal.contratos = dbLocal.contratos.filter(c => c.id !== contratoId);
    dbLocal.financiamientoContratos = dbLocal.financiamientoContratos.filter(f => f.contrato_id !== contratoId);
    dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => a.contrato_id !== contratoId);
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
  },

  // Tutelas/Asignaciones de Escuelas a Profesionales SLEP
  getTutelasPorProfesional: async (profesionalRun: string): Promise<string[]> => {
    const list = dbLocal.tutelas;
    return list
      .filter(t => t.profesional_run === profesionalRun)
      .map(t => t.establecimiento_rbd);
  },

  getTodasLasTutelas: async (): Promise<ProfesionalEscuelaAsignada[]> => {
    return dbLocal.tutelas;
  },

  asignarEscuelaAProfesional: async (profesionalRun: string, rbd: string): Promise<void> => {
    const list = dbLocal.tutelas;
    if (!list.some(t => t.profesional_run === profesionalRun && t.establecimiento_rbd === rbd)) {
      list.push({ profesional_run: profesionalRun, establecimiento_rbd: rbd });
      dbLocal.tutelas = list;
    }
  },

  removerEscuelaDeProfesional: async (profesionalRun: string, rbd: string): Promise<void> => {
    let list = dbLocal.tutelas;
    list = list.filter(t => !(t.profesional_run === profesionalRun && t.establecimiento_rbd === rbd));
    dbLocal.tutelas = list;
  },

  // Cursos Dinámicos por Escuela (Director)
  getCursosDinamicos: async (rbd: string): Promise<CursoDinamico[]> => {
    return dbLocal.cursosDinamicos.filter(c => c.rbd === rbd);
  },

  crearCursoDinamico: async (curso: CursoDinamico): Promise<void> => {
    const list = dbLocal.cursosDinamicos;
    const index = list.findIndex(c => c.rbd === curso.rbd && c.nombre === curso.nombre);
    if (index >= 0) {
      list[index] = curso;
    } else {
      list.push(curso);
    }
    dbLocal.cursosDinamicos = list;
  },

  eliminarCursoDinamico: async (rbd: string, nombre: string): Promise<void> => {
    dbLocal.cursosDinamicos = dbLocal.cursosDinamicos.filter(c => !(c.rbd === rbd && c.nombre === nombre));
    dbLocal.asignaturasDinamicas = dbLocal.asignaturasDinamicas.filter(a => !(a.rbd === rbd && a.cursoNombre === nombre));
    // Optionally clean assignments associated with this course name under this rbd
    const conts = dbLocal.contratos.filter(c => c.rbd === rbd);
    const contIds = conts.map(c => c.id);
    dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => !(a.curso === nombre && contIds.includes(a.contrato_id)));
  },

  // Asignaturas Dinámicas por Escuela/Curso
  getAsignaturasDinamicas: async (rbd: string, cursoNombre: string): Promise<AsignaturaDinamica[]> => {
    return dbLocal.asignaturasDinamicas.filter(a => a.rbd === rbd && a.cursoNombre === cursoNombre);
  },

  crearAsignaturaDinamica: async (asignatura: AsignaturaDinamica): Promise<void> => {
    const list = dbLocal.asignaturasDinamicas;
    if (!list.some(a => a.rbd === asignatura.rbd && a.cursoNombre === asignatura.cursoNombre && a.nombre === asignatura.nombre)) {
      list.push(asignatura);
      dbLocal.asignaturasDinamicas = list;
    }
  },

  // Supervisors (Profesionales SLEP) CRUD
  getSupervisores: async (): Promise<Supervisor[]> => {
    return dbLocal.supervisores;
  },

  upsertSupervisor: async (sup: Supervisor): Promise<void> => {
    const list = dbLocal.supervisores;
    const idx = list.findIndex(s => s.run === sup.run);
    if (idx >= 0) {
      list[idx] = sup;
    } else {
      list.push(sup);
    }
    dbLocal.supervisores = list;

    // Sync to master funcionarios as well
    await api.upsertFuncionario({
      run: sup.run,
      nombre: sup.nombre,
      email: sup.email,
      estamento: 'Docente',
      cargo: 'Asesor UATP'
    });
  },

  deleteSupervisor: async (run: string): Promise<void> => {
    dbLocal.supervisores = dbLocal.supervisores.filter(s => s.run !== run);
    dbLocal.tutelas = dbLocal.tutelas.filter(t => t.profesional_run !== run);
    await api.deleteFuncionario(run);
  },

  // Cargos Personalizados CRUD
  getCargosPorEstablecimiento: async (rbd: string): Promise<CargoPersonalizado[]> => {
    return dbLocal.cargosPersonalizados.filter(c => c.rbd === rbd);
  },

  crearCargoPersonalizado: async (cargo: CargoPersonalizado): Promise<void> => {
    const list = dbLocal.cargosPersonalizados;
    list.push(cargo);
    dbLocal.cargosPersonalizados = list;
  },

  removerCargoPersonalizado: async (id: string): Promise<void> => {
    dbLocal.cargosPersonalizados = dbLocal.cargosPersonalizados.filter(c => c.id !== id);
  },

  // Planes de estudio JSON (Gobernanza del Sostenedor)
  getPlanesEstudio: async (): Promise<PlanEstudioNorm[]> => {
    return dbLocal.planesEstudio;
  },

  guardarPlanesEstudio: async (planes: PlanEstudioNorm[]): Promise<void> => {
    dbLocal.planesEstudio = planes;
  },

  // Comunas CRUD
  getComunas: async (): Promise<string[]> => {
    return dbLocal.comunas;
  },

  addComuna: async (comuna: string): Promise<void> => {
    const list = [...dbLocal.comunas];
    if (!list.includes(comuna)) {
      list.push(comuna);
      dbLocal.comunas = list;
    }
  },

  deleteComuna: async (comuna: string): Promise<void> => {
    let list = [...dbLocal.comunas];
    list = list.filter(c => c !== comuna);
    dbLocal.comunas = list;
  },

  getRemuneraciones: async (): Promise<RegistroRemuneracion[]> => {
    return dbLocal.libroRemuneraciones;
  },

  cargarRemuneraciones: async (registros: RegistroRemuneracion[]): Promise<void> => {
    dbLocal.libroRemuneraciones = registros;
  },

  getTareasReemplazo: async (): Promise<TareaReemplazo[]> => {
    return dbLocal.tareasReemplazo;
  },

  crearTareaReemplazo: async (tarea: TareaReemplazo): Promise<void> => {
    const list = [...dbLocal.tareasReemplazo, tarea];
    dbLocal.tareasReemplazo = list;
  },

  resolverTareaReemplazo: async (id: string, reemplazoRun: string): Promise<void> => {
    const list = dbLocal.tareasReemplazo.map(t => {
      if (t.id === id) {
        return { ...t, estado: 'Asignado' as const, reemplazo_run: reemplazoRun };
      }
      return t;
    });
    dbLocal.tareasReemplazo = list;
  },

  getReemplazosLicencias: async (): Promise<ReemplazoDetalle[]> => {
    return dbLocal.reemplazosLicencias;
  },

  saveReemplazoLicencia: async (r: ReemplazoDetalle): Promise<void> => {
    const list = [...dbLocal.reemplazosLicencias, r];
    dbLocal.reemplazosLicencias = list;
  },

  deleteReemplazoLicencia: async (id: string): Promise<void> => {
    dbLocal.reemplazosLicencias = dbLocal.reemplazosLicencias.filter(r => r.id !== id);
  }
};
