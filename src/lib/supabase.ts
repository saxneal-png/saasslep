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
  ReemplazoDetalle,
  HorasCronologicasAdicionales,
  BrechaCargoVacante
} from './types';
import { normalizarRbd } from './csvParser';
import { validarHardCap44Horas, normalizarRun } from './rulesEngine';

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
  { run: '12345678-9', nombre: 'María Loreto González Soto', email: 'mgonzalez@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Docente de Aula' },
  { run: '15432987-K', nombre: 'Carlos Andrés Muñoz Riquelme', email: 'cmunoz@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Docente de Aula' },
  { run: '16789012-3', nombre: 'Ana Luisa Parra Valenzuela', email: 'aparra@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Docente PIE' },
  { run: '14567890-1', nombre: 'José Pedro Valdés Letelier', email: 'jvaldes@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Coordinador UTP' },
  { run: '18901234-5', nombre: 'Daniela Paz Contreras Sepúlveda', email: 'dcontreras@slepvallediguillin.cl', estamento: 'Asistente de la Educación', cargo: 'Psicóloga' },
  { run: '10876543-2', nombre: 'Héctor Manuel Olivares Pinto', email: 'holivares@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Docente de Aula' },
  { run: '17654321-0', nombre: 'Verónica Andrea Torres Castro', email: 'vtorres@slepvallediguillin.cl', estamento: 'Asistente de la Educación', cargo: 'Auxiliar de Servicios' },
  // Asesores
  { run: '11111111-1', nombre: 'Asesor Técnico UATP Diguillín', email: 'supervisor1@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Asesor UATP' },
  { run: '22222222-2', nombre: 'Evaluadora Curricular SLEP', email: 'evaluadora2@slepvallediguillin.cl', estamento: 'Docente', cargo: 'Asesor UATP' },
];

const SUPERVISORES_INICIAL: Supervisor[] = [
  { run: '11111111-1', nombre: 'Asesor Técnico UATP Diguillín', email: 'supervisor1@slepvallediguillin.cl' },
  { run: '22222222-2', nombre: 'Evaluadora Curricular SLEP', email: 'evaluadora2@slepvallediguillin.cl' }
];

const CONTRATOS_MOCK_INICIAL: Contrato[] = [
  { id: 'c1', funcionario_run: '12345678-9', rbd: '10201', calidad_juridica: 'Titular', funcion_principal: 'Docente de Aula', estado: 'Activo', horas_totales: 44 },
  { id: 'c2', funcionario_run: '15432987-K', rbd: '10202', calidad_juridica: 'A contrata', funcion_principal: 'Docente de Aula', estado: 'Activo', horas_totales: 38 },
  { id: 'c3', funcionario_run: '16789012-3', rbd: '10202', calidad_juridica: 'Titular', funcion_principal: 'Docente PIE', estado: 'Licencia Médica', horas_totales: 44 },
  { id: 'c4', funcionario_run: '10876543-2', rbd: '10202', calidad_juridica: 'A contrata', funcion_principal: 'Docente de Aula', estado: 'Reemplazo', horas_totales: 44, vinculo_titular_id: 'c3' },
  { id: 'c5', funcionario_run: '15432987-K', rbd: '10201', calidad_juridica: 'A contrata', funcion_principal: 'Docente de Aula', estado: 'Activo', horas_totales: 10 },
  { id: 'c6', funcionario_run: '17654321-0', rbd: '10204', calidad_juridica: 'Titular', funcion_principal: 'Auxiliar de Servicios', estado: 'Activo', horas_totales: 44 },
  { id: 'c8', funcionario_run: '18901234-5', rbd: '10202', calidad_juridica: 'A contrata', funcion_principal: 'Psicóloga', estado: 'Activo', horas_totales: 22 }
];

const FINANCIAMIENTOS_MOCK_INICIAL: FinanciamientoContrato[] = [
  { id: 'f1', contrato_id: 'c1', origen_fondo: 'Subvención Regular', horas: 30 },
  { id: 'f2', contrato_id: 'c1', origen_fondo: 'SEP', horas: 14 },
  { id: 'f3', contrato_id: 'c2', origen_fondo: 'PIE', horas: 38 },
  { id: 'f4', contrato_id: 'c3', origen_fondo: 'PIE', horas: 44 },
  { id: 'f5', contrato_id: 'c4', origen_fondo: 'PIE', horas: 44 },
  { id: 'f6', contrato_id: 'c5', origen_fondo: 'SEP', horas: 10 },
  { id: 'f7', contrato_id: 'c6', origen_fondo: 'Subvención Regular', horas: 44 },
  { id: 'f8', contrato_id: 'c8', origen_fondo: 'PIE', horas: 22 }
];

const ASIGNACIONES_MOCK_INICIAL: AsignacionAula[] = [
  { id: 'a1', contrato_id: 'c1', curso: '7° Básico A', asignatura: 'Lenguaje y Comunicación', horas: 6 },
  { id: 'a2', contrato_id: 'c1', curso: '8° Básico A', asignatura: 'Lenguaje y Comunicación', horas: 6 },
  { id: 'a3', contrato_id: 'c1', curso: '1° Medio A', asignatura: 'Lenguaje y Comunicación', horas: 5 },
  { id: 'a4', contrato_id: 'c2', curso: '3° Básico A', asignatura: 'Matemática', horas: 8 },
  { id: 'a5', contrato_id: 'c2', curso: '4° Básico A', asignatura: 'Matemática', horas: 8 },
];

const TUTELAS_INICIAL: ProfesionalEscuelaAsignada[] = [
  { profesional_run: '11111111-1', establecimiento_rbd: '10202' },
  { profesional_run: '11111111-1', establecimiento_rbd: '10204' },
];

const ALERTAS_MOCK_INICIAL: AlertaConciliacion[] = [
  {
    id: 'al1',
    run: '12345678-9',
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
    run: '15432987-K',
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

  get horasCronologicasAdicionales(): HorasCronologicasAdicionales[] {
    return this.getStorageItem('horas_cronologicas_adicionales', []);
  }

  set horasCronologicasAdicionales(val: HorasCronologicasAdicionales[]) {
    this.setStorageItem('horas_cronologicas_adicionales', val);
  }

  get brechasVacantes(): BrechaCargoVacante[] {
    return this.getStorageItem('brechas_vacantes', []);
  }

  set brechasVacantes(val: BrechaCargoVacante[]) {
    this.setStorageItem('brechas_vacantes', val);
  }
}

export const dbLocal = new DatabaseLocal();

const supabaseUrl = typeof window !== 'undefined' ? (window as any).env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co' : process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = typeof window !== 'undefined' ? (window as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder' : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function handleFallback<T>(error: any, fallbackData: T, tableName: string): T {
  console.warn(`⚠️ Error al consultar la tabla "${tableName}" en Supabase. Usando fallback local. Detalle:`, error.message || error);
  return fallbackData;
}let detectedCursoConcentracionCol: string | null = null;

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

  upsertEstablecimientosBulk: async (establecimientos: Establecimiento[]): Promise<void> => {
    // Insert in small chunks to avoid Supabase payload / timeout limits
    const CHUNK_SIZE = 50;
    const errors: string[] = [];
    for (let i = 0; i < establecimientos.length; i += CHUNK_SIZE) {
      const chunk = establecimientos.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('establecimientos')
        .upsert(chunk, { onConflict: 'rbd' });
      if (error) {
        console.error(`❌ Error en chunk [${i}-${i + chunk.length}]:`, error.message, JSON.stringify(error));
        errors.push(error.message);
      }
    }
    if (errors.length > 0) {
      throw new Error(`Errores al insertar establecimientos en Supabase: ${errors.join(' | ')}`);
    }
  },

  upsertComunasBulk: async (comunas: string[]): Promise<void> => {
    const payload = comunas.map(c => ({ nombre: c }));
    const { error } = await supabase
      .from('comunas')
      .upsert(payload, { onConflict: 'nombre' });
    if (error) {
      console.warn("⚠️ Advertencia en upsertComunasBulk (posible política RLS o comunas ya existentes):", error.message, JSON.stringify(error));
      // No lanzamos el error para permitir la inserción de establecimientos si las comunas ya existen en la DB.
    }
  },

  deleteEstablecimiento: async (rbd: string): Promise<void> => {
    try {
      const { error } = await supabase.from('establecimientos').delete().eq('rbd', rbd);
      if (error) throw error;
    } catch (error) {
      console.warn("⚠️ Error en Supabase, borrando establecimiento en local:", error);
    } finally {
      // Always update dbLocal to prevent ghost contracts/hours
      dbLocal.establecimientos = dbLocal.establecimientos.filter(e => e.rbd !== rbd);
      const deletedContractIds = dbLocal.contratos
        .filter(c => c.rbd === rbd)
        .map(c => c.id);
      dbLocal.contratos = dbLocal.contratos.filter(c => c.rbd !== rbd);
      dbLocal.financiamientoContratos = dbLocal.financiamientoContratos.filter(
        f => !deletedContractIds.includes(f.contrato_id)
      );
      if ((dbLocal as any).alertas) {
        (dbLocal as any).alertas = (dbLocal as any).alertas.filter((a: any) => a.rbd !== rbd);
      }
    }
  },

  getFuncionarios: async (): Promise<Funcionario[]> => {
    try {
      const allData: Funcionario[] = [];
      const { count, error: countErr } = await supabase
        .from('funcionarios')
        .select('*', { count: 'exact', head: true });

      if (!countErr && count && count > 0) {
        const promises = [];
        const CHUNK_SIZE = 1000;
        for (let from = 0; from < count; from += CHUNK_SIZE) {
          const to = from + CHUNK_SIZE - 1;
          promises.push(
            supabase.from('funcionarios').select('*').range(from, to)
          );
        }

        const results = await Promise.all(promises);
        for (const res of results) {
          if (!res.error && res.data) {
            allData.push(...res.data);
          }
        }
      }

      // Merge Supabase funcionarios with dbLocal.funcionarios using normalizarRun
      const mergedMap = new Map<string, Funcionario>();
      allData.forEach(f => {
        const normKey = normalizarRun(f.run) || f.run;
        if (normKey) mergedMap.set(normKey, f);
      });
      dbLocal.funcionarios.forEach(f => {
        const normKey = normalizarRun(f.run) || f.run;
        if (normKey && !mergedMap.has(normKey)) {
          mergedMap.set(normKey, f);
        }
      });

      return Array.from(mergedMap.values());
    } catch (err) {
      return handleFallback(err, dbLocal.funcionarios, 'funcionarios');
    }
  },

  getContratos: async (rbd?: string): Promise<Contrato[]> => {
    try {
      // 1. Get total count filtered by RBD if present
      let countQuery = supabase.from('contratos').select('*', { count: 'exact', head: true });
      if (rbd) {
        const cleanRbd = rbd.trim();
        const normRbd = normalizarRbd(cleanRbd);
        const zeroPadded = cleanRbd.padStart(5, '0');
        const matches = Array.from(new Set([cleanRbd, normRbd, zeroPadded])).filter(Boolean);
        countQuery = countQuery.or(matches.map(m => `rbd.eq.${m}`).join(','));
      }

      const { count, error: countErr } = await countQuery;
      if (countErr) throw countErr;
      const total = count || 0;
      const allData: Contrato[] = [];

      if (total > 0) {
        // 2. Fetch all ranges concurrently
        const promises = [];
        const CHUNK_SIZE = 1000;
        for (let from = 0; from < total; from += CHUNK_SIZE) {
          const to = from + CHUNK_SIZE - 1;
          let query = supabase.from('contratos').select('*').range(from, to);
          if (rbd) {
            const cleanRbd = rbd.trim();
            const normRbd = normalizarRbd(cleanRbd);
            const zeroPadded = cleanRbd.padStart(5, '0');
            const matches = Array.from(new Set([cleanRbd, normRbd, zeroPadded])).filter(Boolean);
            query = query.or(matches.map(m => `rbd.eq.${m}`).join(','));
          }
          promises.push(query);
        }

        const results = await Promise.all(promises);
        for (const res of results) {
          if (res.error) throw res.error;
          if (res.data) allData.push(...res.data);
        }
      }

      // Merge with dbLocal contracts so local-only or un-synced contracts are preserved
      const localConts = rbd 
        ? dbLocal.contratos.filter(c => normalizarRbd(String(c.rbd)) === normalizarRbd(String(rbd))) 
        : dbLocal.contratos;

      const mergedMap = new Map<string, Contrato>();
      allData.forEach(c => mergedMap.set(c.id, c));
      localConts.forEach(c => {
        if (!mergedMap.has(c.id)) {
          mergedMap.set(c.id, c);
        }
      });
      return Array.from(mergedMap.values());
    } catch (error) {
      const fallback = rbd ? dbLocal.contratos.filter(c => c.rbd === rbd) : dbLocal.contratos;
      return handleFallback(error, fallback, 'contratos');
    }
  },

  getFinanciamientosPorContrato: async (contratoId: string): Promise<FinanciamientoContrato[]> => {
    try {
      const { data, error } = await supabase.from('financiamientos').select('*').eq('contrato_id', contratoId);
      if (error) return handleFallback(error, dbLocal.financiamientoContratos.filter(f => f.contrato_id === contratoId), 'financiamientos');
      
      const dbFins = data || [];
      const localFins = dbLocal.financiamientoContratos.filter(f => f.contrato_id === contratoId);
      const mergedMap = new Map<string, FinanciamientoContrato>();
      dbFins.forEach(f => mergedMap.set(f.id, f));
      localFins.forEach(f => {
        if (!mergedMap.has(f.id)) mergedMap.set(f.id, f);
      });
      return Array.from(mergedMap.values());
    } catch (err) {
      return handleFallback(err, dbLocal.financiamientoContratos.filter(f => f.contrato_id === contratoId), 'financiamientos');
    }
  },

  getFinanciamientosPorContratos: async (contratoIds: string[]): Promise<FinanciamientoContrato[]> => {
    if (contratoIds.length === 0) return [];
    try {
      const { data, error } = await supabase.from('financiamientos').select('*').in('contrato_id', contratoIds);
      if (error) return handleFallback(error, dbLocal.financiamientoContratos.filter(f => contratoIds.includes(f.contrato_id)), 'financiamientos');

      const dbFins = data || [];
      const localFins = dbLocal.financiamientoContratos.filter(f => contratoIds.includes(f.contrato_id));
      const mergedMap = new Map<string, FinanciamientoContrato>();
      dbFins.forEach(f => mergedMap.set(f.id, f));
      localFins.forEach(f => {
        if (!mergedMap.has(f.id)) mergedMap.set(f.id, f);
      });
      return Array.from(mergedMap.values());
    } catch (err) {
      return handleFallback(err, dbLocal.financiamientoContratos.filter(f => contratoIds.includes(f.contrato_id)), 'financiamientos');
    }
  },


  getFinanciamientos: async (): Promise<FinanciamientoContrato[]> => {
    try {
      // 1. Get exact total count first
      const { count, error: countErr } = await supabase
        .from('financiamientos')
        .select('*', { count: 'exact', head: true });

      if (countErr) return handleFallback(countErr, dbLocal.financiamientoContratos, 'financiamientos');
      const total = count || 0;
      if (total === 0) return [];

      // 2. Fetch all ranges concurrently
      const promises = [];
      const CHUNK_SIZE = 1000;
      for (let from = 0; from < total; from += CHUNK_SIZE) {
        const to = from + CHUNK_SIZE - 1;
        promises.push(
          supabase.from('financiamientos').select('*').range(from, to)
        );
      }

      const results = await Promise.all(promises);
      const allData: FinanciamientoContrato[] = [];
      for (const res of results) {
        if (res.error) return handleFallback(res.error, dbLocal.financiamientoContratos, 'financiamientos');
        if (res.data) allData.push(...res.data);
      }
      return allData;
    } catch (err) {
      return handleFallback(err, dbLocal.financiamientoContratos, 'financiamientos');
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
    const dbColumns = [
      'run', 'nombre', 'email', 'telefono', 'estamento', 'cargo', 'titulo',
      'grupo_estamento', 'calidad_juridica_p01', 'escalafon_p01', 'grado_eus',
      'genero', 'fecha_nacimiento'
    ];
    const dataObj: any = {};
    for (const col of dbColumns) {
      if ((funcionario as any)[col] !== undefined) {
        dataObj[col] = (funcionario as any)[col];
      }
    }
    if (dataObj.estamento === 'Docente' || dataObj.estamento === 'Asistente de la Educación') {
      dataObj.grupo_estamento = 'P02_Educacion';
    }
    try {
      const { error } = await supabase.from('funcionarios').upsert(dataObj, { onConflict: 'run' });
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
    const dbColumns = [
      'run', 'nombre', 'email', 'telefono', 'estamento', 'cargo', 'titulo',
      'grupo_estamento', 'calidad_juridica_p01', 'escalafon_p01', 'grado_eus',
      'genero', 'fecha_nacimiento'
    ];
    const list = funcionarios.map(f => {
      const dataObj: any = {};
      for (const col of dbColumns) {
        if ((f as any)[col] !== undefined) {
          dataObj[col] = (f as any)[col];
        }
      }
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
        const { error } = await withTimeout<any>(Promise.resolve(supabase.from('funcionarios').upsert(batch, { onConflict: 'run' })));
        if (error) throw error;
      } catch (error: any) {
        console.error("❌ ERROR PROFUNDO EN SUPABASE BULK FUNCIONARIOS:", error?.message || error, "\nDetalle completo:", JSON.stringify(error || {}, null, 2));
        console.warn("⚠️ Guardando funcionarios en local como fallback...");
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
    // DB columns of the contratos table (excluding joined virtual fields)
    const CONTRATO_DB_COLS = [
      'id', 'funcionario_run', 'rbd', 'calidad_juridica', 'funcion_principal', 'estado',
      'horas_totales', 'vinculo_titular_id', 'dias_trabajados', 'dias_licencia_medica',
      'inasistencias', 'legislacion_laboral', 'horas_directivas', 'horas_aula',
      'horas_colaborativas', 'es_uniprofesional', 'horas_tecnico_pedagogicas', 
      'fecha_inicio_licencia', 'fecha_termino_licencia'
    ];
    const sanitize = (c: Contrato): any => {
      const out: any = {};
      for (const col of CONTRATO_DB_COLS) {
        if ((c as any)[col] !== undefined) out[col] = (c as any)[col];
      }
      return out;
    };

    const withTimeout = <T>(p: Promise<T>, ms = 6000): Promise<T> => {
      return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout de base de datos")), ms))
      ]);
    };

    const batchSize = 100;
    for (let i = 0; i < contratos.length; i += batchSize) {
      const batch = contratos.slice(i, i + batchSize).map(sanitize);
      const { error } = await withTimeout<any>(Promise.resolve(supabase.from('contratos').upsert(batch)));
      if (error) {
        console.error("❌ ERROR PROFUNDO EN SUPABASE BULK CONTRATOS:", error.message, JSON.stringify(error));
        throw new Error(`Error al guardar contratos: ${error.message}`);
      }
    }

    const contratoIds = contratos.map(c => c.id);
    for (let i = 0; i < contratoIds.length; i += batchSize) {
      const batchIds = contratoIds.slice(i, i + batchSize);
      const { error } = await withTimeout<any>(Promise.resolve(supabase.from('financiamientos').delete().in('contrato_id', batchIds)));
      if (error) {
        console.warn("⚠️ Error in bulk delete financiamientos:", error);
      }
    }

    // Apply deterministic IDs based on ${contrato_id}-${origen_fondo} and consolidate duplicates
    const finMapBulk = new Map<string, FinanciamientoContrato>();
    financiamientos.forEach(f => {
      const key = `${f.contrato_id}-${f.origen_fondo}`;
      const h = Number(f.horas) || 0;
      const existing = finMapBulk.get(key);
      if (existing) {
        existing.horas = Number((existing.horas + h).toFixed(2));
      } else {
        finMapBulk.set(key, {
          ...f,
          id: key,
          horas: h
        });
      }
    });
    const sanitizedFins = Array.from(finMapBulk.values());

    for (let i = 0; i < sanitizedFins.length; i += batchSize) {
      const batch = sanitizedFins.slice(i, i + batchSize).map(({ id, ...rest }) => ({
        ...rest,
        id: `${rest.contrato_id}-${rest.origen_fondo}`
      }));
      if (batch.length > 0) {
        const { error } = await withTimeout<any>(Promise.resolve(supabase.from('financiamientos').insert(batch)));
        if (error) {
          console.error("❌ ERROR PROFUNDO EN SUPABASE UPSERT FINANCIAMIENTOS:", error.message, JSON.stringify(error));
          throw new Error(`Error al guardar financiamientos: ${error.message}`);
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

  deleteFuncionariosBulk: async (runs: string[]): Promise<void> => {
    if (runs.length === 0) return;
    let contratoIds: string[] = [];
    
    try {
      // 1. Obtener los IDs de los contratos vinculados a estos RUNs
      const { data } = await supabase.from('contratos').select('id').in('funcionario_run', runs);
      if (data) contratoIds = data.map(c => c.id);

      // 2. LIMPIEZA EN CASCADA COMPLETA (Para evitar Foreign Key Violations)
      // Borrar alertas de conciliación ligadas al RUN
      await supabase.from('alertas_conciliacion').delete().in('run', runs);
      // Borrar cargos personalizados del RUN
      await supabase.from('cargos_personalizados').delete().in('funcionario_run', runs);
      // Borrar libros de remuneraciones del RUN
      await supabase.from('libro_remuneraciones').delete().in('funcionario_run', runs);
      // Borrar tareas de reemplazo del RUN (tanto si es titular como reemplazo)
      await supabase.from('tareas_reemplazo').delete().in('funcionario_titular_run', runs);
      await supabase.from('tareas_reemplazo').delete().in('reemplazo_run', runs);
      // Borrar reemplazos de licencias donde el funcionario es el reemplazo
      await supabase.from('reemplazos_licencias').delete().in('reemplazo_run', runs);

      if (contratoIds.length > 0) {
        // Borrar asignaciones de aula vinculadas a los contratos
        await supabase.from('asignaciones_aula').delete().in('contrato_id', contratoIds);
        // Borrar financiamientos/subvenciones de los contratos
        await supabase.from('financiamientos').delete().in('contrato_id', contratoIds);
        // Borrar reemplazos de licencias vinculados al contrato titular
        await supabase.from('reemplazos_licencias').delete().in('contrato_titular_id', contratoIds);
        // Borrar los contratos físicos
        await supabase.from('contratos').delete().in('id', contratoIds);
      }

      // 3. Finalmente, borrar los funcionarios
      const { error } = await supabase.from('funcionarios').delete().in('run', runs);
      if (error) throw error;

    } catch (error: any) {
      console.error("❌ Error crítico en borrado masivo:", error.message);
      throw error;
    } finally {
      // Sincronización del estado local de respaldo
      dbLocal.funcionarios = dbLocal.funcionarios.filter(f => !runs.includes(f.run));
      dbLocal.contratos = dbLocal.contratos.filter(c => !runs.includes(c.funcionario_run));
      if (contratoIds.length > 0) {
        dbLocal.financiamientoContratos = dbLocal.financiamientoContratos.filter(
          f => !contratoIds.includes(f.contrato_id)
        );
        dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(
          a => !contratoIds.includes(a.contrato_id)
        );
      }
    }
  },

  upsertContratoCompleto: async (
    contrato: Contrato, 
    financiamientos: FinanciamientoContrato[],
    horasCronologicas: HorasCronologicasAdicionales[] = []
  ): Promise<void> => {
    // 1. Hard Cap 44-hour Integrity Validator
    const run = contrato.funcionario_run;
    let siblingConts: Contrato[] = [];
    let allCursos: CursoDinamico[] = [];
    let allAsigs: AsignacionAula[] = [];
    let allCron: HorasCronologicasAdicionales[] = [];

    try {
      const { data: cData } = await supabase.from('contratos').select('*').eq('funcionario_run', run);
      siblingConts = cData || [];
      const contIds = siblingConts.map(c => c.id);
      if (contIds.length > 0) {
        const { data: aData } = await supabase.from('asignaciones_aula').select('*').in('contrato_id', contIds);
        allAsigs = aData || [];
        const { data: crData } = await supabase.from('horas_cronologicas_adicionales').select('*').in('contrato_id', contIds);
        allCron = crData || [];
      }
      const { data: cuData } = await supabase.from('cursos_dinamicos').select('*');
      allCursos = cuData || [];
    } catch (e) {
      siblingConts = dbLocal.contratos.filter(c => normalizarRun(c.funcionario_run) === normalizarRun(run));
      const contIds = siblingConts.map(c => c.id);
      allAsigs = dbLocal.asignacionesAula.filter(a => contIds.includes(a.contrato_id));
      allCron = dbLocal.horasCronologicasAdicionales.filter(h => contIds.includes(h.contrato_id));
      allCursos = dbLocal.cursosDinamicos;
    }

    const validation = validarHardCap44Horas(
      run,
      siblingConts,
      allCursos,
      allAsigs,
      allCron,
      contrato,
      horasCronologicas
    );

    if (!validation.valido) {
      throw new Error(`Violación de Tope Laboral: El funcionario excede las 44 horas cronológicas permitidas en el Servicio Local.`);
    }

    // 2. Deterministic & Consolidated IDs for financiamientos
    const finMap = new Map<string, FinanciamientoContrato>();
    financiamientos.forEach(f => {
      const origen = f.origen_fondo;
      const key = `${contrato.id}-${origen}`;
      const h = Number(f.horas) || 0;
      const existing = finMap.get(key);
      if (existing) {
        existing.horas = Number((existing.horas + h).toFixed(2));
      } else {
        finMap.set(key, {
          ...f,
          id: key,
          contrato_id: contrato.id,
          origen_fondo: origen,
          horas: h
        });
      }
    });
    const sanitizedFins = Array.from(finMap.values());

    // Sanitized contract record for DB
    const CONTRATO_DB_COLS = [
      'id', 'funcionario_run', 'rbd', 'calidad_juridica', 'funcion_principal', 'estado',
      'horas_totales', 'vinculo_titular_id', 'dias_trabajados', 'dias_licencia_medica',
      'inasistencias', 'legislacion_laboral', 'horas_directivas', 'horas_aula',
      'horas_colaborativas', 'es_uniprofesional', 'horas_tecnico_pedagogicas', 
      'fecha_inicio_licencia', 'fecha_termino_licencia'
    ];
    const dbContrato: any = {};
    CONTRATO_DB_COLS.forEach(col => {
      let val = (contrato as any)[col];
      if (val === undefined) return;

      if (typeof val === 'number') {
        if (isNaN(val)) {
          val = 0;
        }
      } else if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') {
          val = null;
        } else {
          val = trimmed;
        }
      }
      dbContrato[col] = val;
    });

    if (dbContrato.rbd !== undefined && dbContrato.rbd !== null) {
      dbContrato.rbd = String(dbContrato.rbd);
    }

    const { error: cErr } = await supabase.from('contratos').upsert(dbContrato, { onConflict: 'id' });
    
    let delErr = null;
    let insErr = null;
    let delCrErr = null;
    let insCrErr = null;

    // Only attempt children insert if contract parent succeeded
    if (!cErr) {
      const { error: dErr } = await supabase.from('financiamientos').delete().eq('contrato_id', contrato.id);
      delErr = dErr;
      if (sanitizedFins.length > 0) {
        // Ensure non-null unique id for pure INSERT
        const finsForInsert = sanitizedFins.map(({ id, ...rest }) => ({
          ...rest,
          id: `${contrato.id}-${rest.origen_fondo}`,
          contrato_id: contrato.id
        }));
        const { error } = await supabase.from('financiamientos').insert(finsForInsert);
        insErr = error;
      }

      const { error: dCrErr } = await supabase.from('horas_cronologicas_adicionales').delete().eq('contrato_id', contrato.id);
      delCrErr = dCrErr;
      if (horasCronologicas.length > 0) {
        // Ensure non-null unique id for pure INSERT
        const horasCronologicasForInsert = horasCronologicas.map(({ id, ...rest }: any, idx: number) => ({
          ...rest,
          id: `${contrato.id}-hc-${idx}`,
          contrato_id: contrato.id
        }));
        const { error } = await supabase.from('horas_cronologicas_adicionales').insert(horasCronologicasForInsert);
        insCrErr = error;
      }
    }

    // Proactively sync local storage
    const contratosList = dbLocal.contratos;
    const cIndex = contratosList.findIndex(c => c.id === contrato.id);
    if (cIndex >= 0) {
      contratosList[cIndex] = contrato;
    } else {
      contratosList.push(contrato);
    }
    dbLocal.contratos = contratosList;

    let finList = dbLocal.financiamientoContratos.filter(f => f.contrato_id !== contrato.id);
    finList.push(...sanitizedFins);
    dbLocal.financiamientoContratos = finList;

    let cronList = dbLocal.horasCronologicasAdicionales.filter(h => h.contrato_id !== contrato.id);
    cronList.push(...horasCronologicas);
    dbLocal.horasCronologicasAdicionales = cronList;

    if (cErr || delErr || insErr || delCrErr || insCrErr) {
      console.error("❌ DETALLE COMPLETO ERRORES SUPABASE EN CONTRATO Y FINANCIAMIENTO:", {
        cErr: cErr ? { message: cErr.message, details: cErr.details, code: cErr.code, hint: cErr.hint, full: cErr } : null,
        delErr: delErr ? { message: delErr.message, details: delErr.details, code: delErr.code, hint: delErr.hint, full: delErr } : null,
        insErr: insErr ? { message: insErr.message, details: insErr.details, code: insErr.code, hint: insErr.hint, full: insErr } : null,
        delCrErr: delCrErr ? { message: delCrErr.message, details: delCrErr.details, code: delCrErr.code, hint: delCrErr.hint, full: delCrErr } : null,
        insCrErr: insCrErr ? { message: insCrErr.message, details: insCrErr.details, code: insCrErr.code, hint: insCrErr.hint, full: insCrErr } : null
      });
      console.warn("⚠️ Error en Supabase, guardando contrato completo en local:", { cErr, delErr, insErr, delCrErr, insCrErr });
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
    const { error: crErr } = await supabase.from('horas_cronologicas_adicionales').delete().eq('contrato_id', contratoId);
    const { error: cErr } = await supabase.from('contratos').delete().eq('id', contratoId);
    
    dbLocal.contratos = dbLocal.contratos.filter(c => c.id !== contratoId);
    dbLocal.financiamientoContratos = dbLocal.financiamientoContratos.filter(f => f.contrato_id !== contratoId);
    dbLocal.horasCronologicasAdicionales = dbLocal.horasCronologicasAdicionales.filter(h => h.contrato_id !== contratoId);
    dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => a.contrato_id !== contratoId);

    if (aErr || fErr || crErr || cErr) {
      console.warn("⚠️ Error en Supabase, eliminando contrato en local:", { aErr, fErr, crErr, cErr });
    }
  },

  saveAsignacion: async (asignacion: AsignacionAula): Promise<void> => {
    // Always keep local cache in sync
    const asignaciones = dbLocal.asignacionesAula;
    const idx = asignaciones.findIndex(a => a.id === asignacion.id);
    if (idx >= 0) {
      asignaciones[idx] = asignacion;
    } else {
      asignaciones.push(asignacion);
    }
    dbLocal.asignacionesAula = asignaciones;

    const { error } = await supabase.from('asignaciones_aula').upsert(asignacion);
    if (error) {
      console.warn("⚠️ Error en Supabase, guardando asignacion en local:", error);
    }
  },

  deleteAsignacion: async (id: string): Promise<void> => {
    // Always keep local cache in sync
    dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => a.id !== id);

    const { error } = await supabase.from('asignaciones_aula').delete().eq('id', id);
    if (error) {
      console.warn("⚠️ Error en Supabase, eliminando asignacion en local:", error);
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

  crearAlertasBulk: async (alertas: AlertaConciliacion[]): Promise<void> => {
    const { error } = await supabase.from('alertas_conciliacion').upsert(alertas);
    if (error) {
      console.error("❌ ERROR PROFUNDO EN SUPABASE BULK ALERTAS:", error.message, JSON.stringify(error));
      throw new Error(`Error al guardar alertas: ${error.message}`);
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
    
    // Detect column name format for prioritarios concentration in the live DB instance
    if (data && data.length > 0) {
      if ('concentracion_prioritarios' in data[0]) {
        detectedCursoConcentracionCol = 'concentracion_prioritarios';
      } else if ('concentracionPrioritarios' in data[0]) {
        detectedCursoConcentracionCol = 'concentracionPrioritarios';
      }
    }

    // Map DB columns to TS model (supports both snake_case and camelCase layouts)
    return (data || []).map(c => ({
      rbd: c.rbd,
      nombre: c.nombre,
      nivel: c.nivel,
      regimen: c.regimen,
      tipo_curso: c.tipo_curso || c.tipoCurso || 'Simple',
      niveles_combinados: c.niveles_combinados || c.nivelesCombinados || [],
      es_multigrado: c.es_multigrado !== undefined ? c.es_multigrado : (c.esMultigrado !== undefined ? c.esMultigrado : false),
      es_rural: c.es_rural !== undefined ? c.es_rural : (c.esRural !== undefined ? c.esRural : false),
      horasPIE: c.horasPIE !== undefined ? c.horasPIE : c.horas_pie,
      profesor_jefe_run: c.profesorJefeRun !== undefined ? c.profesorJefeRun : c.profesor_jefe_run,
      concentracion_prioritarios: c.concentracion_prioritarios !== undefined ? c.concentracion_prioritarios : c.concentracionPrioritarios,
      alumnos_neet: c.alumnos_neet !== undefined ? c.alumnos_neet : (c.alumnosNeet !== undefined ? c.alumnosNeet : 0),
      alumnos_neep: c.alumnos_neep !== undefined ? c.alumnos_neep : (c.alumnosNeep !== undefined ? c.alumnosNeep : 0)
    }));
  },

  crearCursoDinamico: async (curso: CursoDinamico): Promise<void> => {
    // Columns alumnos_neet, alumnos_neep, tipo_curso, etc. are saved with fallbacks
    const dbCurso: any = {
      rbd: curso.rbd,
      nombre: curso.nombre,
      nivel: curso.nivel,
      regimen: curso.regimen,
      tipo_curso: curso.tipo_curso || 'Simple',
      niveles_combinados: curso.niveles_combinados || [],
      es_multigrado: curso.es_multigrado ?? false,
      es_rural: curso.es_rural ?? false,
      horas_pie: curso.horasPIE ?? null,
      profesor_jefe_run: curso.profesor_jefe_run ?? null,
      concentracion_prioritarios: curso.concentracion_prioritarios ?? 0,
      alumnos_neet: curso.alumnos_neet ?? 0,
      alumnos_neep: curso.alumnos_neep ?? 0
    };

    let { error } = await supabase.from('cursos_dinamicos').upsert(dbCurso, { onConflict: 'rbd,nombre' });
    if (error && (error.message.includes('column') || error.code === '42703')) {
      console.warn("⚠️ Columnas avanzadas no existen aún en Supabase de producción. Se reintenta con campos básicos.");
      const dbCursoFallback = {
        rbd: curso.rbd,
        nombre: curso.nombre,
        nivel: curso.nivel,
        regimen: curso.regimen,
        horas_pie: curso.horasPIE ?? null,
        profesor_jefe_run: curso.profesor_jefe_run ?? null,
        concentracion_prioritarios: curso.concentracion_prioritarios ?? 0
      };
      const retry = await supabase.from('cursos_dinamicos').upsert(dbCursoFallback, { onConflict: 'rbd,nombre' });
      error = retry.error;
    }

    // Always update localStorage immediately so UI reflects the change
    const list = dbLocal.cursosDinamicos;
    const index = list.findIndex(c => c.rbd === curso.rbd && c.nombre === curso.nombre);
    if (index >= 0) {
      list[index] = { ...curso };
    } else {
      list.push({ ...curso });
    }
    dbLocal.cursosDinamicos = list;

    if (error) {
      console.error("❌ Error en Supabase al crear curso dinámico:", error);
      throw error;
    }
  },

  eliminarCursoDinamico: async (rbd: string, nombre: string): Promise<void> => {
    // Delete children (asignaturas) first - use cursoNombre (camelCase) which is the real DB column
    await supabase.from('asignaturas_dinamicas').delete().eq('rbd', rbd).eq('cursoNombre', nombre);
    const { data: contratos } = await supabase.from('contratos').select('id').eq('rbd', rbd);
    if (contratos && contratos.length > 0) {
      const ids = contratos.map(c => c.id);
      await supabase.from('asignaciones_aula').delete().eq('curso', nombre).in('contrato_id', ids);
    }
    const { error } = await supabase.from('cursos_dinamicos').delete().eq('rbd', rbd).eq('nombre', nombre);
    // Always update local storage
    dbLocal.cursosDinamicos = dbLocal.cursosDinamicos.filter(c => !(c.rbd === rbd && c.nombre === nombre));
    dbLocal.asignaturasDinamicas = dbLocal.asignaturasDinamicas.filter(a => !(a.rbd === rbd && a.cursoNombre === nombre));
    const conts = dbLocal.contratos.filter(c => c.rbd === rbd);
    const contIds = conts.map(c => c.id);
    dbLocal.asignacionesAula = dbLocal.asignacionesAula.filter(a => !(a.curso === nombre && contIds.includes(a.contrato_id)));
    if (error) {
      console.error("❌ Error en Supabase al eliminar curso dinámico:", error);
    }
  },

  getAsignaturasDinamicas: async (rbd: string, cursoNombre: string): Promise<AsignaturaDinamica[]> => {
    // DB column is cursoNombre (camelCase) — filter directly on that column
    const { data, error } = await supabase
      .from('asignaturas_dinamicas')
      .select('*')
      .eq('rbd', rbd)
      .eq('cursoNombre', cursoNombre);
    if (error) return handleFallback(error, dbLocal.asignaturasDinamicas.filter(a => a.rbd === rbd && a.cursoNombre === cursoNombre), 'asignaturas_dinamicas');
    return (data || []).map(a => ({
      rbd: a.rbd,
      cursoNombre: a.cursoNombre,
      nombre: a.nombre,
      horasSugeridas: a.horasSugeridas
    }));
  },

  crearAsignaturaDinamica: async (asignatura: AsignaturaDinamica): Promise<void> => {
    // DB columns are cursoNombre and horasSugeridas (camelCase in the live Supabase instance)
    const dbAsig = {
      rbd: asignatura.rbd,
      cursoNombre: asignatura.cursoNombre,
      nombre: asignatura.nombre,
      horasSugeridas: asignatura.horasSugeridas
    };
    const { error } = await supabase.from('asignaturas_dinamicas').upsert(dbAsig, { onConflict: 'rbd,cursoNombre,nombre' });
    
    if (error) {
      const errorMsg = error.message || '';
      // If cursoNombre does not exist, retry with curso_nombre
      if (error.code === '42703' || errorMsg.includes('cursoNombre') || errorMsg.includes('does not exist')) {
        console.warn("⚠️ Column 'cursoNombre' not found. Retrying with 'curso_nombre'.");
        const snakeAsig = {
          rbd: asignatura.rbd,
          curso_nombre: asignatura.cursoNombre,
          nombre: asignatura.nombre,
          horas_sugeridas: asignatura.horasSugeridas
        };
        const { error: retryError } = await supabase.from('asignaturas_dinamicas').upsert(snakeAsig, { onConflict: 'rbd,curso_nombre,nombre' });
        if (retryError) {
          console.error("❌ Retry with snake_case asignatura failed:", retryError);
          throw retryError;
        }
      } else {
        console.error("❌ Error en Supabase al crear asignatura dinámica:", error);
        throw error;
      }
    }

    // Always update local storage
    const list = dbLocal.asignaturasDinamicas;
    const index = list.findIndex(a => a.rbd === asignatura.rbd && a.cursoNombre === asignatura.cursoNombre && a.nombre === asignatura.nombre);
    if (index >= 0) {
      list[index] = asignatura;
    } else {
      list.push(asignatura);
    }
    dbLocal.asignaturasDinamicas = list;
    if (error) {
      console.error("❌ Error en Supabase al crear asignatura dinámica:", error);
      throw error;
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
    try {
      const { data, error } = await supabase.from('tareas_reemplazo').select('*');
      if (error) {
        console.warn("⚠️ Error en Supabase al obtener tareas de reemplazo:", error);
        return handleFallback(error, dbLocal.tareasReemplazo, 'tareas_reemplazo');
      }
      const dbList: TareaReemplazo[] = (data || []).map(row => ({
        id: row.id,
        rbd: row.rbd,
        funcionario_titular_run: row.funcionario_titular_run,
        horas_a_cubrir: Number(row.horas_reemplazo),
        estado: row.estado,
        reemplazo_run: row.reemplazo_run || undefined
      }));
      const localList = dbLocal.tareasReemplazo;
      const mergedMap = new Map<string, TareaReemplazo>();
      dbList.forEach(t => mergedMap.set(t.id, t));
      localList.forEach(t => {
        if (!mergedMap.has(t.id)) mergedMap.set(t.id, t);
      });
      return Array.from(mergedMap.values());
    } catch (err) {
      return handleFallback(err, dbLocal.tareasReemplazo, 'tareas_reemplazo');
    }
  },

  crearTareaReemplazo: async (tarea: TareaReemplazo): Promise<void> => {
    const list = [...dbLocal.tareasReemplazo.filter(t => t.id !== tarea.id), tarea];
    dbLocal.tareasReemplazo = list;

    const dbRow = {
      id: tarea.id,
      rbd: tarea.rbd,
      funcionario_titular_run: tarea.funcionario_titular_run,
      horas_reemplazo: tarea.horas_a_cubrir,
      estado: tarea.estado,
      reemplazo_run: tarea.reemplazo_run || null,
      motivo: (tarea as any).motivo || 'Licencia Médica',
      fecha_inicio: (tarea as any).fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_termino: (tarea as any).fecha_termino || new Date().toISOString().split('T')[0]
    };
    const { error } = await supabase.from('tareas_reemplazo').upsert(dbRow, { onConflict: 'id' });
    if (error) {
      console.warn("⚠️ Error en Supabase, creando tarea de reemplazo en local:", error);
    }
  },

  resolverTareaReemplazo: async (id: string, reemplazoRun: string): Promise<void> => {
    const list = dbLocal.tareasReemplazo.map(t => {
      if (t.id === id) {
        return { ...t, estado: 'Asignado' as const, reemplazo_run: reemplazoRun };
      }
      return t;
    });
    dbLocal.tareasReemplazo = list;

    const { error } = await supabase.from('tareas_reemplazo').update({ estado: 'Asignado', reemplazo_run: reemplazoRun }).eq('id', id);
    if (error) {
      console.warn("⚠️ Error en Supabase, resolviendo tarea de reemplazo en local:", error);
    }
  },

  getReemplazosLicencias: async (): Promise<ReemplazoDetalle[]> => {
    try {
      const { data, error } = await supabase.from('reemplazos_licencias').select('*');
      if (error) {
        console.warn("⚠️ Error en Supabase al obtener reemplazos de licencias:", error);
        return handleFallback(error, dbLocal.reemplazosLicencias, 'reemplazos_licencias');
      }
      const dbList: ReemplazoDetalle[] = data || [];
      const localList = dbLocal.reemplazosLicencias;
      const mergedMap = new Map<string, ReemplazoDetalle>();
      dbList.forEach(r => mergedMap.set(r.id, r));
      localList.forEach(r => {
        if (!mergedMap.has(r.id)) mergedMap.set(r.id, r);
      });
      return Array.from(mergedMap.values());
    } catch (err) {
      return handleFallback(err, dbLocal.reemplazosLicencias, 'reemplazos_licencias');
    }
  },

  saveReemplazoLicencia: async (r: ReemplazoDetalle): Promise<void> => {
    const list = dbLocal.reemplazosLicencias.filter(x => x.id !== r.id);
    dbLocal.reemplazosLicencias = [...list, r];

    const { error } = await supabase.from('reemplazos_licencias').upsert(r, { onConflict: 'id' });
    if (error) {
      console.warn("⚠️ Error en Supabase, guardando reemplazo en local:", error);
    }
  },

  deleteReemplazoLicencia: async (id: string): Promise<void> => {
    dbLocal.reemplazosLicencias = dbLocal.reemplazosLicencias.filter(r => r.id !== id);
    const { error } = await supabase.from('reemplazos_licencias').delete().eq('id', id);
    if (error) {
      console.warn("⚠️ Error en Supabase, eliminando reemplazo en local:", error);
    }
  },

  getTodasLasAsignaciones: async (): Promise<AsignacionAula[]> => {
    const { data, error } = await supabase.from('asignaciones_aula').select('*');
    if (error) return handleFallback(error, dbLocal.asignacionesAula, 'asignaciones_aula');
    if (data) dbLocal.asignacionesAula = data;
    return data || [];
  },

  getTodosLosCursosDinamicos: async (): Promise<CursoDinamico[]> => {
    const { data, error } = await supabase.from('cursos_dinamicos').select('*');
    if (error) return handleFallback(error, dbLocal.cursosDinamicos, 'cursos_dinamicos');
    const result = (data || []).map(c => ({
      rbd: c.rbd,
      nombre: c.nombre,
      nivel: c.nivel,
      regimen: c.regimen,
      horasPIE: c.horas_pie,
      profesor_jefe_run: c.profesor_jefe_run,
      concentracion_prioritarios: c.concentracion_prioritarios
    }));
    if (result.length > 0) dbLocal.cursosDinamicos = result;
    return result;
  },

  getTodasLasAsignaturasDinamicas: async (): Promise<AsignaturaDinamica[]> => {
    const { data, error } = await supabase.from('asignaturas_dinamicas').select('*');
    if (error) return handleFallback(error, dbLocal.asignaturasDinamicas, 'asignaturas_dinamicas');
    const result = (data || []).map(a => ({
      rbd: a.rbd,
      cursoNombre: a.curso_nombre,
      nombre: a.nombre,
      horasSugeridas: a.horas_sugeridas
    }));
    if (result.length > 0) dbLocal.asignaturasDinamicas = result;
    return result;
  },

  getTodosLosCargosPersonalizados: async (): Promise<CargoPersonalizado[]> => {
    const { data, error } = await supabase.from('cargos_personalizados').select('*');
    if (error) return handleFallback(error, dbLocal.cargosPersonalizados, 'cargos_personalizados');
    if (data) dbLocal.cargosPersonalizados = data;
    return data || [];
  },

  getHorasCronologicasAdicionales: async (contratoId?: string): Promise<HorasCronologicasAdicionales[]> => {
    try {
      let query = supabase.from('horas_cronologicas_adicionales').select('*');
      if (contratoId) {
        query = query.eq('contrato_id', contratoId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        contrato_id: row.contrato_id,
        tipo: row.tipo,
        horas: Number(row.horas)
      }));
    } catch (error) {
      const fallback = contratoId 
        ? dbLocal.horasCronologicasAdicionales.filter(h => h.contrato_id === contratoId)
        : dbLocal.horasCronologicasAdicionales;
      return handleFallback(error, fallback, 'horas_cronologicas_adicionales');
    }
  },

  getBrechasVacantes: async (rbd?: string): Promise<BrechaCargoVacante[]> => {
    try {
      let query = supabase.from('brechas_vacantes').select('*');
      if (rbd) {
        query = query.eq('rbd', rbd);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      const fallback = rbd ? dbLocal.brechasVacantes.filter(b => b.rbd === rbd) : dbLocal.brechasVacantes;
      return handleFallback(error, fallback, 'brechas_vacantes');
    }
  },

  crearSolicitudVacante: async (vacante: BrechaCargoVacante): Promise<void> => {
    const current = dbLocal.brechasVacantes;
    const idx = current.findIndex(b => b.id === vacante.id);
    if (idx >= 0) {
      current[idx] = vacante;
    } else {
      current.push(vacante);
    }
    dbLocal.brechasVacantes = current;

    const alerta: AlertaConciliacion = {
      id: `alt-vac-${vacante.id}`,
      run: vacante.profesional_externo?.run || 'EXTERNO',
      nombre_funcionario: vacante.profesional_externo?.nombre || `Vacante ${vacante.nombre_cargo}`,
      rbd: vacante.rbd,
      tipo: 'cargo_vacante_excepcional',
      nivel_alerta: 'advertencia',
      mensaje: `📋 Solicitud de Vacante / Propuesta Excepcional (${vacante.nombre_cargo}) - ${vacante.horas_requeridas} hrs`,
      detalle: `El Director solicita cobertura para "${vacante.nombre_cargo}" (${vacante.horas_requeridas} hrs). Justificación: ${vacante.justificacion}. ${
        vacante.es_propuesta_excepcional 
          ? `Propuesta Excepcional Externa: ${vacante.profesional_externo?.nombre} (RUN: ${vacante.profesional_externo?.run}, Título: ${vacante.profesional_externo?.titulo}).` 
          : 'Búsqueda en red interna finalizada sin coincidencia.'
      }`,
      resuelta: false,
      solicitud_vacante_id: vacante.id,
      datos_propuesta_excepcional: {
        nombre_cargo: vacante.nombre_cargo,
        horas_solicitadas: vacante.horas_requeridas,
        justificacion: vacante.justificacion,
        run_externo: vacante.profesional_externo?.run,
        nombre_externo: vacante.profesional_externo?.nombre,
        titulo_externo: vacante.profesional_externo?.titulo,
        es_propuesta_excepcional: vacante.es_propuesta_excepcional,
        estado_solicitud: vacante.estado
      }
    };

    await api.crearAlerta(alerta);

    const { error } = await supabase.from('brechas_vacantes').upsert(vacante);
    if (error) {
      console.warn("⚠️ Error guardando brechas_vacantes en Supabase:", error);
    }
  },

  responderSolicitudVacante: async (id: string, respuesta: 'Aprobado' | 'Rechazado'): Promise<void> => {
    const current = dbLocal.brechasVacantes;
    const item = current.find(b => b.id === id);
    if (item) {
      item.estado = respuesta;
      dbLocal.brechasVacantes = current;
    }

    const alertas = dbLocal.alertas;
    const alt = alertas.find(a => a.solicitud_vacante_id === id);
    if (alt) {
      alt.resuelta = true;
      if (alt.datos_propuesta_excepcional) {
        alt.datos_propuesta_excepcional.estado_solicitud = respuesta;
      }
      dbLocal.alertas = alertas;
      await supabase.from('alertas_conciliacion').upsert(alt);
    }

    const { error } = await supabase.from('brechas_vacantes').update({ estado: respuesta }).eq('id', id);
    if (error) {
      console.warn("⚠️ Error actualizando brechas_vacantes en Supabase:", error);
    }
  },

  scheduleCloudSync: async (): Promise<void> => {},
  pullCloudSync: async (): Promise<boolean> => { return false; },
  pushCloudSyncForce: async (): Promise<void> => {}
};
