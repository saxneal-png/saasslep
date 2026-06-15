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
    if (typeof window === 'undefined') return;
    const clave = 'slep_global_prod_db_v1';

    if ((window as any).slepSyncTimeout) {
      clearTimeout((window as any).slepSyncTimeout);
    }

    (window as any).slepSyncTimeout = setTimeout(async () => {
      try {
        const keys = [
          'establecimientos', 'funcionarios', 'contratos', 'financiamientos',
          'asignaciones', 'alertas', 'tutelas', 'cursos_dinamicos',
          'asignaturas_dinamicas', 'supervisores', 'cargos_personalizados',
          'planes_estudio_json', 'comunas', 'libro_remuneraciones',
          'tareas_reemplazo', 'reemplazos_licencias'
        ];
        const backup: Record<string, any> = {};
        keys.forEach(k => {
          const item = localStorage.getItem(`slep_db_${k}`);
          if (item) {
            backup[k] = JSON.parse(item);
          }
        });
        backup._timestamp = Date.now();
        localStorage.setItem('slep_db__timestamp', backup._timestamp.toString());

        await fetch(`https://kvdb.io/slep_bucket_${clave}/slep_sync_db`, {
          method: 'POST',
          body: JSON.stringify(backup),
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('☁️ Sincronización en la nube global exitosa.');
      } catch (err) {
        console.error('Error al sincronizar con la nube global:', err);
      }
    }, 1000);
  }

  public async pushCloudSyncForce(): Promise<void> {
    if (typeof window === 'undefined') return;
    const clave = 'slep_global_prod_db_v1';
    try {
      const keys = [
        'establecimientos', 'funcionarios', 'contratos', 'financiamientos',
        'asignaciones', 'alertas', 'tutelas', 'cursos_dinamicos',
        'asignaturas_dinamicas', 'supervisores', 'cargos_personalizados',
        'planes_estudio_json', 'comunas', 'libro_remuneraciones',
        'tareas_reemplazo', 'reemplazos_licencias'
      ];
      const backup: Record<string, any> = {};
      keys.forEach(k => {
        backup[k] = (this as any)[k];
      });
      backup._timestamp = Date.now();
      localStorage.setItem('slep_db__timestamp', backup._timestamp.toString());

      await fetch(`https://kvdb.io/slep_bucket_${clave}/slep_sync_db`, {
        method: 'POST',
        body: JSON.stringify(backup),
        headers: { 'Content-Type': 'application/json' }
      });
      localStorage.setItem('slep_db_initialized', 'true');
      console.log('☁️ Base de datos global inicializada en la nube.');
    } catch (err) {
      console.error('Error al inicializar la nube:', err);
    }
  }

  public async pullCloudSync(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const clave = 'slep_global_prod_db_v1';

    try {
      const res = await fetch(`https://kvdb.io/slep_bucket_${clave}/slep_sync_db`);
      if (res.ok) {
        const backup = await res.json();
        const localTimestamp = parseInt(localStorage.getItem('slep_db__timestamp') || '0', 10);
        const remoteTimestamp = backup._timestamp || 0;

        if (remoteTimestamp !== localTimestamp || !localStorage.getItem('slep_db_initialized')) {
          const oldContratos = [...this.contratos];
          const oldAsignaciones = [...this.asignacionesAula];
          const oldAlertas = [...this.alertas];

          Object.keys(backup).forEach(k => {
            if (k === '_timestamp') {
              localStorage.setItem('slep_db__timestamp', backup[k].toString());
            } else {
              localStorage.setItem(`slep_db_${k}`, JSON.stringify(backup[k]));
            }
          });
          localStorage.setItem('slep_db_initialized', 'true');
          console.log('☁️ Datos actualizados desde la nube global.');

          // Dispatch Postgres simulation diff events
          const newContratos = this.contratos;
          const newAsignaciones = this.asignacionesAula;
          const newAlertas = this.alertas;

          const dispatchDiffs = (table: string, oldArr: any[], newArr: any[], idKey = 'id') => {
            newArr.forEach(newItem => {
              const oldItem = oldArr.find(o => o[idKey] === newItem[idKey]);
              if (!oldItem) {
                window.dispatchEvent(new CustomEvent('supabase_postgres_changes', {
                  detail: { table, eventType: 'INSERT', new: newItem }
                }));
              } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
                window.dispatchEvent(new CustomEvent('supabase_postgres_changes', {
                  detail: { table, eventType: 'UPDATE', new: newItem }
                }));
              }
            });
            oldArr.forEach(oldItem => {
              const newItem = newArr.find(n => n[idKey] === oldItem[idKey]);
              if (!newItem) {
                window.dispatchEvent(new CustomEvent('supabase_postgres_changes', {
                  detail: { table, eventType: 'DELETE', old: oldItem }
                }));
              }
            });
          };

          dispatchDiffs('contratos', oldContratos, newContratos, 'id');
          dispatchDiffs('asignaciones_aula', oldAsignaciones, newAsignaciones, 'id');
          dispatchDiffs('alertas_conciliacion', oldAlertas, newAlertas, 'id');

          return true;
        }
      } else if (res.status === 404) {
        await this.pushCloudSyncForce();
      }
    } catch (err) {
      console.error('Error al descargar datos de la nube:', err);
    }
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

export const api = {
  getEstablecimientos: async (): Promise<Establecimiento[]> => {
    const { data, error } = await supabase.from('establecimientos').select('*');
    if (error) console.error(error);
    return data || [];
  },

  getEstablecimientoByRbd: async (rbd: string): Promise<Establecimiento | undefined> => {
    const { data, error } = await supabase.from('establecimientos').select('*').eq('rbd', rbd).maybeSingle();
    if (error) console.error(error);
    return data || undefined;
  },

  upsertEstablecimiento: async (est: Establecimiento): Promise<void> => {
    const { error } = await supabase.from('establecimientos').upsert(est);
    if (error) console.error(error);
  },

  deleteEstablecimiento: async (rbd: string): Promise<void> => {
    const { error } = await supabase.from('establecimientos').delete().eq('rbd', rbd);
    if (error) console.error(error);
  },

  getFuncionarios: async (): Promise<Funcionario[]> => {
    const { data, error } = await supabase.from('funcionarios').select('*');
    if (error) console.error(error);
    return data || [];
  },

  getContratos: async (rbd?: string): Promise<Contrato[]> => {
    let query = supabase.from('contratos').select('*');
    if (rbd) {
      query = query.eq('rbd', rbd);
    }
    const { data, error } = await query;
    if (error) console.error(error);
    return data || [];
  },

  getFinanciamientosPorContrato: async (contratoId: string): Promise<FinanciamientoContrato[]> => {
    const { data, error } = await supabase.from('financiamientos').select('*').eq('contrato_id', contratoId);
    if (error) console.error(error);
    return data || [];
  },

  getAsignacionesPorEstablecimiento: async (rbd: string): Promise<AsignacionAula[]> => {
    const { data: contratos } = await supabase.from('contratos').select('id').eq('rbd', rbd);
    if (!contratos || contratos.length === 0) return [];
    const ids = contratos.map(c => c.id);
    const { data, error } = await supabase.from('asignaciones_aula').select('*').in('contrato_id', ids);
    if (error) console.error(error);
    return data || [];
  },

  getAlertas: async (rbd?: string): Promise<AlertaConciliacion[]> => {
    let query = supabase.from('alertas_conciliacion').select('*');
    if (rbd) {
      query = query.eq('rbd', rbd);
    }
    const { data, error } = await query;
    if (error) console.error(error);
    return data || [];
  },

  upsertFuncionario: async (funcionario: Funcionario): Promise<void> => {
    const { error } = await supabase.from('funcionarios').upsert(funcionario);
    if (error) console.error(error);
  },

  deleteFuncionario: async (run: string): Promise<void> => {
    const { error } = await supabase.from('funcionarios').delete().eq('run', run);
    if (error) console.error(error);
  },

  upsertContratoCompleto: async (
    contrato: Contrato, 
    financiamientos: FinanciamientoContrato[]
  ): Promise<void> => {
    const { error: cErr } = await supabase.from('contratos').upsert(contrato);
    if (cErr) console.error(cErr);
    
    const { error: delErr } = await supabase.from('financiamientos').delete().eq('contrato_id', contrato.id);
    if (delErr) console.error(delErr);

    if (financiamientos.length > 0) {
      const { error: insErr } = await supabase.from('financiamientos').insert(financiamientos);
      if (insErr) console.error(insErr);
    }
  },

  updateContratoEstado: async (
    contratoId: string, 
    estado: EstadoContrato, 
    vinculoTitularId: string | null = null
  ): Promise<void> => {
    const { error } = await supabase.from('contratos').update({ estado, vinculo_titular_id: vinculoTitularId }).eq('id', contratoId);
    if (error) console.error(error);
  },

  deleteContrato: async (contratoId: string): Promise<void> => {
    await supabase.from('asignaciones_aula').delete().eq('contrato_id', contratoId);
    await supabase.from('financiamientos').delete().eq('contrato_id', contratoId);
    const { error } = await supabase.from('contratos').delete().eq('id', contratoId);
    if (error) console.error(error);
  },

  saveAsignacion: async (asignacion: AsignacionAula): Promise<void> => {
    const { error } = await supabase.from('asignaciones_aula').upsert(asignacion);
    if (error) console.error(error);
  },

  deleteAsignacion: async (id: string): Promise<void> => {
    const { error } = await supabase.from('asignaciones_aula').delete().eq('id', id);
    if (error) console.error(error);
  },

  crearAlerta: async (alerta: AlertaConciliacion): Promise<void> => {
    const { error } = await supabase.from('alertas_conciliacion').upsert(alerta);
    if (error) console.error(error);
  },

  resolverAlerta: async (alertaId: string): Promise<void> => {
    const { error } = await supabase.from('alertas_conciliacion').update({ resuelta: true }).eq('id', alertaId);
    if (error) console.error(error);
  },

  limpiarAlertasPorRbd: async (rbd: string): Promise<void> => {
    const { error } = await supabase.from('alertas_conciliacion').delete().eq('rbd', rbd).eq('resuelta', true);
    if (error) console.error(error);
  },

  getTutelasPorProfesional: async (profesionalRun: string): Promise<string[]> => {
    const { data, error } = await supabase.from('tutelas').select('establecimiento_rbd').eq('profesional_run', profesionalRun);
    if (error) console.error(error);
    return data ? data.map(t => t.establecimiento_rbd) : [];
  },

  getTodasLasTutelas: async (): Promise<ProfesionalEscuelaAsignada[]> => {
    const { data, error } = await supabase.from('tutelas').select('*');
    if (error) console.error(error);
    return data || [];
  },

  asignarEscuelaAProfesional: async (profesionalRun: string, rbd: string): Promise<void> => {
    const { error } = await supabase.from('tutelas').upsert({ profesional_run: profesionalRun, establecimiento_rbd: rbd });
    if (error) console.error(error);
  },

  removerEscuelaDeProfesional: async (profesionalRun: string, rbd: string): Promise<void> => {
    const { error } = await supabase.from('tutelas').delete().eq('profesional_run', profesionalRun).eq('establecimiento_rbd', rbd);
    if (error) console.error(error);
  },

  getCursosDinamicos: async (rbd: string): Promise<CursoDinamico[]> => {
    const { data, error } = await supabase.from('cursos_dinamicos').select('*').eq('rbd', rbd);
    if (error) console.error(error);
    return data || [];
  },

  crearCursoDinamico: async (curso: CursoDinamico): Promise<void> => {
    const { error } = await supabase.from('cursos_dinamicos').upsert(curso);
    if (error) console.error(error);
  },

  eliminarCursoDinamico: async (rbd: string, nombre: string): Promise<void> => {
    await supabase.from('asignaturas_dinamicas').delete().eq('rbd', rbd).eq('cursoNombre', nombre);
    const { data: contratos } = await supabase.from('contratos').select('id').eq('rbd', rbd);
    if (contratos && contratos.length > 0) {
      const ids = contratos.map(c => c.id);
      await supabase.from('asignaciones_aula').delete().eq('curso', nombre).in('contrato_id', ids);
    }
    const { error } = await supabase.from('cursos_dinamicos').delete().eq('rbd', rbd).eq('nombre', nombre);
    if (error) console.error(error);
  },

  getAsignaturasDinamicas: async (rbd: string, cursoNombre: string): Promise<AsignaturaDinamica[]> => {
    const { data, error } = await supabase.from('asignaturas_dinamicas').select('*').eq('rbd', rbd).eq('cursoNombre', cursoNombre);
    if (error) console.error(error);
    return data || [];
  },

  crearAsignaturaDinamica: async (asignatura: AsignaturaDinamica): Promise<void> => {
    const { error } = await supabase.from('asignaturas_dinamicas').upsert(asignatura);
    if (error) console.error(error);
  },

  getSupervisores: async (): Promise<Supervisor[]> => {
    const { data, error } = await supabase.from('supervisores').select('*');
    if (error) console.error(error);
    return data || [];
  },

  upsertSupervisor: async (sup: Supervisor): Promise<void> => {
    const { error: supErr } = await supabase.from('supervisores').upsert(sup);
    if (supErr) console.error(supErr);
    
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
    if (error) console.error(error);
    await api.deleteFuncionario(run);
  },

  getCargosPorEstablecimiento: async (rbd: string): Promise<CargoPersonalizado[]> => {
    const { data, error } = await supabase.from('cargos_personalizados').select('*').eq('rbd', rbd);
    if (error) console.error(error);
    return data || [];
  },

  crearCargoPersonalizado: async (cargo: CargoPersonalizado): Promise<void> => {
    const { error } = await supabase.from('cargos_personalizados').upsert(cargo);
    if (error) console.error(error);
  },

  removerCargoPersonalizado: async (id: string): Promise<void> => {
    const { error } = await supabase.from('cargos_personalizados').delete().eq('id', id);
    if (error) console.error(error);
  },

  getPlanesEstudio: async (): Promise<PlanEstudioNorm[]> => {
    const { data, error } = await supabase.from('planes_estudio').select('*');
    if (error) console.error(error);
    return data || [];
  },

  guardarPlanesEstudio: async (planes: PlanEstudioNorm[]): Promise<void> => {
    await supabase.from('planes_estudio').delete().neq('nivel', 'PLACEHOLDER_THAT_NEVER_MATCHES');
    const { error } = await supabase.from('planes_estudio').insert(planes);
    if (error) console.error(error);
  },

  getComunas: async (): Promise<string[]> => {
    const { data, error } = await supabase.from('comunas').select('nombre');
    if (error) console.error(error);
    return data ? data.map((c: any) => c.nombre) : [];
  },

  addComuna: async (comuna: string): Promise<void> => {
    const { error } = await supabase.from('comunas').upsert({ nombre: comuna });
    if (error) console.error(error);
  },

  deleteComuna: async (comuna: string): Promise<void> => {
    const { error } = await supabase.from('comunas').delete().eq('nombre', comuna);
    if (error) console.error(error);
  },

  getRemuneraciones: async (): Promise<RegistroRemuneracion[]> => {
    const { data, error } = await supabase.from('libro_remuneraciones').select('*');
    if (error) console.error(error);
    return data || [];
  },

  cargarRemuneraciones: async (registros: RegistroRemuneracion[]): Promise<void> => {
    await supabase.from('libro_remuneraciones').delete().neq('id', 'PLACEHOLDER');
    const { error } = await supabase.from('libro_remuneraciones').insert(registros);
    if (error) console.error(error);
  },

  getTareasReemplazo: async (): Promise<TareaReemplazo[]> => {
    const { data, error } = await supabase.from('tareas_reemplazo').select('*');
    if (error) console.error(error);
    return data || [];
  },

  crearTareaReemplazo: async (tarea: TareaReemplazo): Promise<void> => {
    const { error } = await supabase.from('tareas_reemplazo').insert(tarea);
    if (error) console.error(error);
  },

  resolverTareaReemplazo: async (id: string, reemplazoRun: string): Promise<void> => {
    const { error } = await supabase.from('tareas_reemplazo').update({ estado: 'Asignado', reemplazo_run: reemplazoRun }).eq('id', id);
    if (error) console.error(error);
  },

  getReemplazosLicencias: async (): Promise<ReemplazoDetalle[]> => {
    const { data, error } = await supabase.from('reemplazos_licencias').select('*');
    if (error) console.error(error);
    return data || [];
  },

  saveReemplazoLicencia: async (r: ReemplazoDetalle): Promise<void> => {
    const { error } = await supabase.from('reemplazos_licencias').insert(r);
    if (error) console.error(error);
  },

  deleteReemplazoLicencia: async (id: string): Promise<void> => {
    const { error } = await supabase.from('reemplazos_licencias').delete().eq('id', id);
    if (error) console.error(error);
  },

  scheduleCloudSync: async (): Promise<void> => {},
  pullCloudSync: async (): Promise<boolean> => { return false; },
  pushCloudSyncForce: async (): Promise<void> => {}
};
