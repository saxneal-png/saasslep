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
  TareaReemplazo
} from './types';

// --- Constantes iniciales (Mock) ---
const COMUNAS = ['Bulnes', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'San Ignacio', 'Yungay', 'Quillón'];

const NOMBRES_ESCUELAS = [
  'Liceo Polivalente Manuel Bulnes', 'Escuela E-250 San Ignacio', 'Liceo Arturo Prat Chacón',
  'Escuela F-270 El Carmen', 'Liceo Polivalente de Yungay', 'Escuela D-120 Pemuco',
  'Colegio Héroes de la Concepción', 'Escuela República de Italia', 'Liceo Técnico Puente Ñuble',
  'Escuela Las Mercedes', 'Centro Educacional Valle Diguillín', 'Escuela Básica Tres Esquinas',
];

export const DECRETOS_MINEDUC_INICIAL: PlanEstudioNorm[] = [
  { nivel: '1° a 4° Básico', regimen: 'JEC', horasObligatorias: 38, horasPIEReglamentarias: 10, asignaturasBase: [{ nombre: 'Lenguaje y Comunicación', horasSugeridas: 8 }, { nombre: 'Matemática', horasSugeridas: 8 }, { nombre: 'Ciencias Naturales', horasSugeridas: 3 }, { nombre: 'Historia, Geografía y Ciencias Sociales', horasSugeridas: 3 }, { nombre: 'Artes Visuales', horasSugeridas: 2 }, { nombre: 'Música', horasSugeridas: 2 }, { nombre: 'Educación Física y Salud', horasSugeridas: 4 }, { nombre: 'Tecnología', horasSugeridas: 1 }, { nombre: 'Orientación', horasSugeridas: 1 }, { nombre: 'Religión', horasSugeridas: 2 }, { nombre: 'Taller JEC (Reforzamiento)', horasSugeridas: 4 }] },
  { nivel: '1° a 4° Básico', regimen: 'No JEC', horasObligatorias: 33, horasPIEReglamentarias: 8, asignaturasBase: [{ nombre: 'Lenguaje y Comunicación', horasSugeridas: 8 }, { nombre: 'Matemática', horasSugeridas: 8 }, { nombre: 'Ciencias Naturales', horasSugeridas: 3 }, { nombre: 'Historia, Geografía y Ciencias Sociales', horasSugeridas: 3 }, { nombre: 'Artes Visuales', horasSugeridas: 2 }, { nombre: 'Música', horasSugeridas: 2 }, { nombre: 'Educación Física y Salud', horasSugeridas: 3 }, { nombre: 'Tecnología', horasSugeridas: 1 }, { nombre: 'Orientación', horasSugeridas: 1 }, { nombre: 'Religión', horasSugeridas: 2 }] },
  { nivel: '5° a 8° Básico', regimen: 'JEC', horasObligatorias: 38, horasPIEReglamentarias: 10, asignaturasBase: [{ nombre: 'Lenguaje y Comunicación', horasSugeridas: 6 }, { nombre: 'Matemática', horasSugeridas: 6 }, { nombre: 'Ciencias Naturales', horasSugeridas: 4 }, { nombre: 'Historia, Geografía y Ciencias Sociales', horasSugeridas: 4 }, { nombre: 'Idioma Extranjero: Inglés', horasSugeridas: 3 }, { nombre: 'Artes Visuales', horasSugeridas: 2 }, { nombre: 'Música', horasSugeridas: 2 }, { nombre: 'Educación Física y Salud', horasSugeridas: 4 }, { nombre: 'Tecnología', horasSugeridas: 1 }, { nombre: 'Orientación', horasSugeridas: 1 }, { nombre: 'Religión', horasSugeridas: 2 }, { nombre: 'Taller JEC', horasSugeridas: 3 }] },
  { nivel: 'Educación Parvularia (Pre-Kínder y Kínder)', regimen: 'JEC', horasObligatorias: 30, horasPIEReglamentarias: 6, asignaturasBase: [{ nombre: 'Ámbito Desarrollo Personal y Social', horasSugeridas: 10 }, { nombre: 'Ámbito Comunicación Integral', horasSugeridas: 10 }, { nombre: 'Ámbito Relación con el Medio Natural y Cultural', horasSugeridas: 10 }] }
];

// --- Clase Base de Datos ---
class DatabaseLocal {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    const item = localStorage.getItem(`slep_db_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  }
  private setStorageItem<T>(key: string, value: T): void {
    if (typeof window !== 'undefined') localStorage.setItem(`slep_db_${key}`, JSON.stringify(value));
  }

  get establecimientos(): Establecimiento[] { return this.getStorageItem('establecimientos', []); }
  set establecimientos(val: Establecimiento[]) { this.setStorageItem('establecimientos', val); }
  get funcionarios(): Funcionario[] { return this.getStorageItem('funcionarios', []); }
  set funcionarios(val: Funcionario[]) { this.setStorageItem('funcionarios', val); }
  get contratos(): Contrato[] { return this.getStorageItem('contratos', []); }
  set contratos(val: Contrato[]) { this.setStorageItem('contratos', val); }
  get financiamientoContratos(): FinanciamientoContrato[] { return this.getStorageItem('financiamientos', []); }
  set financiamientoContratos(val: FinanciamientoContrato[]) { this.setStorageItem('financiamientos', val); }
  get asignacionesAula(): AsignacionAula[] { return this.getStorageItem('asignaciones', []); }
  set asignacionesAula(val: AsignacionAula[]) { this.setStorageItem('asignaciones', val); }
  get alertas(): AlertaConciliacion[] { return this.getStorageItem('alertas', []); }
  set alertas(val: AlertaConciliacion[]) { this.setStorageItem('alertas', val); }
  get tutelas(): ProfesionalEscuelaAsignada[] { return this.getStorageItem('tutelas', []); }
  set tutelas(val: ProfesionalEscuelaAsignada[]) { this.setStorageItem('tutelas', val); }
  get cursosDinamicos(): CursoDinamico[] { return this.getStorageItem('cursos_dinamicos', []); }
  set cursosDinamicos(val: CursoDinamico[]) { this.setStorageItem('cursos_dinamicos', val); }
  get asignaturasDinamicas(): AsignaturaDinamica[] { return this.getStorageItem('asignaturas_dinamicas', []); }
  set asignaturasDinamicas(val: AsignaturaDinamica[]) { this.setStorageItem('asignaturas_dinamicas', val); }
  get supervisores(): Supervisor[] { return this.getStorageItem('supervisores', []); }
  set supervisores(val: Supervisor[]) { this.setStorageItem('supervisores', val); }
  get cargosPersonalizados(): CargoPersonalizado[] { return this.getStorageItem('cargos_personalizados', []); }
  set cargosPersonalizados(val: CargoPersonalizado[]) { this.setStorageItem('cargos_personalizados', val); }
  get planesEstudio(): PlanEstudioNorm[] { return this.getStorageItem('planes_estudio_json', DECRETOS_MINEDUC_INICIAL); }
  set planesEstudio(val: PlanEstudioNorm[]) { this.setStorageItem('planes_estudio_json', val); }
  get comunas(): string[] { return this.getStorageItem('comunas', COMUNAS); }
  set comunas(val: string[]) { this.setStorageItem('comunas', val); }
  get libroRemuneraciones(): RegistroRemuneracion[] { return this.getStorageItem('libro_remuneraciones', []); }
  set libroRemuneraciones(val: RegistroRemuneracion[]) { this.setStorageItem('libro_remuneraciones', val); }
  get tareasReemplazo(): TareaReemplazo[] { return this.getStorageItem('tareas_reemplazo', []); }
  set tareasReemplazo(val: TareaReemplazo[]) { this.setStorageItem('tareas_reemplazo', val); }
}

export const dbLocal = new DatabaseLocal();

// --- Objeto API ---
export const api = {
  getEstablecimientos: async () => dbLocal.establecimientos,
  getFuncionarios: async () => dbLocal.funcionarios,
  getContratos: async (rbd?: string) => rbd ? dbLocal.contratos.filter(c => c.rbd === rbd) : dbLocal.contratos,
  // ... (puedes mantener el resto de tus funciones aquí)
  upsertFuncionario: async (funcionario: Funcionario) => {
    const list = dbLocal.funcionarios;
    const idx = list.findIndex(f => f.run === funcionario.run);
    idx >= 0 ? list[idx] = funcionario : list.push(funcionario);
    dbLocal.funcionarios = list;
  },
  // Agrega aquí el resto de tus métodos de api...
};

// --- ESTO ES LO QUE SOLUCIONA TU ERROR DE BUILD ---
export const supabase = api;
