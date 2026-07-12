import { createClient } from '@supabase/supabase-js';
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
    localStorage.setItem('slep_db__timestamp', Date.now().toString());
    this.scheduleCloudSync();
  }

  public scheduleCloudSync(): void {
    // Obsolete: All sync goes directly to Supabase production
  }

  public async pushCloudSyncForce(): Promise<void> {
    // Obsolete: All sync goes directly to Supabase production
  }

  public async pullCloudSync(): Promise<boolean> {
    // Obsolete: All sync goes directly to Supabase production
    return false;
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

const supabaseUrl = typeof window !== 'undefined' ? (window as any).env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co' : process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = typeof window !== 'undefined' ? (window as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder' : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const handleFallback = <T>(error: any, fallbackData: T, tableName: string): T => {
  console.warn(`⚠️ Error al consultar la tabla "${tableName}" en Supabase. Usando fallback local. Detalle:`, error.message || error);
  return fallbackData;
};

export const api = {
  getEstablecimientos: async (): Promise<Establecimiento[]> => {
    try {
      const { data, error } = await supabase.from('establecimientos').select('*');
      if (error) return handleFallback(error, dbLocal.establecimientos, 'establecimientos');
      return data || [];
    } catch (err) {
      return handleFallback(err, dbLocal.establecimientos, 'establecimientos');
    }
  },

  getEstablecimientoByRbd: async (rbd: string): Promise<Establecimiento | undefined> => {
    try {
      const { data, error } = await supabase.from('establecimientos').select('*').eq('rbd', rbd).maybeSingle();
      if (error) return handleFallback(error, dbLocal.establecimientos.find(e => e.rbd === rbd), 'establecimientos');
      return data || undefined;
    } catch (err) {
      return handleFallback(err, dbLocal.establecimientos.find(e => e.rbd === rbd), 'establecimientos');
    }
  },

  upsertEstablecimiento: async (est: Establecimiento): Promise<void> => {
    try {
      const { error } = await supabase.from('establecimientos').upsert(est);
      if (error) throw error;
    } catch (error) {
      console.warn("⚠️ Error en Supabase, guardando establecimiento en local:", error);
      const list = dbLocal.establecimientos;
      const idx = list.findIndex(e => e.rbd === est.rbd);
      if (idx >= 0) {
        list[idx] = est;
      } else {
        list.push(est);
      }
      dbLocal.establecimientos = list;
    }
  },

  deleteEstablecimiento: async (rbd: string): Promise<void> => {
    try {
      const { error } = await supabase.from('establecimientos').delete().eq('rbd', rbd);
      if (error) throw error;
    } catch (error) {
      console.warn("⚠️ Error en Supabase, borrando establecimiento en local:", error);
      dbLocal.establecimientos = dbLocal.establecimientos.filter(e => e.rbd !== rbd);
    }
  },

  getFuncionarios: async (): Promise<Funcionario[]> => {
    try {
      const { data, error } = await supabase.from('funcionarios').select('*');
      if (error) return handleFallback(error, dbLocal.funcionarios, 'funcionarios');
      return data || [];
    } catch (err) {
      return handleFallback(err, dbLocal.funcionarios, 'funcionarios');
    }
  },

  getContratos: async (rbd?: string): Promise<Contrato[]> => {
    try {
      let query = supabase.from('contratos').select('*');
      if (rbd) {
        query = query.eq('rbd', rbd);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      const fallback = rbd ? dbLocal.contratos.filter(c => c.rbd === rbd) : dbLocal.contratos;
      return handleFallback(error, fallback, 'contratos');
    }
  },

  getFinanciamientosPorContrato: async (contratoId: string): Promise<FinanciamientoContrato[]> => {
    try {
      const { data, error } = await supabase.from('financiamientos').select('*').eq('contrato_id', contratoId);
      if (error) return handleFallback(error, dbLocal.financiamientoContratos.filter(f => f.contrato_id === contratoId), 'financiamientos');
      return data || [];
    } catch (err) {
      return handleFallback(err, dbLocal.financiamientoContratos.filter(f => f.contrato_id === contratoId), 'financiamientos');
    }
  },

  getAsignacionesPorEstablecimiento: async (rbd: string): Promise<AsignacionAula[]> => {
    try {
      const { data: contratos, error: cErr } = await supabase.from('contratos').select('id').eq('rbd', rbd);
      if (cErr || !contratos || contratos.length === 0) {
        if (cErr) console.warn("⚠️ Error obteniendo contratos en Supabase para asignaciones:", cErr);
        const localConts = dbLocal.contratos.filter(c => c.rbd === rbd);
        const localIds = localConts.map(c => c.id);
        return dbLocal.asignacionesAula.filter(a => localIds.includes(a.contrato_id));
      }
      const ids = contratos.map(c => c.id);
      const { data, error } = await supabase.from('asignaciones_aula').select('*').in('contrato_id', ids);
      if (error) throw error;
      return data || [];
    } catch (error) {
      const localConts = dbLocal.contratos.filter(c => c.rbd === rbd);
      const localIds = localConts.map(c => c.id);
      return handleFallback(error, dbLocal.asignacionesAula.filter(a => localIds.includes(a.contrato_id)), 'asignaciones_aula');
    }
  },

  getAlertas: async (rbd?: string): Promise<AlertaConciliacion[]> => {
    try {
      let query = supabase.from('alertas_conciliacion').select('*');
      if (rbd) {
        query = query.eq('rbd', rbd);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      const fallback = rbd ? dbLocal.alertas.filter(a => a.rbd === rbd) : dbLocal.alertas;
      return handleFallback(error, fallback, 'alertas_conciliacion');
    }
  },

  upsertFuncionario: async (funcionario: Funcionario): Promise<void> => {
    const dataObj = { ...funcionario };
    if (dataObj.estamento === 'Docente' || dataObj.estamento === 'Asistente de la Educación') {
      dataObj.grupo_estamento = 'P02_Educacion';
    }
    try {
      const { error } = await supabase.from('funcionarios').upsert(dataObj);
      if (error) throw error;
    } catch (error) {
      console.warn("⚠️ Error en Supabase, guardando funcionario en local:", error);
      const funcionarios = dbLocal.funcionarios;
      const index = funcionarios.findIndex(f => f.run === dataObj.run);
      if (index >= 0) {
        funcionarios[index] = { ...funcionarios[index], ...dataObj };
      } else {
        funcionarios.push(dataObj);
      }
      dbLocal.funcionarios = funcionarios;
    }
  },

  upsertFuncionariosBulk: async (funcionarios: Funcionario[]): Promise<void> => {
    const list = funcionarios.map(f => {
      const dataObj = { ...f };
      if (dataObj.estamento === 'Docente' || dataObj.estamento === 'Asistente de la Educación') {
        dataObj.grupo_estamento = 'P02_Educacion';
      }
      return dataObj;
    });

    const withTimeout = <T>(p: Promise<T>, ms = 6000): Promise<T> => {
      return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout de base de datos")), ms))
      ]);
    };
    
    const batchSize = 100;
    for (let i = 0; i < list.length; i += batchSize) {
      const batch = list.slice(i, i + batchSize);
      try {
        const { error } = await withTimeout<any>(Promise.resolve(supabase.from('funcionarios').upsert(batch)));
        if (error) throw error;
      } catch (error) {
        console.warn("⚠️ Error en Supabase bulk funcionarios, guardando en local:", error);
        const current = dbLocal.funcionarios;
        for (const item of batch) {
          const idx = current.findIndex(f => f.run === item.run);
          if (idx >= 0) current[idx] = { ...current[idx], ...item };
          else current.push(item);
        }
        dbLocal.funcionarios = current;
      }
    }
  },

  upsertContratosCompletoBulk: async (
    contratos: Contrato[], 
    financiamientos: FinanciamientoContrato[]
  ): Promise<void> => {
    const withTimeout = <T>(p: Promise<T>, ms = 6000): Promise<T> => {
      return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout de base de datos")), ms))
      ]);
    };

    const batchSize = 100;
    for (let i = 0; i < contratos.length; i += batchSize) {
      const batch = contratos.slice(i, i + batchSize);
      try {
        const { error } = await withTimeout<any>(Promise.resolve(supabase.from('contratos').upsert(batch)));
        if (error) throw error;
      } catch (error) {
        console.warn("⚠️ Error en Supabase bulk contratos:", error);
        const current = dbLocal.contratos;
        for (const item of batch) {
          const idx = current.findIndex(c => c.id === item.id);
          if (idx >= 0) current[idx] = item;
          else current.push(item);
        }
        dbLocal.contratos = current;
      }
    }

    const contratoIds = contratos.map(c => c.id);
    for (let i = 0; i < contratoIds.length; i += batchSize) {
      const batchIds = contratoIds.slice(i, i + batchSize);
      try {
        const { error } = await withTimeout<any>(Promise.resolve(supabase.from('financiamientos').delete().in('contrato_id', batchIds)));
        if (error) throw error;
      } catch (error) {
        console.warn("⚠️ Error in bulk delete financiamientos:", error);
      }
    }

    for (let i = 0; i < financiamientos.length; i += batchSize) {
      const batch = financiamientos.slice(i, i + batchSize);
      if (batch.length > 0) {
        try {
          const { error } = await withTimeout<any>(Promise.resolve(supabase.from('financiamientos').insert(batch)));
          if (error) throw error;
        } catch (error) {
          console.warn("⚠️ Error in bulk insert financiamientos:", error);
          let localFins = dbLocal.financiamientoContratos.filter(f => !contratoIds.includes(f.contrato_id));
          localFins.push(...financiamientos);
          dbLocal.financiamientoContratos = localFins;
        }
      }
    }
  },

  deleteFuncionario: async (run: string): Promise<void> => {
    const { error } = await supabase.from('funcionarios').delete().eq('run', run);
    if (error) {
      console.warn("⚠️ Error en Supabase, borrando funcionario en local:", error);
      dbLocal.funcionarios = dbLocal.funcionarios.filter(f => f.run !== run);
    }
  },

  upsertContratoCompleto: async (
    contrato: Contrato, 
    financiamientos: FinanciamientoContrato[]
  ): Promise<void> => {
    const { error: cErr } = await supabase.from('contratos').upsert(contrato);
    const { error: delErr } = await supabase.from('financiamientos').delete().eq('contrato_id', contrato.id);
    let insErr = null;
    if (financiamientos.length > 0) {
      const { error } = await supabase.from('financiamientos').insert(financiamientos);
      insErr = error;
    }
    if (cErr || delErr || insErr) {
      console.warn("⚠️ Error en Supabase, guardando contrato completo en local:", { cErr, delErr, insErr });
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
    }
  },

  updateContratoEstado: async (
    contratoId: string, 
    estado: EstadoContrato, 
    vinculoTitularId: string | null = null,
    fechaInicioLicencia?: string | null,
    fechaTerminoLicencia?: string | null
  ): Promise<void> => {
    const updateObj: any = { estado, vinculo_titular_id: vinculoTitularId };
    if (fechaInicioLicencia !== undefined) updateObj.fecha_inicio_licencia = fechaInicioLicencia;
    if (fechaTerminoLicencia !== undefined) updateObj.fecha_termino_licencia = fechaTerminoLicencia;

    const { error } = await supabase.from('contratos').update(updateObj).eq('id', contratoId);
    if (error) {
      console.warn("⚠️ Error en Supabase, actualizando estado de contrato en local:", error);
      const contratos = dbLocal.contratos;
      const idx = contratos.findIndex(c => c.id === contratoId);
      if (idx >= 0) {
        contratos[idx].estado = estado;
        contratos[idx].vinculo_titular_id = vinculoTitularId;
        if (fechaInicioLicencia !== undefined) contratos[idx].fecha_inicio_licencia = fechaInicioLicencia || undefined;
        if (fechaTerminoLicencia !== undefined) contratos[idx].fecha_termino_licencia = fechaTerminoLicencia || undefined;
        dbLocal.contratos = contratos;
      }
    }
  },

  deleteContrato: async (contratoId: string): Promise<void> => {
    const { error: aErr } = await supabase.from('asignaciones_aula').delete().eq('contrato_id', contratoId);
    const { error: fErr } = await supabase.from('financiamientos').delete().eq('contrato_id', contratoId);
    const { error: cErr } = await supabase.from('contratos').delete().eq('id', contratoId);
    if (aErr || fErr || cErr) {
      console.warn("⚠️ Error en Supabase, eliminando contrato en local:", { aErr, fErr, cErr });
      dbLocal.contratos = dbLocal.contratos.filter(c => c.id !== contratoId);
      dbLocal.financiamientoContratos = dbLocal.financiamientoContratos.filter(f => f.contrato_id !== contratoId);
      dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => a.contrato_id !== contratoId);
    }
  },

  saveAsignacion: async (asignacion: AsignacionAula): Promise<void> => {
    const { error } = await supabase.from('asignaciones_aula').upsert(asignacion);
    if (error) {
      console.warn("⚠️ Error en Supabase, guardando asignacion en local:", error);
      const asignaciones = dbLocal.asignacionesAula;
      const idx = asignaciones.findIndex(a => a.id === asignacion.id);
      if (idx >= 0) {
        asignaciones[idx] = asignacion;
      } else {
        asignaciones.push(asignacion);
      }
      dbLocal.asignacionesAula = asignaciones;
    }
  },

  deleteAsignacion: async (id: string): Promise<void> => {
    const { error } = await supabase.from('asignaciones_aula').delete().eq('id', id);
    if (error) {
      console.warn("⚠️ Error en Supabase, eliminando asignacion en local:", error);
      dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => a.id !== id);
    }
  },

  deleteAsignacionesPorCurso: async (rbd: string, cursoNombre: string): Promise<void> => {
    const { data: contratos } = await supabase.from('contratos').select('id').eq('rbd', rbd);
    if (contratos && contratos.length > 0) {
      const ids = contratos.map(c => c.id);
      const { error } = await supabase.from('asignaciones_aula').delete().eq('curso', cursoNombre).in('contrato_id', ids);
      if (error) {
        console.warn("⚠️ Error en Supabase, eliminando asignaciones por curso:", error);
      }
    }
    // Fallback/Local sync
    const conts = dbLocal.contratos.filter(c => c.rbd === rbd);
    const contIds = conts.map(c => c.id);
    dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => !(a.curso === cursoNombre && contIds.includes(a.contrato_id)));
  },

  crearAlerta: async (alerta: AlertaConciliacion): Promise<void> => {
    const { error } = await supabase.from('alertas_conciliacion').upsert(alerta);
    if (error) {
      console.warn("⚠️ Error en Supabase, creando alerta en local:", error);
      const alertas = dbLocal.alertas;
      if (!alertas.some(a => a.id === alerta.id)) {
        alertas.push(alerta);
        dbLocal.alertas = alertas;
      }
    }
  },

  resolverAlerta: async (alertaId: string): Promise<void> => {
    const { error } = await supabase.from('alertas_conciliacion').update({ resuelta: true }).eq('id', alertaId);
    if (error) {
      console.warn("⚠️ Error en Supabase, resolviendo alerta en local:", error);
      const alertas = dbLocal.alertas;
      const idx = alertas.findIndex(a => a.id === alertaId);
      if (idx >= 0) {
        alertas[idx].resuelta = true;
        dbLocal.alertas = alertas;
      }
    }
  },

  limpiarAlertasPorRbd: async (rbd: string): Promise<void> => {
    const { error } = await supabase.from('alertas_conciliacion').delete().eq('rbd', rbd).eq('resuelta', true);
    if (error) {
      console.warn("⚠️ Error en Supabase, limpiando alertas en local:", error);
      dbLocal.alertas = dbLocal.alertas.filter(a => a.rbd !== rbd || a.resuelta);
    }
  },

  getTutelasPorProfesional: async (profesionalRun: string): Promise<string[]> => {
    const { data, error } = await supabase.from('tutelas').select('establecimiento_rbd').eq('profesional_run', profesionalRun);
    if (error) return handleFallback(error, dbLocal.tutelas.filter(t => t.profesional_run === profesionalRun).map(t => t.establecimiento_rbd), 'tutelas');
    return data ? data.map(t => t.establecimiento_rbd) : [];
  },

  getTodasLasTutelas: async (): Promise<ProfesionalEscuelaAsignada[]> => {
    const { data, error } = await supabase.from('tutelas').select('*');
    if (error) return handleFallback(error, dbLocal.tutelas, 'tutelas');
    return data || [];
  },

  asignarEscuelaAProfesional: async (profesionalRun: string, rbd: string): Promise<void> => {
    const { error } = await supabase.from('tutelas').upsert({ profesional_run: profesionalRun, establecimiento_rbd: rbd });
    if (error) {
      console.warn("⚠️ Error en Supabase, asignando tutela en local:", error);
      const list = dbLocal.tutelas;
      if (!list.some(t => t.profesional_run === profesionalRun && t.establecimiento_rbd === rbd)) {
        list.push({ profesional_run: profesionalRun, establecimiento_rbd: rbd });
        dbLocal.tutelas = list;
      }
    }
  },

  removerEscuelaDeProfesional: async (profesionalRun: string, rbd: string): Promise<void> => {
    const { error } = await supabase.from('tutelas').delete().eq('profesional_run', profesionalRun).eq('establecimiento_rbd', rbd);
    if (error) {
      console.warn("⚠️ Error en Supabase, eliminando tutela en local:", error);
      let list = dbLocal.tutelas;
      list = list.filter(t => !(t.profesional_run === profesionalRun && t.establecimiento_rbd === rbd));
      dbLocal.tutelas = list;
    }
  },

  getCursosDinamicos: async (rbd: string): Promise<CursoDinamico[]> => {
    const { data, error } = await supabase.from('cursos_dinamicos').select('*').eq('rbd', rbd);
    if (error) return handleFallback(error, dbLocal.cursosDinamicos.filter(c => c.rbd === rbd), 'cursos_dinamicos');
    return data || [];
  },

  crearCursoDinamico: async (curso: CursoDinamico): Promise<void> => {
    const { error } = await supabase.from('cursos_dinamicos').upsert(curso);
    if (error) {
      console.warn("⚠️ Error en Supabase, creando curso dinámico en local:", error);
      const list = dbLocal.cursosDinamicos;
      const index = list.findIndex(c => c.rbd === curso.rbd && c.nombre === curso.nombre);
      if (index >= 0) {
        list[index] = curso;
      } else {
        list.push(curso);
      }
      dbLocal.cursosDinamicos = list;
    }
  },

  eliminarCursoDinamico: async (rbd: string, nombre: string): Promise<void> => {
    await supabase.from('asignaturas_dinamicas').delete().eq('rbd', rbd).eq('cursoNombre', nombre);
    const { data: contratos } = await supabase.from('contratos').select('id').eq('rbd', rbd);
    if (contratos && contratos.length > 0) {
      const ids = contratos.map(c => c.id);
      await supabase.from('asignaciones_aula').delete().eq('curso', nombre).in('contrato_id', ids);
    }
    const { error } = await supabase.from('cursos_dinamicos').delete().eq('rbd', rbd).eq('nombre', nombre);
    if (error) {
      console.warn("⚠️ Error en Supabase, eliminando curso dinámico en local:", error);
      dbLocal.cursosDinamicos = dbLocal.cursosDinamicos.filter(c => !(c.rbd === rbd && c.nombre === nombre));
      dbLocal.asignaturasDinamicas = dbLocal.asignaturasDinamicas.filter(a => !(a.rbd === rbd && a.cursoNombre === nombre));
      const conts = dbLocal.contratos.filter(c => c.rbd === rbd);
      const contIds = conts.map(c => c.id);
      dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => !(a.curso === nombre && contIds.includes(a.contrato_id)));
    }
  },

  getAsignaturasDinamicas: async (rbd: string, cursoNombre: string): Promise<AsignaturaDinamica[]> => {
    const { data, error } = await supabase.from('asignaturas_dinamicas').select('*').eq('rbd', rbd).eq('cursoNombre', cursoNombre);
    if (error) return handleFallback(error, dbLocal.asignaturasDinamicas.filter(a => a.rbd === rbd && a.cursoNombre === cursoNombre), 'asignaturas_dinamicas');
    return data || [];
  },

  crearAsignaturaDinamica: async (asignatura: AsignaturaDinamica): Promise<void> => {
    const { error } = await supabase.from('asignaturas_dinamicas').upsert(asignatura);
    if (error) {
      console.warn("⚠️ Error en Supabase, creando asignatura dinámica en local:", error);
      const list = dbLocal.asignaturasDinamicas;
      if (!list.some(a => a.rbd === asignatura.rbd && a.cursoNombre === asignatura.cursoNombre && a.nombre === asignatura.nombre)) {
        list.push(asignatura);
        dbLocal.asignaturasDinamicas = list;
      }
    }
  },

  getSupervisores: async (): Promise<Supervisor[]> => {
    const { data, error } = await supabase.from('supervisores').select('*');
    if (error) return handleFallback(error, dbLocal.supervisores, 'supervisores');
    return data || [];
  },

  upsertSupervisor: async (sup: Supervisor): Promise<void> => {
    const { error: supErr } = await supabase.from('supervisores').upsert(sup);
    if (supErr) {
      console.warn("⚠️ Error en Supabase, creando/actualizando supervisor en local:", supErr);
      const list = dbLocal.supervisores;
      const idx = list.findIndex(s => s.run === sup.run);
      if (idx >= 0) {
        list[idx] = sup;
      } else {
        list.push(sup);
      }
      dbLocal.supervisores = list;
    }
    
    await api.upsertFuncionario({
      run: sup.run,
      nombre: sup.nombre,
      email: sup.email,
      estamento: 'Docente',
      cargo: 'Asesor UATP'
    });
  },

  deleteSupervisor: async (run: string): Promise<void> => {
    await supabase.from('tutelas').delete().eq('profesional_run', run);
    const { error } = await supabase.from('supervisores').delete().eq('run', run);
    if (error) {
      console.warn("⚠️ Error en Supabase, eliminando supervisor en local:", error);
      dbLocal.supervisores = dbLocal.supervisores.filter(s => s.run !== run);
      dbLocal.tutelas = dbLocal.tutelas.filter(t => t.profesional_run !== run);
    }
    await api.deleteFuncionario(run);
  },

  getCargosPorEstablecimiento: async (rbd: string): Promise<CargoPersonalizado[]> => {
    const { data, error } = await supabase.from('cargos_personalizados').select('*').eq('rbd', rbd);
    if (error) return handleFallback(error, dbLocal.cargosPersonalizados.filter(c => c.rbd === rbd), 'cargos_personalizados');
    return data || [];
  },

  crearCargoPersonalizado: async (cargo: CargoPersonalizado): Promise<void> => {
    const { error } = await supabase.from('cargos_personalizados').upsert(cargo);
    if (error) {
      console.warn("⚠️ Error en Supabase, creando cargo personalizado en local:", error);
      const list = dbLocal.cargosPersonalizados;
      list.push(cargo);
      dbLocal.cargosPersonalizados = list;
    }
  },

  removerCargoPersonalizado: async (id: string): Promise<void> => {
    const { error } = await supabase.from('cargos_personalizados').delete().eq('id', id);
    if (error) {
      console.warn("⚠️ Error en Supabase, eliminando cargo personalizado en local:", error);
      dbLocal.cargosPersonalizados = dbLocal.cargosPersonalizados.filter(c => c.id !== id);
    }
  },

  getPlanesEstudio: async (): Promise<PlanEstudioNorm[]> => {
    const { data, error } = await supabase.from('planes_estudio').select('*');
    if (error) return handleFallback(error, dbLocal.planesEstudio, 'planes_estudio');
    return data || [];
  },

  guardarPlanesEstudio: async (planes: PlanEstudioNorm[]): Promise<void> => {
    await supabase.from('planes_estudio').delete().neq('nivel', 'PLACEHOLDER_THAT_NEVER_MATCHES');
    const { error } = await supabase.from('planes_estudio').insert(planes);
    if (error) {
      console.warn("⚠️ Error en Supabase, guardando planes de estudio en local:", error);
      dbLocal.planesEstudio = planes;
    }
  },

  getComunas: async (): Promise<string[]> => {
    const { data, error } = await supabase.from('comunas').select('nombre');
    if (error) return handleFallback(error, dbLocal.comunas, 'comunas');
    return data ? data.map((c: any) => c.nombre) : [];
  },

  addComuna: async (comuna: string): Promise<void> => {
    const { error } = await supabase.from('comunas').upsert({ nombre: comuna });
    if (error) {
      console.warn("⚠️ Error en Supabase, agregando comuna en local:", error);
      const list = [...dbLocal.comunas];
      if (!list.includes(comuna)) {
        list.push(comuna);
        dbLocal.comunas = list;
      }
    }
  },

  deleteComuna: async (comuna: string): Promise<void> => {
    const { error } = await supabase.from('comunas').delete().eq('nombre', comuna);
    if (error) {
      console.warn("⚠️ Error en Supabase, eliminando comuna en local:", error);
      let list = [...dbLocal.comunas];
      list = list.filter(c => c !== comuna);
      dbLocal.comunas = list;
    }
  },

  getRemuneraciones: async (): Promise<RegistroRemuneracion[]> => {
    const { data, error } = await supabase.from('libro_remuneraciones').select('*');
    if (error) return handleFallback(error, dbLocal.libroRemuneraciones, 'libro_remuneraciones');
    return data || [];
  },

  cargarRemuneraciones: async (registros: RegistroRemuneracion[]): Promise<void> => {
    await supabase.from('libro_remuneraciones').delete().neq('id', 'PLACEHOLDER');
    const { error } = await supabase.from('libro_remuneraciones').insert(registros);
    if (error) {
      console.warn("⚠️ Error en Supabase, cargando remuneraciones en local:", error);
      dbLocal.libroRemuneraciones = registros;
    }
  },

  getTareasReemplazo: async (): Promise<TareaReemplazo[]> => {
    const { data, error } = await supabase.from('tareas_reemplazo').select('*');
    if (error) return handleFallback(error, dbLocal.tareasReemplazo, 'tareas_reemplazo');
    return (data || []).map(row => ({
      id: row.id,
      rbd: row.rbd,
      funcionario_titular_run: row.funcionario_titular_run,
      funcionario_titular_nombre: row.nombre_titular,
      horas_a_cubrir: Number(row.horas_reemplazo),
      estado: row.estado,
      reemplazo_run: row.reemplazo_run || undefined
    }));
  },

  crearTareaReemplazo: async (tarea: TareaReemplazo): Promise<void> => {
    const dbRow = {
      id: tarea.id,
      rbd: tarea.rbd,
      funcionario_titular_run: tarea.funcionario_titular_run,
      nombre_titular: tarea.funcionario_titular_nombre,
      horas_reemplazo: tarea.horas_a_cubrir,
      estado: tarea.estado,
      reemplazo_run: tarea.reemplazo_run || null,
      motivo: (tarea as any).motivo || 'Licencia Médica',
      fecha_inicio: (tarea as any).fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_termino: (tarea as any).fecha_termino || new Date().toISOString().split('T')[0]
    };
    const { error } = await supabase.from('tareas_reemplazo').insert(dbRow);
    if (error) {
      console.warn("⚠️ Error en Supabase, creando tarea de reemplazo en local:", error);
      const list = [...dbLocal.tareasReemplazo, tarea];
      dbLocal.tareasReemplazo = list;
    }
  },

  resolverTareaReemplazo: async (id: string, reemplazoRun: string): Promise<void> => {
    const { error } = await supabase.from('tareas_reemplazo').update({ estado: 'Asignado', reemplazo_run: reemplazoRun }).eq('id', id);
    if (error) {
      console.warn("⚠️ Error en Supabase, resolviendo tarea de reemplazo en local:", error);
      const list = dbLocal.tareasReemplazo.map(t => {
        if (t.id === id) {
          return { ...t, estado: 'Asignado' as const, reemplazo_run: reemplazoRun };
        }
        return t;
      });
      dbLocal.tareasReemplazo = list;
    }
  },

  getReemplazosLicencias: async (): Promise<ReemplazoDetalle[]> => {
    const { data, error } = await supabase.from('reemplazos_licencias').select('*');
    if (error) return handleFallback(error, dbLocal.reemplazosLicencias, 'reemplazos_licencias');
    return data || [];
  },

  saveReemplazoLicencia: async (r: ReemplazoDetalle): Promise<void> => {
    const { error } = await supabase.from('reemplazos_licencias').upsert(r);
    if (error) {
      console.warn("⚠️ Error en Supabase, guardando reemplazo en local:", error);
      const list = dbLocal.reemplazosLicencias.filter(x => x.id !== r.id);
      dbLocal.reemplazosLicencias = [...list, r];
    }
  },

  deleteReemplazoLicencia: async (id: string): Promise<void> => {
    const { error } = await supabase.from('reemplazos_licencias').delete().eq('id', id);
    if (error) {
      console.warn("⚠️ Error en Supabase, eliminando reemplazo en local:", error);
      dbLocal.reemplazosLicencias = dbLocal.reemplazosLicencias.filter(r => r.id !== id);
    }
  },

  getTodasLasAsignaciones: async (): Promise<AsignacionAula[]> => {
    const { data, error } = await supabase.from('asignaciones_aula').select('*');
    if (error) return handleFallback(error, dbLocal.asignacionesAula, 'asignaciones_aula');
    return data || [];
  },

  getTodosLosCursosDinamicos: async (): Promise<CursoDinamico[]> => {
    const { data, error } = await supabase.from('cursos_dinamicos').select('*');
    if (error) return handleFallback(error, dbLocal.cursosDinamicos, 'cursos_dinamicos');
    return data || [];
  },

  getTodasLasAsignaturasDinamicas: async (): Promise<AsignaturaDinamica[]> => {
    const { data, error } = await supabase.from('asignaturas_dinamicas').select('*');
    if (error) return handleFallback(error, dbLocal.asignaturasDinamicas, 'asignaturas_dinamicas');
    return data || [];
  },

  getTodosLosCargosPersonalizados: async (): Promise<CargoPersonalizado[]> => {
    const { data, error } = await supabase.from('cargos_personalizados').select('*');
    if (error) return handleFallback(error, dbLocal.cargosPersonalizados, 'cargos_personalizados');
    return data || [];
  },

  scheduleCloudSync: async (): Promise<void> => {},
  pullCloudSync: async (): Promise<boolean> => { return false; },
  pushCloudSyncForce: async (): Promise<void> => {}
};
