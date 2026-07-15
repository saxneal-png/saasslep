// @ts-ignore
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Funcionario, Contrato, FinanciamientoContrato, OrigenFondo, AlertaConciliacion, RegistroRemuneracion, CalidadJuridica, normalizarCargoDocente, Establecimiento, EstadoContrato, LegislacionLaboral, PlanEstudioNorm, CursoDinamico, AsignaturaDinamica, ReemplazoDetalle } from './types';

// Normalization function for RUN (Format: 12345678-9, no dots, with hyphen)
export function normalizarRun(runRaw: any): string {
  if (runRaw === undefined || runRaw === null) return '';
  const strVal = String(runRaw).trim();
  if (!strVal) return '';
  let clean = strVal.replace(/[\.\-\s]/g, '').trim();
  if (clean.length < 2) return clean.toUpperCase();
  
  const dv = clean.slice(-1).toUpperCase();
  const cuerpo = clean.slice(0, -1);
  
  const num = parseInt(cuerpo, 10);
  if (isNaN(num)) return clean.toUpperCase();
  
  return `${num}-${dv}`;
}

// Normalization function for dates to ISO YYYY-MM-DD format
export function normalizarFecha(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str === '' || str === '--' || str === '-') return '';
  
  // If it is an Excel serial number
  const num = Number(str);
  if (!isNaN(num) && num > 20000 && num < 60000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  // Try matching DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // Try matching YYYY/MM/DD or YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try standard JS Date parsing
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const date = new Date(parsed);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  return str;
}

export function parseDecimalHours(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  
  const cleanStr = value.toString().trim().replace(',', '.');
  if (cleanStr === '' || cleanStr === '--' || cleanStr === '-') return 0;
  
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

export interface CsvRow {
  RUN: string;
  Nombre: string;
  RBD: string;
  CalidadJuridica: string; // Titular, Contrata
  Funcion: string; // Docente Aula, Directivo, etc.
  HorasTotales: string;
  SubvencionRegular?: string;
  SEP?: string;
  PIE?: string;
  Reforzamiento?: string;
  ProRetencion?: string;
  Otro?: string;
  Estamento?: string; // Optional stamento: Docente or Asistente
  [key: string]: any;
}

export interface ParseResult {
  funcionarios: Funcionario[];
  contratos: Contrato[];
  financiamientos: FinanciamientoContrato[];
  alertas: AlertaConciliacion[];
  establecimientos?: Establecimiento[];
  planesEstudio?: PlanEstudioNorm[];
  cursosDinamicos?: CursoDinamico[];
  asignaturasDinamicas?: AsignaturaDinamica[];
  remuneraciones?: RegistroRemuneracion[];
  reemplazosLicencias?: ReemplazoDetalle[];
}

export function parsearNominaCsv(
  csvContent: string, 
  rbdContext: string,
  controlPrevioJson?: Array<{ run: string; funcion?: string; horas?: number }>,
  forceEstamento?: 'Docente' | 'Asistente de la Educación'
): ParseResult {
  let rows: CsvRow[] = [];

  // Check if JSON
  const trimmed = csvContent.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      rows = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
    } catch (e) {
      // Fallback to csv parse if JSON fails
    }
  }

  if (rows.length === 0) {
    const parsed = Papa.parse<CsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    rows = parsed.data;
  }

  const funcionarios: Funcionario[] = [];
  const contratos: Contrato[] = [];
  const financiamientos: FinanciamientoContrato[] = [];
  const alertas: AlertaConciliacion[] = [];

  rows.forEach((row: any, index: number) => {
    let runRaw = row.RUN || row.run || '';
    if (!runRaw && (row.DOC_RUN || row.doc_run)) {
      const docRun = row.DOC_RUN || row.doc_run;
      const docDv = row.DOC_DV || row.doc_dv || '';
      runRaw = `${docRun}-${docDv}`;
    } else if (!runRaw && (row.ASISTENTE_RUN || row.asistente_run)) {
      const asisRun = row.ASISTENTE_RUN || row.asistente_run;
      const asisDv = row.ASISTENTE_DV || row.asistente_dv || '';
      runRaw = `${asisRun}-${asisDv}`;
    }

    if (!runRaw) return;

    const run = normalizarRun(runRaw);
    
    // Clean corrupted encoding characters if any slipped through (e.g.  -> proper letters)
    const limpiarCaracteresCorruptos = (str: string): string => {
      if (!str) return '';
      // Direct replacement for common chilean names/surnames/cargos that get corrupted
      let clean = str
        .replace(/PREZ/gi, 'PÉREZ')
        .replace(/GONZLEZ/gi, 'GONZÁLEZ')
        .replace(/JOS/gi, 'JOSÉ')
        .replace(/GMEZ/gi, 'GÓMEZ')
        .replace(/MUOZ/gi, 'MUÑOZ')
        .replace(/RIQUELME PREZ/gi, 'RIQUELME PÉREZ')
        .replace(/TCNICO/gi, 'TÉCNICO')
        .replace(/TECNICO/gi, 'TÉCNICO')
        .replace(/PRVULOS/gi, 'PÁRVULOS')
        .replace(/PARVULOS/gi, 'PÁRVULOS')
        .replace(/ASISTENTE\/TCNICO PRVULOS/gi, 'ASISTENTE/TÉCNICO PÁRVULOS')
        .replace(/ASISTENTE\/TECNICO PARVULOS/gi, 'ASISTENTE/TÉCNICO PÁRVULOS');

      // If we find raw replacement characters, try contextual fixes:
      // If it looks like TCNICO -> TÉCNICO, PRVULOS -> PÁRVULOS, JOS -> JOSÉ, PREZ -> PÉREZ
      clean = clean
        .replace(/ASISTENTE\/T\uFFFDCnico P\uFFFDRvulos/gi, 'ASISTENTE/TÉCNICO PÁRVULOS')
        .replace(/ASISTENTE\/T\uFFFDCnico P\uFFFDRvulo/gi, 'ASISTENTE/TÉCNICO PÁRVULA')
        .replace(/T\uFFFDCNICO/gi, 'TÉCNICO')
        .replace(/P\uFFFDRVULOS/gi, 'PÁRVULOS')
        .replace(/T\uFFFDCnico/gi, 'TÉCNICO')
        .replace(/P\uFFFDRvulos/gi, 'PÁRVULOS')
        .replace(/JOS\uFFFD/gi, 'JOSÉ')
        .replace(/P\uFFFDRez/gi, 'PÉREZ')
        .replace(/GONZ\uFFFDLez/gi, 'GONZÁLEZ')
        .replace(/G\uFFFDMez/gi, 'GÓMEZ')
        .replace(/MU\uFFFDOz/gi, 'MUÑOZ')
        .replace(/\uFFFD/g, 'Ñ'); // fallback general replacement
      return clean;
    };

    let nombre = 'Funcionario Sin Nombre';
    if (row.Nombre || row.nombre) {
      nombre = limpiarCaracteresCorruptos((row.Nombre || row.nombre).trim());
    } else if (row.DOC_NOMBRE || row.doc_nombre) {
      const nom = (row.DOC_NOMBRE || row.doc_nombre || '').trim();
      const pat = (row.DOC_PATERNO || row.doc_paterno || '').trim();
      const mat = (row.DOC_MATERNO || row.doc_materno || '').trim();
      nombre = limpiarCaracteresCorruptos(`${nom} ${pat} ${mat}`.replace(/\s+/g, ' ').trim());
    } else if (row.ASISTENTE_NOMBRE || row.asistente_nombre) {
      const nom = (row.ASISTENTE_NOMBRE || row.asistente_nombre || '').trim();
      const pat = (row.ASISTENTE_PATERNO || row.asistente_paterno || '').trim();
      const mat = (row.ASISTENTE_MATERNO || row.asistente_materno || '').trim();
      nombre = limpiarCaracteresCorruptos(`${nom} ${pat} ${mat}`.replace(/\s+/g, ' ').trim());
    }

    const rbd = String(row.RBD || row.rbd || rbdContext).trim();
    
    // Quality mapping logic: map to expanded CalidadJuridica
    const rawCal = String(row.CalidadJuridica || row.calidad_juridica || row.CALIDAD_JURIDICA || 'A contrata').trim();
    let calidad_juridica: CalidadJuridica = 'A contrata';
    if (rawCal.toLowerCase().includes('titular')) {
      calidad_juridica = 'Titular';
    } else if (rawCal.toLowerCase().includes('plazo fijo') || rawCal.toLowerCase().includes('plazofijo')) {
      calidad_juridica = 'Plazo fijo';
    } else if (rawCal.toLowerCase().includes('indefinido')) {
      calidad_juridica = 'Indefinido';
    } else if (rawCal.toLowerCase().includes('reemplazo')) {
      calidad_juridica = 'Reemplazo';
    } else if (rawCal.toLowerCase().includes('habilitacion') || rawCal.toLowerCase().includes('habilitación')) {
      calidad_juridica = 'Habilitación especial';
    } else {
      calidad_juridica = 'A contrata';
    }

    const raw_funcion_principal = limpiarCaracteresCorruptos((
      row.Funcion || 
      row.funcion || 
      row.FUNCION_PRINCIPAL || 
      row.funcion_principal || 
      row.FUNCION_UNO || 
      row.funcion_uno || 
      'Auxiliar de Servicios'
    ).trim());

    let estamento: 'Docente' | 'Asistente de la Educación' = 'Asistente de la Educación';
    if (forceEstamento) {
      estamento = forceEstamento === 'Docente' ? 'Docente' : 'Asistente de la Educación';
    } else {
      const isAsisHeader = row.ASISTENTE_RUN !== undefined || row.asistente_run !== undefined;
      const rawEst = String(row.Estamento || row.estamento || '').trim().toLowerCase();
      if (!isAsisHeader && (rawEst.includes('docente') || rawEst.includes('profesor') || raw_funcion_principal.toLowerCase().includes('docente') || raw_funcion_principal.toLowerCase().includes('profesor'))) {
        estamento = 'Docente';
      }
    }

    const funcion_principal = estamento === 'Docente' 
      ? normalizarCargoDocente(raw_funcion_principal) 
      : raw_funcion_principal;
    
    const horas_totales = parseDecimalHours(row.HorasTotales || row.horas_totales || row.HORAS_CONTRATO || row.horas_contrato);

    const checkHasValue = (val: any) => val !== undefined && val !== null && val !== '';
    const horas_directivas = checkHasValue(row.horas_directivas) ? parseDecimalHours(row.horas_directivas)
      : checkHasValue(row.HorasDirectivas) ? parseDecimalHours(row.HorasDirectivas)
      : checkHasValue(row.HORAS_DIRECTIVAS) ? parseDecimalHours(row.HORAS_DIRECTIVAS)
      : checkHasValue(row.horas_directiva) ? parseDecimalHours(row.horas_directiva)
      : checkHasValue(row.HorasDirectiva) ? parseDecimalHours(row.HorasDirectiva)
      : checkHasValue(row.HORAS_DIRECTIVA) ? parseDecimalHours(row.HORAS_DIRECTIVA)
      : undefined;

    const horas_aula = checkHasValue(row.horas_aula) ? parseDecimalHours(row.horas_aula)
      : checkHasValue(row.HorasAula) ? parseDecimalHours(row.HorasAula)
      : checkHasValue(row.HORAS_AULA) ? parseDecimalHours(row.HORAS_AULA)
      : checkHasValue(row.horas_cronologicas) ? parseDecimalHours(row.horas_cronologicas)
      : checkHasValue(row.HorasCronologicas) ? parseDecimalHours(row.HorasCronologicas)
      : checkHasValue(row.HORAS_CRONOLOGICAS) ? parseDecimalHours(row.HORAS_CRONOLOGICAS)
      : undefined;

    const horas_tecnico_pedagogicas = checkHasValue(row.horas_tecnico_pedagogicas) ? parseDecimalHours(row.horas_tecnico_pedagogicas)
      : checkHasValue(row.HorasTecnicoPedagogicas) ? parseDecimalHours(row.HorasTecnicoPedagogicas)
      : checkHasValue(row.HORAS_TECNICO_PEDAGOGICAS) ? parseDecimalHours(row.HORAS_TECNICO_PEDAGOGICAS)
      : checkHasValue(row.horas_tecnico_pedagogica) ? parseDecimalHours(row.horas_tecnico_pedagogica)
      : checkHasValue(row.HorasTecnicoPedagogica) ? parseDecimalHours(row.HorasTecnicoPedagogica)
      : checkHasValue(row.HORAS_TECNICO_PEDAGOGICA) ? parseDecimalHours(row.HORAS_TECNICO_PEDAGOGICA)
      : checkHasValue(row.horas_tecnica) ? parseDecimalHours(row.horas_tecnica)
      : checkHasValue(row.horas_tecnico) ? parseDecimalHours(row.horas_tecnico)
      : checkHasValue(row.HorasTecnica) ? parseDecimalHours(row.HorasTecnica)
      : checkHasValue(row.HorasTecnico) ? parseDecimalHours(row.HorasTecnico)
      : undefined;

    const dias_trabajados = row.dias_trabajados || row.DiasTrabajados || row.DIAS_TRABAJADOS ? parseInt(row.dias_trabajados || row.DiasTrabajados || row.DIAS_TRABAJADOS, 10) : undefined;
    const dias_licencia_medica = row.dias_licencia_medica || row.DiasLicenciaMedica || row.DIAS_LICENCIA_MEDICA ? parseInt(row.dias_licencia_medica || row.DiasLicenciaMedica || row.DIAS_LICENCIA_MEDICA, 10) : undefined;
    const inasistencias = row.inasistencias || row.Inasistencias || row.INASISTENCIAS ? parseInt(row.inasistencias || row.Inasistencias || row.INASISTENCIAS, 10) : undefined;
    
    let legislacion_laboral: any = estamento === 'Docente' ? 'Estatuto docente' : 'Asistentes de la educación';
    const legRaw = String(row.legislacion_laboral || row.LegislacionLaboral || row.LEGISLACION_LABORAL || '').trim().toLowerCase();
    if (legRaw) {
      if (legRaw.includes('docente')) {
        legislacion_laboral = 'Estatuto docente';
      } else if (legRaw.includes('asistente')) {
        legislacion_laboral = 'Asistentes de la educación';
      }
    }

    // Sum subvenciones using float (parseFloat representation)
    let regular = parseDecimalHours(row.SubvencionRegular || row.subvencion_regular || row.Regular || row.regular);
    const sep = parseDecimalHours(row.SEP || row.sep);
    const pie = parseDecimalHours(row.PIE || row.pie);
    const reforzamiento = parseDecimalHours(row.Reforzamiento || row.reforzamiento);
    const proRetencion = parseDecimalHours(row.ProRetencion || row.pro_retencion || row.ProRetencion || row.pro_retencion);
    const otro = parseDecimalHours(row.Otro || row.otro);

    let sumaSubvenciones = regular + sep + pie + reforzamiento + proRetencion + otro;
    if (sumaSubvenciones === 0 && horas_totales > 0) {
      regular = horas_totales;
      sumaSubvenciones = horas_totales;
    }

    // Create unique ID for contract
    const contrato_id = `csv-${rbd}-${run.replace(/[^a-zA-Z0-9]/g, '')}`;

    // Discard values map to null logic
    const cleanDiscardValue = (val: any): string | undefined => {
      if (val === undefined || val === null) return undefined;
      const clean = String(val).trim();
      const lower = clean.toLowerCase();
      if (lower === 'sin dato / agregar' || lower === 'no tiene' || lower === '--' || lower === '-') return undefined;
      return clean;
    };

    // Add unique Funcionario with estamento
    const titulo = cleanDiscardValue(
      row.Titulo || 
      row.titulo || 
      row.TITULO || 
      row.DOC_TITULO || 
      row.doc_titulo || 
      row.ASISTENTE_TITULO || 
      row.asistente_titulo || 
      row.TituloProfesional || 
      row.titulo_profesional
    );

    const genero = cleanDiscardValue(row.ASISTENTE_GENERO || row.asistente_genero || row.Genero || row.genero);
    const fecha_nacimiento = cleanDiscardValue(row.FECHA_NACIMIENTO || row.fecha_nacimiento || row.FechaNacimiento || row.fecha_nac);

    if (!funcionarios.some(f => f.run === run)) {
      funcionarios.push({ 
        run, 
        nombre, 
        estamento,
        cargo: funcion_principal,
        titulo: titulo || undefined,
        genero,
        fecha_nacimiento
      });
    }

    // Add Contrato
    const nuevoContrato: Contrato = {
      id: contrato_id,
      funcionario_run: run,
      rbd,
      calidad_juridica,
      funcion_principal,
      estado: 'Activo',
      horas_totales,
      dias_trabajados,
      dias_licencia_medica,
      inasistencias,
      legislacion_laboral,
      horas_directivas,
      horas_aula,
      horas_tecnico_pedagogicas
    };
    contratos.push(nuevoContrato);

    // Add Financiamientos
    const agregarFondo = (origen: OrigenFondo, hrs: number) => {
      if (hrs > 0) {
        financiamientos.push({
          id: `f-${contrato_id}-${origen.replace(/\s+/g, '')}`,
          contrato_id,
          origen_fondo: origen,
          horas: hrs
        });
      }
    };

    agregarFondo('Subvención Regular', regular);
    agregarFondo('SEP', sep);
    agregarFondo('PIE', pie);
    agregarFondo('Reforzamiento', reforzamiento);
    agregarFondo('Pro-retención', proRetencion);
    agregarFondo('Otro', otro);

    // Parse and cleanup SIGE-specific columns
    const cleanSigeNumber = (val: any): number => {
      if (val === undefined || val === null || String(val).trim() === '--' || String(val).trim() === '-') return 0;
      return parseDecimalHours(val);
    };

    const cleanSigeString = (val: any): string => {
      if (val === undefined || val === null || String(val).trim() === '--' || String(val).trim() === '-') return '';
      return String(val).trim();
    };

    const horasAula = cleanSigeNumber(row.HORAS_AULA || row.horas_aula);
    const sector1 = cleanSigeString(row.SECTOR_FUNCION_1 || row.sector_funcion_1);
    const subSector1 = cleanSigeString(row.SUB_SECTOR_FUNCION_1 || row.sub_sector_funcion_1);

    // Dynamic classroom load assignment auto-precarga
    if (horasAula > 0 && (sector1 || subSector1)) {
      // Direct push to local in-memory DB or mocked allocations lists returned to page.tsx
    }

    // 1. Alerta de Descalce Horario (Suma de subvenciones no coincide con horas del contrato)
    if (Math.abs(sumaSubvenciones - horas_totales) > 0.01) {
      alertas.push({
        id: `al-descalce-${contrato_id}`,
        run,
        nombre_funcionario: nombre,
        rbd,
        tipo: 'descalce_horas',
        nivel_alerta: 'critica',
        mensaje: 'Horas Totales del Contrato no coinciden con Financiamientos',
        detalle: `El contrato estipula ${horas_totales} horas, pero la suma de financiamientos da ${sumaSubvenciones} horas (Diferencia de ${Math.abs(horas_totales - sumaSubvenciones).toFixed(2)} hrs).`,
        resuelta: false
      });
    }

    // 2. Control de Proporción Ley 20.903 (Semáforo Normativo)
    if (estamento === 'Docente' && horas_totales > 0 && horasAula > 0) {
      const pctLectivo = (horasAula / horas_totales) * 100;
      const maxStandardPct = 65; // Standard 65% classroom hours
      const maxSpecialPct = 60;  // Special 60% classroom hours
      
      // We can warn if it exceeds 65.01%. If it exceeds 65% it is an alert.
      if (pctLectivo > maxStandardPct + 0.01) {
        alertas.push({
          id: `al-ley20903-${contrato_id}`,
          run,
          nombre_funcionario: nombre,
          rbd,
          tipo: 'infraccion_ley_20903',
          nivel_alerta: 'critica',
          mensaje: 'Infracción de Proporción Lectiva Ley 20.903',
          detalle: `El docente tiene asignadas ${horasAula} horas lectivas de un contrato de ${horas_totales} horas (${pctLectivo.toFixed(1)}%), superando el límite máximo legal del 65% (o 60% en colegios de alta vulnerabilidad).`,
          resuelta: false
        });
      } else if (pctLectivo > maxSpecialPct + 0.01) {
        alertas.push({
          id: `al-ley20903-warn-${contrato_id}`,
          run,
          nombre_funcionario: nombre,
          rbd,
          tipo: 'infraccion_ley_20903',
          nivel_alerta: 'advertencia',
          mensaje: 'Posible Infracción Ley 20.903 (Colegio Vulnerable)',
          detalle: `El docente tiene asignadas ${horasAula} horas lectivas de un contrato de ${horas_totales} horas (${pctLectivo.toFixed(1)}%), superando el límite del 60% para establecimientos con IVM > 80%.`,
          resuelta: false
        });
      }
    }

    // 3. Control Previo Discrepancies
    if (controlPrevioJson) {
      const match = controlPrevioJson.find(c => normalizarRun(c.run) === run);
      if (match) {
        if (match.funcion && match.funcion.toLowerCase() !== funcion_principal.toLowerCase()) {
          alertas.push({
            id: `al-funcion-${contrato_id}`,
            run,
            nombre_funcionario: nombre,
            rbd,
            tipo: 'discrepancia_funcion',
            nivel_alerta: 'advertencia',
            mensaje: 'Función disímil entre SIGE y Control Previo',
            detalle: `SIGE reporta "${funcion_principal}" pero el control previo indica "${match.funcion}".`,
            resuelta: false
          });
        }
        if (match.horas !== undefined && Math.abs(match.horas - horas_totales) > 0.01) {
          alertas.push({
            id: `al-horasprevias-${contrato_id}`,
            run,
            nombre_funcionario: nombre,
            rbd,
            tipo: 'descalce_horas',
            nivel_alerta: 'critica',
            mensaje: 'Horas disímiles entre SIGE y Control Previo',
            detalle: `SIGE reporta ${horas_totales} horas pero el control previo indica ${match.horas} horas.`,
            resuelta: false
          });
        }
      }
    }
  });

  return { funcionarios, contratos, financiamientos, alertas };
}

export function parsearArchivoExcelOJson(
  fileBuffer: ArrayBuffer,
  fileName: string,
  rbdContext: string,
  controlPrevioJson?: Array<{ run: string; funcion?: string; horas?: number }>,
  forceEstamento?: 'Docente' | 'Asistente de la Educación',
  schoolNameToRbdMap: Record<string, string> = {}
): ParseResult {
  const funcionarios: Funcionario[] = [];
  const contratos: Contrato[] = [];
  const financiamientos: FinanciamientoContrato[] = [];
  const alertas: AlertaConciliacion[] = [];
  const establecimientos: Establecimiento[] = [];
  const planesEstudio: PlanEstudioNorm[] = [];
  const cursosDinamicos: CursoDinamico[] = [];
  const asignaturasDinamicas: AsignaturaDinamica[] = [];
  const remuneraciones: RegistroRemuneracion[] = [];
  const reemplazosLicencias: ReemplazoDetalle[] = [];

  // Check if it's JSON or text first
  let isJson = false;
  let jsonString = '';
  try {
    const decoder = new TextDecoder('utf-8');
    jsonString = decoder.decode(fileBuffer).trim();
    if (jsonString.startsWith('{') || jsonString.startsWith('[')) {
      isJson = true;
    }
  } catch (e) {}

  if (isJson) {
    return parsearNominaCsv(jsonString, rbdContext, controlPrevioJson, forceEstamento);
  }

  // Parse using SheetJS (XLSX/XLS or CSV)
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  
  // Detect if the workbook contains sheet names corresponding to the 3 planillas
  let hasRecognizedSheets = false;
  const sheetNamesNorm = workbook.SheetNames.map(s => 
    s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\.\-\s_]/g, "")
  );

  const targetSheetKeys = [
    'establecimientos', 'planesdeestudio', 'cursos', 'asignaturas', 
    'funcionarios', 'contratos', 'cargahoraria', 'remuneraciones', 'licenciasyreemplazos'
  ];

  if (sheetNamesNorm.some(sn => targetSheetKeys.includes(sn))) {
    hasRecognizedSheets = true;
  }

  if (hasRecognizedSheets) {
    // Helper to extract clean indexes
    const getIndex = (hdrs: string[], kws: string[]): number => {
      for (const kw of kws) {
        const idx = hdrs.findIndex(h => h === kw);
        if (idx !== -1) return idx;
      }
      for (const kw of kws) {
        const idx = hdrs.findIndex(h => h.includes(kw));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
      if (rawRows.length === 0) return;

      const normName = sheetName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\.\-\s_]/g, "");

      // Find header row
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(rawRows.length, 8); i++) {
        const row = rawRows[i];
        if (row && row.filter(c => String(c || '').trim() !== '').length > 2) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = rawRows[headerRowIdx].map(h => 
        String(h || '').trim().toLowerCase().normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[\.\-\s_]/g, "")
      );

      const startRow = headerRowIdx + 1;

      if (normName === 'establecimientos') {
        const idxRbd = getIndex(headers, ['rbd']);
        const idxNombre = getIndex(headers, ['nombre', 'establecimiento', 'escuela']);
        const idxIvm = getIndex(headers, ['indicevulnerabilidad', 'ivm', 'vulnerabilidad']);
        const idxComuna = getIndex(headers, ['comuna']);
        const idxRegimen = getIndex(headers, ['regimen', 'tipo']);

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxRbd]) continue;
          const rbd = String(row[idxRbd]).trim();
          if (!rbd) continue;

          establecimientos.push({
            rbd,
            nombre: String(row[idxNombre] || `Establecimiento RBD ${rbd}`).trim(),
            ivm: parseFloat(String(row[idxIvm]).replace(',', '.')) || 70,
            comuna: String(row[idxComuna] || 'Chillán Viejo').trim(),
            regimen: String(row[idxRegimen]).toUpperCase().includes('NO') ? 'No JEC' : 'JEC'
          });
        }
      }

      else if (normName === 'planesdeestudio') {
        const idxNivel = getIndex(headers, ['nivel', 'curso']);
        const idxRegimen = getIndex(headers, ['regimen']);
        const idxHoras = getIndex(headers, ['horasobligatorias', 'horas']);
        const idxPie = getIndex(headers, ['horaspie', 'pie']);

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxNivel]) continue;
          const nivel = String(row[idxNivel]).trim();
          if (!nivel) continue;

          planesEstudio.push({
            nivel,
            regimen: String(row[idxRegimen]).toUpperCase().includes('NO') ? 'No JEC' : 'JEC',
            horasObligatorias: parseDecimalHours(row[idxHoras]),
            horasPIEReglamentarias: parseDecimalHours(row[idxPie]),
            asignaturasBase: [] // base subjects populated by templates
          });
        }
      }

      else if (normName === 'cursos') {
        const idxRbd = getIndex(headers, ['rbd']);
        const idxNombre = getIndex(headers, ['nombre', 'curso', 'nombrecurso']);
        const idxNivel = getIndex(headers, ['nivel']);
        const idxProf = getIndex(headers, ['profesorjefe', 'runprofesorjefe', 'runjefe']);

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxNombre]) continue;
          const rbd = String(row[idxRbd] || rbdContext).trim();
          const nombre = String(row[idxNombre]).trim();
          if (!nombre) continue;

          cursosDinamicos.push({
            rbd,
            nombre,
            nivel: String(row[idxNivel] || '1° a 4° Básico').trim(),
            regimen: 'JEC',
            profesor_jefe_run: normalizarRun(row[idxProf]) || undefined
          });
        }
      }

      else if (normName === 'asignaturas') {
        const idxRbd = getIndex(headers, ['rbd']);
        const idxCurso = getIndex(headers, ['curso', 'nombrecurso']);
        const idxNombre = getIndex(headers, ['asignatura', 'nombre']);
        const idxHoras = getIndex(headers, ['horas', 'horassugeridas']);

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxNombre]) continue;
          const rbd = String(row[idxRbd] || rbdContext).trim();
          const cursoNombre = String(row[idxCurso]).trim();
          const nombre = String(row[idxNombre]).trim();
          if (!nombre) continue;

          asignaturasDinamicas.push({
            rbd,
            cursoNombre,
            nombre,
            horasSugeridas: parseDecimalHours(row[idxHoras])
          });
        }
      }

      else if (normName === 'funcionarios') {
        const idxRun = getIndex(headers, ['run', 'rut']);
        const idxNombre = getIndex(headers, ['nombre', 'funcionario', 'completo']);
        const idxEmail = getIndex(headers, ['email', 'correo']);
        const idxTel = getIndex(headers, ['telefono', 'fono']);
        const idxGen = getIndex(headers, ['genero', 'sexo']);
        const idxNac = getIndex(headers, ['fechanacimiento', 'nacimiento', 'fecha']);
        const idxTitulo = getIndex(headers, ['titulo', 'profesion']);
        const idxEstamento = getIndex(headers, ['estamento', 'tipo']);

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxRun]) continue;
          const run = normalizarRun(row[idxRun]);
          if (!run) continue;

          const est = String(row[idxEstamento] || '').toLowerCase();
          const estamento = (est.includes('docente') || est.includes('profesor')) ? 'Docente' : 'Asistente de la Educación';

          funcionarios.push({
            run,
            nombre: String(row[idxNombre] || 'Funcionario Sin Nombre').trim(),
            email: String(row[idxEmail] || '').trim() || undefined,
            telefono: String(row[idxTel] || '').trim() || undefined,
            genero: String(row[idxGen] || '').trim() || undefined,
            fecha_nacimiento: normalizarFecha(row[idxNac]) || undefined,
            titulo: String(row[idxTitulo] || '').trim() || undefined,
            estamento
          });
        }
      }

      else if (normName === 'contratos') {
        const idxRun = getIndex(headers, ['run', 'rut']);
        const idxRbd = getIndex(headers, ['rbd']);
        const idxFuncion = getIndex(headers, ['funcionprincipal', 'funcion', 'cargo']);
        const idxCalidad = getIndex(headers, ['calidadjuridica', 'calidad']);
        const idxHoras = getIndex(headers, ['horastotales', 'horas']);
        const idxHorasAula = getIndex(headers, ['horasaula', 'aula']);
        const idxHorasDir = getIndex(headers, ['horasdirectivas', 'directiva']);
        const idxHorasUtp = getIndex(headers, ['horasutp', 'utp', 'tecnicopedagogicas']);
        const idxFondo = getIndex(headers, ['origenfondo', 'financiamiento', 'subvencion', 'fondo']);

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxRun]) continue;
          const run = normalizarRun(row[idxRun]);
          if (!run) continue;

          const rbd = String(row[idxRbd] || rbdContext).trim();
          const horas_totales = parseDecimalHours(row[idxHoras]);
          const cargo = String(row[idxFuncion] || 'Docente de Aula').trim();

          const calClean = String(row[idxCalidad] || '').toLowerCase();
          let calidad_juridica: CalidadJuridica = 'A contrata';
          if (calClean.includes('titular')) calidad_juridica = 'Titular';
          else if (calClean.includes('plazo fijo')) calidad_juridica = 'Plazo fijo';
          else if (calClean.includes('indefinido')) calidad_juridica = 'Indefinido';
          else if (calClean.includes('reemplazo')) calidad_juridica = 'Reemplazo';

          const contrato_id = `csv-${rbd}-${run.replace(/[^a-zA-Z0-9]/g, '')}`;

          contratos.push({
            id: contrato_id,
            funcionario_run: run,
            rbd,
            calidad_juridica,
            funcion_principal: cargo,
            estado: 'Activo',
            horas_totales,
            horas_aula: parseDecimalHours(row[idxHorasAula]),
            horas_directivas: parseDecimalHours(row[idxHorasDir]),
            horas_tecnico_pedagogicas: parseDecimalHours(row[idxHorasUtp])
          });

          // Insert funding source
          const fondo = String(row[idxFondo] || 'Subvención Regular').trim();
          let origen_fondo: OrigenFondo = 'Subvención Regular';
          if (fondo.toUpperCase().includes('SEP')) origen_fondo = 'SEP';
          else if (fondo.toUpperCase().includes('PIE')) origen_fondo = 'PIE';
          else if (fondo.toUpperCase().includes('REFORZAMIENTO')) origen_fondo = 'Reforzamiento';
          else if (fondo.toUpperCase().includes('RETENCION')) origen_fondo = 'Pro-retención';

          financiamientos.push({
            id: `f-${contrato_id}-${origen_fondo.replace(/\s+/g, '')}`,
            contrato_id,
            origen_fondo,
            horas: horas_totales
          });
        }
      }

      else if (normName === 'remuneraciones') {
        const idxRun = getIndex(headers, ['run', 'rut']);
        const idxMes = getIndex(headers, ['mes', 'mespago']);
        const idxDiasTrab = getIndex(headers, ['diastrabajados']);
        const idxInasist = getIndex(headers, ['inasistencias']);
        const idxDiasLic = getIndex(headers, ['diaslicencia', 'licencia']);
        const idxHaberes = getIndex(headers, ['totalhaberes', 'haberes', 'sueldo']);
        const idxLey20903 = getIndex(headers, ['ley20903', 'aplicaley20903']);

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxRun]) continue;
          const run = normalizarRun(row[idxRun]);
          if (!run) continue;

          remuneraciones.push({
            id: `rem-${run.replace(/[^a-zA-Z0-9]/g, '')}-${i}`,
            funcionario_run: run,
            horas_pagadas: 44, // default
            total_haberes: parseInt(String(row[idxHaberes] || '0').replace(/[^0-9]/g, ''), 10) || 0,
            mes_pago: normalizarFecha(row[idxMes]) || '2026-06-01',
            grupo_estamento: 'P02_Educacion',
            dias_trabajados: parseInt(row[idxDiasTrab], 10) || 30,
            inasistencias: parseInt(row[idxInasist], 10) || 0,
            dias_licencia_medica: parseInt(row[idxDiasLic], 10) || 0,
            aplica_ley_20903_art5: String(row[idxLey20903]).toUpperCase().includes('SI') ? 'Sí' : 'No'
          });
        }
      }

      else if (normName === 'licenciasyreemplazos' || normName === 'reemplazos') {
        const idxTitular = getIndex(headers, ['runtitular', 'titular']);
        const idxFInicio = getIndex(headers, ['fechainiciolicencia', 'fechainicio']);
        const idxFTermino = getIndex(headers, ['fechatermino']);
        const idxReemplazo = getIndex(headers, ['runreemplazante', 'reemplazante']);
        const idxHoras = getIndex(headers, ['horasreemplazo', 'horas']);
        const idxFondo = getIndex(headers, ['origenfondoreemplazo', 'origenfondo', 'fondo']);

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxTitular]) continue;
          const runTitular = normalizarRun(row[idxTitular]);
          const runReemp = normalizarRun(row[idxReemplazo]);
          if (!runTitular || !runReemp) continue;

          reemplazosLicencias.push({
            id: `reemp-${runTitular.replace(/[^a-zA-Z0-9]/g, '')}-${runReemp.replace(/[^a-zA-Z0-9]/g, '')}`,
            contrato_titular_id: `csv-${rbdContext}-${runTitular.replace(/[^a-zA-Z0-9]/g, '')}`,
            reemplazo_run: runReemp,
            rbd: rbdContext,
            horas: parseDecimalHours(row[idxHoras]),
            fecha_inicio: normalizarFecha(row[idxFInicio]) || '2026-06-01',
            fecha_termino: normalizarFecha(row[idxFTermino]) || '2026-06-30'
          });
        }
      }
    });

    return {
      funcionarios,
      contratos,
      financiamientos,
      alertas,
      establecimientos: establecimientos.length > 0 ? establecimientos : undefined,
      planesEstudio: planesEstudio.length > 0 ? planesEstudio : undefined,
      cursosDinamicos: cursosDinamicos.length > 0 ? cursosDinamicos : undefined,
      asignaturasDinamicas: asignaturasDinamicas.length > 0 ? asignaturasDinamicas : undefined,
      remuneraciones: remuneraciones.length > 0 ? remuneraciones : undefined,
      reemplazosLicencias: reemplazosLicencias.length > 0 ? reemplazosLicencias : undefined
    };
  }

  // Fallback to original single-sheet parser:
  const funcionariosFallback: Funcionario[] = [];
  const contratosFallback: Contrato[] = [];
  const financiamientosFallback: FinanciamientoContrato[] = [];
  const alertasFallback: AlertaConciliacion[] = [];
  const establecimientosFallback: Establecimiento[] = [];

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
    if (rawRows.length === 0) return;

    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;
      const nonCount = row.filter(cell => String(cell || '').trim() !== '').length;
      if (nonCount < 4) continue;
      const hasRun = row.some(cell => {
        const val = String(cell || '').trim().toLowerCase();
        return val === 'run' || val === 'r.u.n.' || val === 'rut' || val === 'r.u.n' || val.includes('run') || val.includes('rut');
      });
      if (hasRun) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = rawRows[headerRowIdx].map(h => 
      String(h || '').trim().toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\.\-\s_]/g, "")
    );

    const getIndex = (kws: string[], fallback: number): number => {
      for (const kw of kws) {
        const idx = headers.findIndex(h => h === kw);
        if (idx !== -1) return idx;
      }
      for (const kw of kws) {
        const idx = headers.findIndex(h => h.includes(kw));
        if (idx !== -1) return idx;
      }
      return fallback;
    };

    const idxRun = getIndex(['run', 'rut'], -1);
    const idxRunLimpio = getIndex(['runlimpio', 'runclean'], -1);
    const idxPat = getIndex(['apellidopaterno', 'paterno'], -1);
    const idxMat = getIndex(['apellidomaterno', 'materno'], -1);
    const idxNom = getIndex(['nombres', 'nombre', 'nombredocente', 'nombrecargo'], -1);
    const idxSexo = getIndex(['sexo', 'genero'], -1);
    const idxLeg = getIndex(['legislacionlaboral', 'legislacion', 'ley', 'estamento'], -1);
    const idxProg = getIndex(['programa', 'subvencion'], -1);
    const idxComuna = getIndex(['comuna'], -1);
    const idxCentroCosto = getIndex(['centrodecosto', 'establecimiento', 'colegio'], -1);
    const idxRbd = getIndex(['rbd', 'rbdclean', 'rbdmaestro', 'rbdmaestrocontrato'], -1);
    const idxCargo = getIndex(['cargo', 'funcion', 'cargofuncion', 'funcionprincipal'], -1);
    const idxTramo = getIndex(['tramo'], -1);
    const idxTipoContrato = getIndex(['tipocontrato', 'calidad'], -1);
    const idxHoras = getIndex(['horascontrato', 'horas'], -1);
    const idxActivo = getIndex(['principalactivo', 'activo', 'estado'], -1);
    const idxTotalHaberes = getIndex(['totalhaberes', 'sueldoliquido', 'sueldo', 'haberes'], -1);
    const idxIngreso = getIndex(['ingreso', 'fechaingreso'], -1);

    const idxRegular = getIndex(['horasdotacionregular', 'regular', 'horascorriente', 'corriente'], -1);
    const idxPIE = getIndex(['horasdotacionpie', 'pie', 'horaspie'], -1);
    const idxSEP = getIndex(['horasdotacionsep', 'sep', 'horassep'], -1);

    const startRow = headerRowIdx + 1;

    for (let i = startRow; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;

      let runRaw = idxRun !== -1 ? row[idxRun] : undefined;
      let run = '';
      
      const processRawRun = (raw: any): string => {
        if (raw === undefined || raw === null) return '';
        const str = String(raw).trim();
        if (!str || str === 'NaN') return '';
        const clean = str.replace(/[\.\s]/g, '');
        if (clean.includes('-')) {
          return normalizarRun(clean);
        }
        const digitsOnly = clean.replace(/[^0-9]/g, '');
        if (digitsOnly.length === 7 || digitsOnly.length === 8) {
          let m = 0, s = 1;
          let t = parseInt(digitsOnly, 10);
          for (; t; t = Math.floor(t / 10)) {
            s = (s + t % 10 * (9 - m++ % 6)) % 11;
          }
          const dv = s ? String(s - 1) : 'K';
          return normalizarRun(`${digitsOnly}-${dv}`);
        }
        return normalizarRun(clean);
      };

      if (runRaw !== undefined && runRaw !== null && String(runRaw).trim() !== '' && String(runRaw).trim() !== 'NaN') {
        run = processRawRun(runRaw);
      } else if (idxRunLimpio !== -1 && row[idxRunLimpio] !== undefined && row[idxRunLimpio] !== null && String(row[idxRunLimpio]).trim() !== '' && String(row[idxRunLimpio]).trim() !== 'NaN') {
        run = processRawRun(row[idxRunLimpio]);
      }

      if (!run) continue;
      if (run.toLowerCase().includes('run') || run.toLowerCase().includes('r.u.n')) continue;

      const apePat = idxPat !== -1 ? String(row[idxPat] || '').trim() : '';
      const apeMat = idxMat !== -1 ? String(row[idxMat] || '').trim() : '';
      const nombres = idxNom !== -1 ? String(row[idxNom] || '').trim() : '';
      const nombreCompleto = `${nombres} ${apePat} ${apeMat}`.replace(/\s+/g, ' ').trim();
      const cargoRaw = idxCargo !== -1 ? String(row[idxCargo] || '').trim() : '';

      const sexVal = idxSexo !== -1 ? String(row[idxSexo] || '').trim().toUpperCase() : '';
      let genero = sexVal;
      if (sexVal === 'M' || sexVal.startsWith('MASC')) genero = 'Masculino';
      else if (sexVal === 'F' || sexVal.startsWith('FEM')) genero = 'Femenino';

      const legLab = idxLeg !== -1 ? String(row[idxLeg] || '').trim() : '';
      let estamento: 'Docente' | 'Asistente de la Educación' = 'Asistente de la Educación';
      const cargoLower = cargoRaw.toLowerCase();

      if (legLab) {
        if (legLab.toLowerCase().includes('docente')) estamento = 'Docente';
        else if (legLab.toLowerCase().includes('asistente')) estamento = 'Asistente de la Educación';
      } else if (cargoRaw) {
        if (cargoLower.includes('docente') || cargoLower.includes('profesor') || cargoLower.includes('educador') || cargoLower.includes('pie')) {
          estamento = 'Docente';
        }
      }

      let legislacion_laboral: LegislacionLaboral = estamento === 'Docente' ? 'Estatuto docente' : 'Asistentes de la educación';
      let estado: EstadoContrato = 'Activo';
      if (idxActivo !== -1) {
        const principalActivo = String(row[idxActivo] || '').trim().toUpperCase();
        if (principalActivo === 'NO' || principalActivo === 'INACTIVO' || principalActivo === '0') {
          estado = 'Pendiente_Aprobacion';
        }
      }

      const tramoRaw = idxTramo !== -1 ? String(row[idxTramo] || '').trim() : '';
      let tramo: 'Sin Tramo' | 'Acceso' | 'Inicial' | 'Temprano' | 'Avanzado' | 'Experto I' | 'Experto II' = 'Sin Tramo';
      const tramoClean = tramoRaw.toLowerCase();
      if (tramoClean.includes('acceso')) tramo = 'Acceso';
      else if (tramoClean.includes('inicial')) tramo = 'Inicial';
      else if (tramoClean.includes('temprano')) tramo = 'Temprano';
      else if (tramoClean.includes('avanzado')) tramo = 'Avanzado';
      else if (tramoClean.includes('experto i')) tramo = 'Experto I';
      else if (tramoClean.includes('experto ii')) tramo = 'Experto II';

      const programa = idxProg !== -1 ? String(row[idxProg] || '').trim() : '';
      const comunaRaw = idxComuna !== -1 ? String(row[idxComuna] || '').trim() : '';
      const centroCosto = idxCentroCosto !== -1 ? String(row[idxCentroCosto] || '').trim() : '';
      const rbdVal = idxRbd !== -1 ? String(row[idxRbd] || '').trim() : '';
      const tipoContrato = idxTipoContrato !== -1 ? String(row[idxTipoContrato] || '').trim() : '';

      let rbd = rbdVal || '';
      if (!rbd && centroCosto) {
        const cleanString = (str: string): string => {
          return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
        };
        const cleanCC = cleanString(centroCosto);
        let foundRbd = '';
        for (const [dbName, dbRbd] of Object.entries(schoolNameToRbdMap)) {
          if (cleanString(dbName).includes(cleanCC) || cleanCC.includes(cleanString(dbName))) {
            foundRbd = dbRbd;
            break;
          }
        }
        if (foundRbd) rbd = foundRbd;
        else {
          let hash = 0;
          for (let k = 0; k < centroCosto.length; k++) {
            hash = centroCosto.charCodeAt(k) + ((hash << 5) - hash);
          }
          rbd = String(900000 + Math.abs(hash % 100000));
        }
      }
      if (!rbd) rbd = rbdContext;

      let comuna = comunaRaw.charAt(0).toUpperCase() + comunaRaw.slice(1).toLowerCase().trim();
      if (!comuna && centroCosto) {
        const ccLower = centroCosto.toLowerCase();
        if (ccLower.includes('bulnes')) comuna = 'Bulnes';
        else if (ccLower.includes('carmen')) comuna = 'El Carmen';
        else if (ccLower.includes('pemuco')) comuna = 'Pemuco';
        else if (ccLower.includes('yungay')) comuna = 'Yungay';
        else comuna = 'Chillán Viejo';
      }

      if (rbd && centroCosto) {
        if (!establecimientosFallback.some(e => e.rbd === rbd)) {
          establecimientosFallback.push({ rbd, nombre: centroCosto, ivm: 75.0, comuna, regimen: 'JEC' });
        }
      }

      let func = funcionariosFallback.find(f => f.run === run);
      const fechaIngreso = idxIngreso !== -1 ? normalizarFecha(row[idxIngreso]) : undefined;

      if (!func) {
        func = {
          run,
          nombre: nombreCompleto || 'Funcionario Sin Nombre',
          estamento,
          cargo: cargoRaw || (estamento === 'Docente' ? 'Docente de Aula' : 'Asistente'),
          genero,
          tramo,
          fecha_ingreso_establecimiento: fechaIngreso
        };
        funcionariosFallback.push(func);
      }

      const totalHaberesRaw = idxTotalHaberes !== -1 ? row[idxTotalHaberes] : undefined;
      const totalHaberes = parseDecimalHours(totalHaberesRaw);
      const isRelevanceZero = idxTotalHaberes !== -1 && totalHaberesRaw !== null && totalHaberesRaw !== undefined && totalHaberes === 0;

      if (!isRelevanceZero) {
        let calidad_juridica: CalidadJuridica = 'A contrata';
        const tipoContClean = tipoContrato.toLowerCase();
        if (tipoContClean.includes('titular')) calidad_juridica = 'Titular';
        else if (tipoContClean.includes('reemplazo')) calidad_juridica = 'Reemplazo';

        let contrato = contratosFallback.find(c => c.funcionario_run === run && c.rbd === rbd);
        const horasRegular = idxRegular !== -1 ? parseDecimalHours(row[idxRegular]) : 0;
        const horasPIE = idxPIE !== -1 ? parseDecimalHours(row[idxPIE]) : 0;
        const horasSEP = idxSEP !== -1 ? parseDecimalHours(row[idxSEP]) : 0;
        const hasDirectDotaciones = idxRegular !== -1 || idxPIE !== -1 || idxSEP !== -1;
        
        let totalRowHoras = hasDirectDotaciones ? (horasRegular + horasPIE + horasSEP) : parseDecimalHours(row[idxHoras]);

        if (!contrato) {
          const contrato_id = `csv-${rbd}-${run.replace(/[^a-zA-Z0-9]/g, '')}`;
          contrato = {
            id: contrato_id,
            funcionario_run: run,
            rbd,
            calidad_juridica,
            funcion_principal: cargoRaw || func.cargo || 'Docente de Aula',
            estado,
            horas_totales: 0,
            legislacion_laboral
          };
          contratosFallback.push(contrato);
        }
        contrato.horas_totales += totalRowHoras;

        const upsertFinanciamiento = (origen: OrigenFondo, hrs: number) => {
          if (hrs <= 0) return;
          const finId = `f-${contrato.id}-${origen.replace(/\s+/g, '')}`;
          let financiamiento = financiamientosFallback.find(f => f.id === finId);
          if (financiamiento) financiamiento.horas += hrs;
          else financiamientosFallback.push({ id: finId, contrato_id: contrato.id, origen_fondo: origen, horas: hrs });
        };

        if (hasDirectDotaciones) {
          upsertFinanciamiento('Subvención Regular', horasRegular);
          upsertFinanciamiento('PIE', horasPIE);
          upsertFinanciamiento('SEP', horasSEP);
        } else if (totalRowHoras > 0) {
          let progKey = programa.toLowerCase();
          let origen: OrigenFondo = 'Subvención Regular';
          if (progKey.includes('sep')) origen = 'SEP';
          else if (progKey.includes('pie')) origen = 'PIE';
          upsertFinanciamiento(origen, totalRowHoras);
        }
      }
    }
  });

  return {
    funcionarios: funcionariosFallback,
    contratos: contratosFallback,
    financiamientos: financiamientosFallback,
    alertas: alertasFallback,
    establecimientos: establecimientosFallback
  };
}

export function parsearRemuneracionesCsv(csvContent: string): RegistroRemuneracion[] {
  let rows: any[] = [];
  const trimmed = csvContent.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      rows = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
    } catch (e) {
      // Fallback
    }
  }

  if (rows.length === 0) {
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    rows = parsed.data;
  }

  const result: RegistroRemuneracion[] = [];
  rows.forEach((row: any, idx: number) => {
    let runRaw = row.RUN || row.run || row.Rut || row.rut || row.RUT || '';
    if (!runRaw) return;
    const run = normalizarRun(runRaw);

    const horas_pagadas = parseDecimalHours(row.HorasPagadas || row.horas_pagadas || row.Horas || row.horas || 0);
    const total_haberes = parseInt(row.TotalHaberes || row.total_haberes || row.Haberes || row.haberes || row.Sueldo || row.sueldo || '0', 10) || 0;
    const mes_pago = String(row.MesPago || row.mes_pago || row.Mes || row.mes || '2026-06').trim();
    const est = String(row.GrupoEstamento || row.grupo_estamento || row.Estamento || row.estamento || 'P02_Educacion').trim();
    const grupo_estamento: 'P01_Administrativo' | 'P02_Educacion' = (est.includes('P01') || est.toLowerCase().includes('admin')) 
      ? 'P01_Administrativo' 
      : 'P02_Educacion';

    // Parse Real-world payroll columns
    const dias_trabajados = row.DiasTrabajados || row.dias_trabajados || row.dias_trab || row.DiasTrab ? parseInt(row.DiasTrabajados || row.dias_trabajados || row.dias_trab || row.DiasTrab, 10) : undefined;
    const dias_licencia_medica = row.DiasLicenciaMedica || row.dias_licencia_medica || row.dias_lic_medica || row['Dias Lic. Médica'] || row.dias_lic ? parseInt(row.DiasLicenciaMedica || row.dias_licencia_medica || row.dias_lic_medica || row['Dias Lic. Médica'] || row.dias_lic, 10) : undefined;
    const inasistencias = row.Inasistencias || row.inasistencias || row.Inasist ? parseInt(row.Inasistencias || row.inasistencias || row.Inasist, 10) : undefined;

    const aplicaArt5Raw = String(row.AplicaLey20903Art5 || row.aplica_ley_20903_art5 || row['Aplica Ley 20903 Artículo 5'] || '').trim().toLowerCase();
    const aplica_ley_20903_art5 = aplicaArt5Raw === 'sí' || aplicaArt5Raw === 'si' || aplicaArt5Raw === 'yes' || aplicaArt5Raw === '1' ? 'Sí' : 'No';

    const planilla_complementaria_ley_20903 = parseInt(row.PlanillaComplementariaLey20903 || row.planilla_complementaria_ley_20903 || row['Planilla Complementaria Ley 20.903'] || '0', 10) || 0;
    const asignacion_res_director = parseInt(row.AsignacionResDirector || row.asignacion_res_director || row['Asig. Res. Director'] || '0', 10) || 0;
    const asignacion_resp_tec_ped = parseInt(row.AsignacionRespTecPed || row.asignacion_resp_tec_ped || row['DFL1/97 art.51 Asig. Resp. Téc-Ped'] || '0', 10) || 0;

    result.push({
      id: `rem-${run.replace(/[^a-zA-Z0-9]/g, '')}-${idx}`,
      funcionario_run: run,
      horas_pagadas,
      total_haberes,
      mes_pago,
      grupo_estamento,
      dias_trabajados,
      dias_licencia_medica,
      inasistencias,
      aplica_ley_20903_art5,
      planilla_complementaria_ley_20903,
      asignacion_res_director,
      asignacion_resp_tec_ped
    });
  });

  return result;
}

export function descargarPlantillaExcel(tipo: 1 | 2 | 3): void {
  const wb = XLSX.utils.book_new();
  
  if (tipo === 1) {
    const dataEst = [
      ['RBD', 'Nombre', 'IVM', 'Comuna', 'Regimen'],
      ['10201', 'Liceo Polivalente Manuel Bulnes', 85.4, 'Bulnes', 'JEC'],
      ['10202', 'Escuela E-250 San Ignacio', 92.1, 'San Ignacio', 'JEC']
    ];
    const wsEst = XLSX.utils.aoa_to_sheet(dataEst);
    XLSX.utils.book_append_sheet(wb, wsEst, 'Establecimientos');

    const dataPlanes = [
      ['Nivel', 'Regimen', 'Horas Obligatorias', 'Horas PIE'],
      ['1° a 4° Básico', 'JEC', 38, 10],
      ['5° a 8° Básico', 'JEC', 38, 10]
    ];
    const wsPlanes = XLSX.utils.aoa_to_sheet(dataPlanes);
    XLSX.utils.book_append_sheet(wb, wsPlanes, 'Planes de Estudio');

    const dataCursos = [
      ['RBD', 'Nombre Curso', 'Nivel', 'RUN Profesor Jefe'],
      ['10202', '3° Básico A', '1° a 4° Básico', '15432987-K']
    ];
    const wsCursos = XLSX.utils.aoa_to_sheet(dataCursos);
    XLSX.utils.book_append_sheet(wb, wsCursos, 'Cursos');

    const dataAsig = [
      ['RBD', 'Nombre Curso', 'Asignatura', 'Horas Sugeridas'],
      ['10202', '3° Básico A', 'Lenguaje y Comunicación', 8],
      ['10202', '3° Básico A', 'Matemática', 8]
    ];
    const wsAsig = XLSX.utils.aoa_to_sheet(dataAsig);
    XLSX.utils.book_append_sheet(wb, wsAsig, 'Asignaturas');

    XLSX.writeFile(wb, 'Planilla_1_Maestros_Configuracion.xlsx');
  } else if (tipo === 2) {
    const dataFunc = [
      ['RUN', 'Nombre', 'Email', 'Telefono', 'Genero', 'Fecha Nacimiento', 'Titulo', 'Estamento'],
      ['12345678-9', 'María Loreto González Soto', 'mgonzalez@slepvallediguillin.cl', '999999999', 'Femenino', '1985-04-12', 'Profesor de Básica', 'Docente'],
      ['15432987-K', 'Carlos Andrés Muñoz Riquelme', 'cmunoz@slepvallediguillin.cl', '988888888', 'Masculino', '1981-08-25', 'Licenciado en Educación', 'Docente']
    ];
    const wsFunc = XLSX.utils.aoa_to_sheet(dataFunc);
    XLSX.utils.book_append_sheet(wb, wsFunc, 'Funcionarios');

    const dataCont = [
      ['RUN', 'RBD', 'Función Principal', 'Calidad Jurídica', 'Horas Totales', 'Horas Aula', 'Horas Directivas', 'Horas UTP', 'Origen Fondo'],
      ['12345678-9', '10201', 'Docente de Aula', 'Titular', 44, 30, 0, 0, 'SEP'],
      ['15432987-K', '10202', 'Docente de Aula', 'A contrata', 38, 30, 8, 0, 'PIE']
    ];
    const wsCont = XLSX.utils.aoa_to_sheet(dataCont);
    XLSX.utils.book_append_sheet(wb, wsCont, 'Contratos');

    const dataCarga = [
      ['RUN', 'RBD', 'Curso', 'Asignatura', 'Horas Asignadas'],
      ['12345678-9', '10201', '7° Básico A', 'Lenguaje y Comunicación', 6],
      ['15432987-K', '10202', '3° Básico A', 'Matemática', 8]
    ];
    const wsCarga = XLSX.utils.aoa_to_sheet(dataCarga);
    XLSX.utils.book_append_sheet(wb, wsCarga, 'Carga Horaria');

    XLSX.writeFile(wb, 'Planilla_2_Dotacion_Contratos.xlsx');
  } else if (tipo === 3) {
    const dataRem = [
      ['RUN', 'Mes de Pago', 'Días Trabajados', 'Inasistencias', 'Días Licencia', 'Total Haberes', 'Aplica Ley 20903'],
      ['12345678-9', '2026-06-01', 30, 0, 0, 1850000, 'Sí'],
      ['15432987-K', '2026-06-01', 30, 0, 0, 1500000, 'No']
    ];
    const wsRem = XLSX.utils.aoa_to_sheet(dataRem);
    XLSX.utils.book_append_sheet(wb, wsRem, 'Remuneraciones');

    const dataReemp = [
      ['RUN Titular', 'Fecha Inicio Licencia', 'Fecha Término', 'RUN Reemplazante', 'Horas Reemplazo', 'Origen Fondo Reemplazo'],
      ['16789012-3', '2026-06-05', '2026-06-20', '10876543-2', 44, 'PIE']
    ];
    const wsReemp = XLSX.utils.aoa_to_sheet(dataReemp);
    XLSX.utils.book_append_sheet(wb, wsReemp, 'Licencias y Reemplazos');

    XLSX.writeFile(wb, 'Planilla_3_Remuneraciones_Reemplazos.xlsx');
  }
}

