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

    // Find the header row by searching for "run", "r.u.n.", "rut"
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;
      const hasRun = row.some(cell => {
        const val = String(cell || '').trim().toLowerCase();
        return val === 'run' || val === 'r.u.n.' || val === 'rut' || val === 'r.u.n';
      });
      if (hasRun) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = rawRows[headerRowIdx].map(h => 
      String(h || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );

    const getIndex = (kws: string[], fallback: number): number => {
      let idx = headers.findIndex(h => kws.some(kw => h === kw));
      if (idx !== -1) return idx;
      idx = headers.findIndex(h => kws.some(kw => h.includes(kw)));
      return idx !== -1 ? idx : fallback;
    };

    const idxRun = getIndex(['run', 'rut', 'r.u.n.'], 0);
    const idxRunLimpio = getIndex(['run_limpio', 'run limpio', 'run_clean', 'run clean'], -1);
    const idxPat = getIndex(['apellido paterno', 'paterno'], -1);
    const idxMat = getIndex(['apellido materno', 'materno'], -1);
    const idxNom = getIndex(['nombres', 'nombre', 'nombre/cargo'], 3);
    const idxSexo = getIndex(['sexo', 'genero', 'género'], 4);
    const idxLeg = getIndex(['legislacion laboral', 'legislación laboral', 'legislacion', 'ley', 'estamento'], 5);
    const idxProg = getIndex(['programa', 'subvencion'], 8);
    const idxComuna = getIndex(['comuna'], 9);
    const idxCentroCosto = getIndex(['centro costo', 'centro_costo', 'establecimiento', 'colegio'], 10);
    const idxRbd = getIndex(['rbd_maestro_contrato', 'rbd_maestro', 'rbd maestro', 'rbd_clean', 'rbd clean', 'rbd'], 11);
    const idxCargo = getIndex(['cargo', 'funcion', 'función'], 12);
    const idxTramo = getIndex(['tramo'], 13);
    const idxTipoContrato = getIndex(['tipo contrato', 'tipo_contrato', 'calidad'], 14);
    const idxHoras = getIndex(['horas contrato', 'horas_contrato', 'horas'], 15);
    const idxActivo = getIndex(['principal activo', 'activo', 'estado'], -1);
    const idxTotalHaberes = getIndex(['total haberes', 'total_haberes', 'sueldo liquido', 'sueldo_liquido', 'sueldo', 'haberes'], -1);
    const idxIngreso = getIndex(['ingreso', 'fecha_ingreso', 'fecha ingreso'], -1);

    // Multi-column hours / dotaciones
    const idxHorasMaestro = getIndex(['horas_contrato_maestro', 'horas contrato maestro'], -1);
    const idxRegular = getIndex(['horas_dotacion_regular', 'horas dotacion regular', 'horas dotación regular', 'regular', 'horas corriente', 'horas_corriente', 'corriente'], -1);
    const idxPIE = getIndex(['horas_dotacion_pie', 'horas dotacion pie', 'horas dotación pie', 'pie', 'horas pie', 'horas_pie'], -1);
    const idxSEP = getIndex(['horas_dotacion_sep', 'horas dotacion sep', 'horas dotación sep', 'sep', 'horas sep', 'horas_sep'], -1);

    const startRow = headerRowIdx + 1;

    for (let i = startRow; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;

      let runRaw = row[idxRun];
      let run = '';
      if (runRaw !== undefined && runRaw !== null && String(runRaw).trim() !== '' && String(runRaw).trim() !== 'NaN') {
        run = normalizarRun(runRaw);
      } else if (idxRunLimpio !== -1 && row[idxRunLimpio] !== undefined && row[idxRunLimpio] !== null && String(row[idxRunLimpio]).trim() !== '' && String(row[idxRunLimpio]).trim() !== 'NaN') {
        const body = String(row[idxRunLimpio]).replace(/[^0-9]/g, '').trim();
        if (body.length >= 6) {
          // Calculate DV using Chilean RUT Module 11
          let m = 0, s = 1;
          let t = parseInt(body, 10);
          for (; t; t = Math.floor(t / 10)) {
            s = (s + t % 10 * (9 - m++ % 6)) % 11;
          }
          const dv = s ? String(s - 1) : 'K';
          run = normalizarRun(`${body}-${dv}`);
        }
      }

      if (!run) continue;

      // If the row contains header names, skip it
      if (run.toLowerCase().includes('run') || run.toLowerCase().includes('r.u.n')) {
        continue;
      }

      const apePat = idxPat !== -1 ? String(row[idxPat] || '').trim() : '';
      const apeMat = idxMat !== -1 ? String(row[idxMat] || '').trim() : '';
      const nombres = String(row[idxNom] || '').trim();
      const nombreCompleto = `${nombres} ${apePat} ${apeMat}`.replace(/\s+/g, ' ').trim();

      const sexVal = String(row[idxSexo] || '').trim().toUpperCase();
      let genero = sexVal;
      if (sexVal === 'M' || sexVal.startsWith('MASC')) genero = 'Masculino';
      else if (sexVal === 'F' || sexVal.startsWith('FEM')) genero = 'Femenino';

      const legLab = String(row[idxLeg] || '').trim();
      let estamento: 'Docente' | 'Asistente de la Educación' = 'Asistente de la Educación';
      if (legLab.toLowerCase().includes('docente')) {
        estamento = 'Docente';
      } else if (legLab.toLowerCase().includes('asistente') || legLab.toLowerCase().includes('auxiliar')) {
        estamento = 'Asistente de la Educación';
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

      const tramoRaw = String(row[idxTramo] || '').trim();
      let tramo: 'Sin Tramo' | 'Acceso' | 'Inicial' | 'Temprano' | 'Avanzado' | 'Experto I' | 'Experto II' = 'Sin Tramo';
      const tramoClean = tramoRaw.toLowerCase();
      if (tramoClean.includes('acceso')) tramo = 'Acceso';
      else if (tramoClean.includes('inicial')) tramo = 'Inicial';
      else if (tramoClean.includes('temprano')) tramo = 'Temprano';
      else if (tramoClean.includes('avanzado')) tramo = 'Avanzado';
      else if (tramoClean.includes('experto i') || tramoClean.includes('experto 1')) tramo = 'Experto I';
      else if (tramoClean.includes('experto ii') || tramoClean.includes('experto 2')) tramo = 'Experto II';

      const programa = String(row[idxProg] || '').trim();
      const comunaRaw = String(row[idxComuna] || '').trim();
      const centroCosto = String(row[idxCentroCosto] || '').trim();
      const rbdVal = String(row[idxRbd] || '').trim();
      const cargoRaw = String(row[idxCargo] || '').trim();
      const tipoContrato = String(row[idxTipoContrato] || '').trim();

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
        if (cargo && cargo.trim() !== '' && cargo !== 'Docente de Aula' && cargo !== 'Asistente') score++;
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
          if (!func.cargo && cargoRaw) func.cargo = cargoRaw;
          if ((!func.tramo || func.tramo === 'Sin Tramo') && tramo !== 'Sin Tramo') func.tramo = tramo;
          if (!func.fecha_ingreso_establecimiento && fechaIngreso) func.fecha_ingreso_establecimiento = fechaIngreso;
        }
      }

      // Relevance filter check on Total Haberes / Sueldo Líquido
      const totalHaberesRaw = idxTotalHaberes !== -1 ? row[idxTotalHaberes] : undefined;
      const totalHaberes = parseDecimalHours(totalHaberesRaw);
      const isRelevanceZero = idxTotalHaberes !== -1 && (totalHaberes === 0 || totalHaberesRaw === null || totalHaberesRaw === '');

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
            funcion_principal: func.cargo || 'Funcionario',
            estado,
            horas_totales: 0,
            legislacion_laboral
          };
          contratos.push(nuevoContrato);
          contrato = nuevoContrato;
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

