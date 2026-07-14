// @ts-ignore
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Funcionario, Contrato, FinanciamientoContrato, OrigenFondo, AlertaConciliacion, RegistroRemuneracion, CalidadJuridica, normalizarCargoDocente, Establecimiento, EstadoContrato, LegislacionLaboral } from './types';

// Normalization function for RUN
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
  
  const fmtCuerpo = num.toLocaleString('es-CL').replace(/,/g, '.');
  return `${fmtCuerpo}-${dv}`;
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
  
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
    if (rawRows.length === 0) return;

    // Find the header row by searching for "run", "r.u.n.", "rut" and ensuring the row has multiple columns populated
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;
      
      const nonCount = row.filter(cell => String(cell || '').trim() !== '').length;
      if (nonCount < 4) continue; // Skip title rows with very few columns populated
      
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
      // 1. Exact matches in order of keyword preference
      for (const kw of kws) {
        const idx = headers.findIndex(h => h === kw);
        if (idx !== -1) return idx;
      }
      // 2. Substring matches in order of keyword preference
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

    // Multi-column hours / dotaciones
    const idxHorasMaestro = getIndex(['horascontratomaestro'], -1);
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
        
        // Clean dots and spaces
        const clean = str.replace(/[\.\s]/g, '');
        
        // If it has a hyphen, it has a DV
        if (clean.includes('-')) {
          return normalizarRun(clean);
        }
        
        // If it has no hyphen, let's look at the length and contents
        const digitsOnly = clean.replace(/[^0-9]/g, '');
        const hasK = clean.toUpperCase().includes('K');
        
        // If it has a K, it has a DV
        if (hasK) {
          return normalizarRun(clean);
        }
        
        // If it is numeric only:
        // Chilean RUT bodies are between 5,000,000 and 28,000,000 (length 7 or 8).
        // If the length of digits is 7 or 8, it is likely just the body (missing the DV).
        // If length is 9, the last digit is the DV.
        if (digitsOnly.length === 7 || digitsOnly.length === 8) {
          // It's a body-only RUT! We calculate the DV.
          let m = 0, s = 1;
          let t = parseInt(digitsOnly, 10);
          for (; t; t = Math.floor(t / 10)) {
            s = (s + t % 10 * (9 - m++ % 6)) % 11;
          }
          const dv = s ? String(s - 1) : 'K';
          return normalizarRun(`${digitsOnly}-${dv}`);
        }
        
        // Otherwise, use standard normalization
        return normalizarRun(clean);
      };

      if (runRaw !== undefined && runRaw !== null && String(runRaw).trim() !== '' && String(runRaw).trim() !== 'NaN') {
        run = processRawRun(runRaw);
      } else if (idxRunLimpio !== -1 && row[idxRunLimpio] !== undefined && row[idxRunLimpio] !== null && String(row[idxRunLimpio]).trim() !== '' && String(row[idxRunLimpio]).trim() !== 'NaN') {
        run = processRawRun(row[idxRunLimpio]);
      }

      if (!run) continue;

      // If the row contains header names, skip it
      if (run.toLowerCase().includes('run') || run.toLowerCase().includes('r.u.n')) {
        continue;
      }

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
        if (legLab.toLowerCase().includes('docente')) {
          estamento = 'Docente';
        } else if (legLab.toLowerCase().includes('asistente') || legLab.toLowerCase().includes('auxiliar')) {
          estamento = 'Asistente de la Educación';
        } else if (forceEstamento) {
          estamento = forceEstamento;
        }
      } else if (cargoRaw) {
        // Fallback to cargo analysis if no legLab column is found
        if (cargoLower.includes('docente') || cargoLower.includes('profesor') || cargoLower.includes('educador') || cargoLower.includes('director') || cargoLower.includes('tecnico pedagogico') || cargoLower.includes('psicopedagog') || cargoLower.includes('pie') || cargoLower.includes('orientador')) {
          estamento = 'Docente';
        } else if (cargoLower.includes('asistente') || cargoLower.includes('auxiliar') || cargoLower.includes('inspector') || cargoLower.includes('paradocente') || cargoLower.includes('administrativo') || cargoLower.includes('secretaria')) {
          estamento = 'Asistente de la Educación';
        } else if (forceEstamento) {
          estamento = forceEstamento;
        }
      } else if (forceEstamento) {
        estamento = forceEstamento;
      }

      let legislacion_laboral: LegislacionLaboral = estamento === 'Docente' ? 'Estatuto docente' : 'Asistentes de la educación';
      const legLabClean = legLab.toLowerCase();
      if (legLabClean.includes('docente')) {
        legislacion_laboral = 'Estatuto docente';
      } else if (legLabClean.includes('asistente') || legLabClean.includes('auxiliar')) {
        legislacion_laboral = 'Asistentes de la educación';
      }

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
      else if (tramoClean.includes('experto i') || tramoClean.includes('experto 1')) tramo = 'Experto I';
      else if (tramoClean.includes('experto ii') || tramoClean.includes('experto 2')) tramo = 'Experto II';

      const programa = idxProg !== -1 ? String(row[idxProg] || '').trim() : '';
      const comunaRaw = idxComuna !== -1 ? String(row[idxComuna] || '').trim() : '';
      const centroCosto = idxCentroCosto !== -1 ? String(row[idxCentroCosto] || '').trim() : '';
      const rbdVal = idxRbd !== -1 ? String(row[idxRbd] || '').trim() : '';
      const tipoContrato = idxTipoContrato !== -1 ? String(row[idxTipoContrato] || '').trim() : '';

      let rbd = rbdVal || '';
      if (!rbd && centroCosto) {
        // Try mapping from schoolNameToRbdMap
        const cleanString = (str: string): string => {
          return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/n[°ºo]\s*\d+/g, "")
            .replace(/[^a-z0-9]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        };

        const cleanCC = cleanString(centroCosto);
        let foundRbd = '';
        for (const [dbName, dbRbd] of Object.entries(schoolNameToRbdMap)) {
          const cleanDbName = cleanString(dbName);
          if (cleanDbName === cleanCC || cleanDbName.includes(cleanCC) || cleanCC.includes(cleanDbName)) {
            foundRbd = dbRbd;
            break;
          }
        }
        if (foundRbd) {
          rbd = foundRbd;
        } else {
          // Fallback to hashing
          let hash = 0;
          for (let i = 0; i < centroCosto.length; i++) {
            hash = centroCosto.charCodeAt(i) + ((hash << 5) - hash);
          }
          rbd = String(900000 + Math.abs(hash % 100000));
        }
      }

      if (!rbd) {
        rbd = rbdContext;
      }

      let comuna = comunaRaw.charAt(0).toUpperCase() + comunaRaw.slice(1).toLowerCase().trim();
      if (!comuna) {
        const ccLower = centroCosto.toLowerCase();
        if (ccLower.includes('bulnes')) comuna = 'Bulnes';
        else if (ccLower.includes('carmen')) comuna = 'El Carmen';
        else if (ccLower.includes('pemuco')) comuna = 'Pemuco';
        else if (ccLower.includes('yungay')) comuna = 'Yungay';
        else if (ccLower.includes('quillon') || ccLower.includes('quillón')) comuna = 'Quillón';
        else if (ccLower.includes('san ignacio')) comuna = 'San Ignacio';
        else comuna = 'Chillán Viejo';
      }

      if (rbd && centroCosto) {
        if (!establecimientos.some(e => e.rbd === rbd)) {
          establecimientos.push({
            rbd,
            nombre: centroCosto,
            ivm: 75.0,
            comuna,
            regimen: 'JEC'
          });
        }
      }

      // Add or update Funcionario with completeness prioritization
      let func = funcionarios.find(f => f.run === run);
      
      const getCompletenessScore = (est: string, cargo: string, tr: string) => {
        let score = 0;
        if (est && est.trim() !== '') score++;
        
        const cClean = (cargo || '').trim().toLowerCase();
        if (cClean !== '' && cClean !== 'docente de aula' && cClean !== 'docente' && cClean !== 'asistente' && cClean !== 'funcionario') {
          score += 2; // Specific cargos get higher score
        } else if (cClean !== '') {
          score += 1; // Generic cargos get lower score
        }
        
        if (tr && tr.trim() !== '' && tr !== 'Sin Tramo') score++;
        return score;
      };

      const fechaIngreso = idxIngreso !== -1 ? String(row[idxIngreso] || '').trim() : undefined;

      if (!func) {
        func = {
          run,
          nombre: nombreCompleto || 'Funcionario Sin Nombre',
          estamento,
          cargo: cargoRaw || (estamento === 'Docente' ? 'Docente de Aula' : 'Asistente'),
          genero,
          tramo: tramo,
          fecha_ingreso_establecimiento: fechaIngreso
        };
        funcionarios.push(func);
      } else {
        const existingScore = getCompletenessScore(func.estamento || '', func.cargo || '', func.tramo || '');
        const currentScore = getCompletenessScore(estamento, cargoRaw, tramo);
        
        if (currentScore > existingScore) {
          func.estamento = estamento;
          if (cargoRaw) func.cargo = cargoRaw;
          if (genero) func.genero = genero;
          if (tramo && tramo !== 'Sin Tramo') func.tramo = tramo;
          if (nombreCompleto && nombreCompleto !== 'Funcionario Sin Nombre') func.nombre = nombreCompleto;
          if (fechaIngreso) func.fecha_ingreso_establecimiento = fechaIngreso;
        } else {
          if (!func.genero && genero) func.genero = genero;
          
          const existingCargoClean = (func.cargo || '').trim().toLowerCase();
          const isExistingGeneric = existingCargoClean === '' || existingCargoClean === 'docente de aula' || existingCargoClean === 'docente' || existingCargoClean === 'asistente' || existingCargoClean === 'funcionario';
          const newCargoClean = (cargoRaw || '').trim().toLowerCase();
          const isNewSpecific = newCargoClean !== '' && newCargoClean !== 'docente de aula' && newCargoClean !== 'docente' && newCargoClean !== 'asistente' && newCargoClean !== 'funcionario';
          if ((isExistingGeneric && isNewSpecific) || (!func.cargo && cargoRaw)) {
            func.cargo = cargoRaw;
          }
          
          if ((!func.tramo || func.tramo === 'Sin Tramo') && tramo !== 'Sin Tramo') func.tramo = tramo;
          if (!func.fecha_ingreso_establecimiento && fechaIngreso) func.fecha_ingreso_establecimiento = fechaIngreso;
        }
      }

      // Relevance filter check on Total Haberes / Sueldo Líquido
      const totalHaberesRaw = idxTotalHaberes !== -1 ? row[idxTotalHaberes] : undefined;
      const totalHaberes = parseDecimalHours(totalHaberesRaw);
      const isRelevanceZero = idxTotalHaberes !== -1 && totalHaberesRaw !== null && totalHaberesRaw !== undefined && String(totalHaberesRaw).trim() !== '' && totalHaberes === 0;

      // Create/update Contratos & Financiamientos ONLY if not relevance zero
      if (!isRelevanceZero) {
        // Quality mapping
        let calidad_juridica: CalidadJuridica = 'A contrata';
        const tipoContClean = tipoContrato.toLowerCase();
        if (tipoContClean.includes('titular')) calidad_juridica = 'Titular';
        else if (tipoContClean.includes('plazo fijo') || tipoContClean.includes('plazofijo')) calidad_juridica = 'Plazo fijo';
        else if (tipoContClean.includes('indefinido')) calidad_juridica = 'Indefinido';
        else if (tipoContClean.includes('reemplazo')) calidad_juridica = 'Reemplazo';
        else if (tipoContClean.includes('habilitacion') || tipoContClean.includes('habilitación')) calidad_juridica = 'Habilitación especial';

        // Add or update Contrato (Consolidación)
        let contrato = contratos.find(c => c.funcionario_run === run && c.rbd === rbd);
        
        // Multi-column hours parsing
        const horasRegular = idxRegular !== -1 ? parseDecimalHours(row[idxRegular]) : 0;
        const horasPIE = idxPIE !== -1 ? parseDecimalHours(row[idxPIE]) : 0;
        const horasSEP = idxSEP !== -1 ? parseDecimalHours(row[idxSEP]) : 0;
        
        const hasDirectDotaciones = idxRegular !== -1 || idxPIE !== -1 || idxSEP !== -1;
        
        let totalRowHoras = 0;
        if (hasDirectDotaciones) {
          totalRowHoras = horasRegular + horasPIE + horasSEP;
          if (totalRowHoras === 0 && idxHorasMaestro !== -1) {
            totalRowHoras = parseDecimalHours(row[idxHorasMaestro]);
          }
        } else {
          const fallbackHorasRaw = idxHorasMaestro !== -1 ? row[idxHorasMaestro] : (idxHoras !== -1 ? row[idxHoras] : 0);
          totalRowHoras = parseDecimalHours(fallbackHorasRaw);
        }
        
        if (!contrato) {
          const contrato_id = `csv-${rbd}-${run.replace(/[^a-zA-Z0-9]/g, '')}`;
          const nuevoContrato: Contrato = {
            id: contrato_id,
            funcionario_run: run,
            rbd,
            calidad_juridica, 
            funcion_principal: cargoRaw || func.cargo || (estamento === 'Docente' ? 'Docente de Aula' : 'Asistente'),
            estado,
            horas_totales: 0,
            legislacion_laboral
          };
          contratos.push(nuevoContrato);
          contrato = nuevoContrato;
        } else {
          // Consolidate funcion_principal: update if current is generic and new is specific
          const currentFunc = (contrato.funcion_principal || '').trim().toLowerCase();
          const isCurrentGeneric = currentFunc === '' || currentFunc === 'docente de aula' || currentFunc === 'docente' || currentFunc === 'asistente' || currentFunc === 'funcionario';
          const newFunc = (cargoRaw || '').trim().toLowerCase();
          const isNewSpecific = newFunc !== '' && newFunc !== 'docente de aula' && newFunc !== 'docente' && newFunc !== 'asistente' && newFunc !== 'funcionario';
          
          if (isCurrentGeneric && isNewSpecific) {
            contrato.funcion_principal = cargoRaw;
          }
        }
        
        // Aggregate hours
        contrato.horas_totales += totalRowHoras;

        // Financiamiento aggregation logic
        const upsertFinanciamiento = (origen: OrigenFondo, hrs: number) => {
          if (hrs <= 0) return;
          const finId = `f-${contrato.id}-${origen.replace(/\s+/g, '')}`;
          let financiamiento = financiamientos.find(f => f.id === finId);
          if (financiamiento) {
            financiamiento.horas += hrs;
          } else {
            financiamientos.push({
              id: finId,
              contrato_id: contrato.id,
              origen_fondo: origen,
              horas: hrs
            });
          }
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
          else if (progKey.includes('reforzamiento')) origen = 'Reforzamiento';
          else if (progKey.includes('retencion') || progKey.includes('retención')) origen = 'Pro-retención';
          else if (progKey.includes('bicentenario')) origen = 'Liceos Bicentenarios';
          else if (progKey) origen = 'Otro';

          upsertFinanciamiento(origen, totalRowHoras);
        }
      }
    }
  });

  return { funcionarios, contratos, financiamientos, alertas, establecimientos };
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
      nombre_esta: row.NombreEsta || row.nombre_esta || row.Establecimiento || row.establecimiento || undefined,
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

