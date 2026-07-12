// @ts-ignore
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Funcionario, Contrato, FinanciamientoContrato, OrigenFondo, AlertaConciliacion, RegistroRemuneracion, CalidadJuridica, normalizarCargoDocente, Establecimiento } from './types';

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

    // Force Row 1 (index 0) as the headerRowIdx
    const headerRowIdx = 0;
    const headers = rawRows[0] ? rawRows[0].map((cell: any) => String(cell || '').trim()) : [];

    const rows: any[] = [];
    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;
      const obj: any = {};
      let hasData = false;
      headers.forEach((header, colIdx) => {
        if (!header) return;
        const val = row[colIdx];
        obj[header] = val !== undefined ? val : '';
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          hasData = true;
        }
      });
      if (hasData) {
        rows.push(obj);
      }
    }

    const headersLower = headers.map(h => h.toLowerCase());
    const hasRbd = headersLower.some(h => h === 'rbd');
    const hasEstablecimientoName = headersLower.some(h => h.includes('establecimiento') || h.includes('colegio') || h.includes('nombre'));
    const isEstablishmentSheet = hasRbd && hasEstablecimientoName && !headersLower.some(h => h.includes('run') || h.includes('r.u.n.') || h.includes('rut') || h.includes('contrato'));

    if (isEstablishmentSheet) {
      rows.forEach(row => {
        const rbdKey = headers.find(h => h.toLowerCase() === 'rbd');
        const nameKey = headers.find(h => h.toLowerCase().includes('establecimiento') || h.toLowerCase().includes('colegio') || h.toLowerCase() === 'nombre');
        const comunaKey = headers.find(h => h.toLowerCase().includes('comuna'));
        
        if (!rbdKey || !row[rbdKey]) return;
        const rbd = String(row[rbdKey]).trim();
        const nombre = nameKey ? String(row[nameKey] || '').trim() : 'Establecimiento ' + rbd;
        
        let comuna = 'Chillán Viejo';
        if (comunaKey && row[comunaKey]) {
          comuna = String(row[comunaKey]).trim();
        } else {
          const normSheet = sheetName.toLowerCase();
          if (normSheet.includes('bulnes')) comuna = 'Bulnes';
          else if (normSheet.includes('chillan viejo') || normSheet.includes('chillán viejo')) comuna = 'Chillán Viejo';
          else if (normSheet.includes('el carmen')) comuna = 'El Carmen';
          else if (normSheet.includes('pemuco')) comuna = 'Pemuco';
          else if (normSheet.includes('san ignacio')) comuna = 'San Ignacio';
          else if (normSheet.includes('yungay')) comuna = 'Yungay';
          else if (normSheet.includes('quillon') || normSheet.includes('quillón')) comuna = 'Quillón';
        }

        const cleanComuna = comuna.charAt(0).toUpperCase() + comuna.slice(1).toLowerCase();
        
        if (!establecimientos.some(e => e.rbd === rbd)) {
          establecimientos.push({
            rbd,
            nombre,
            ivm: 75.0,
            comuna: cleanComuna,
            regimen: 'JEC'
          });
        }
      });
      return;
    }

    const hasRun = headersLower.some(h => h.includes('run') || h.includes('r.u.n.') || h.includes('rut'));
    if (hasRun) {
      rows.forEach((row, idx) => {
        const runKey = headers.find(h => h.toLowerCase().includes('run') || h.toLowerCase().includes('r.u.n.') || h.toLowerCase().includes('rut'));
        if (!runKey || !row[runKey]) return;
        const run = normalizarRun(row[runKey]);
        if (!run) return;

        let nombre = 'Funcionario Sin Nombre';
        const nameKey = headers.find(h => h.toLowerCase() === 'nombre' || h.toLowerCase() === 'nombres' || h.toLowerCase() === 'nombres/apellidos');
        const paternoKey = headers.find(h => h.toLowerCase().includes('paterno'));
        const maternoKey = headers.find(h => h.toLowerCase().includes('materno'));
        
        if (paternoKey || maternoKey) {
          const nom = nameKey ? String(row[nameKey] || '').trim() : '';
          const pat = paternoKey ? String(row[paternoKey] || '').trim() : '';
          const mat = maternoKey ? String(row[maternoKey] || '').trim() : '';
          nombre = `${nom} ${pat} ${mat}`.replace(/\s+/g, ' ').trim();
        } else if (nameKey) {
          nombre = String(row[nameKey]).trim();
        }

        const sexKey = headers.find(h => h.toLowerCase() === 'sexo' || h.toLowerCase() === 'genero' || h.toLowerCase() === 'género');
        let genero = sexKey ? String(row[sexKey] || '').trim() : undefined;
        if (genero) {
          genero = genero.toUpperCase().startsWith('M') ? 'Masculino' : genero.toUpperCase().startsWith('F') ? 'Femenino' : genero;
        }

        const ingresoKey = headers.find(h => h.toLowerCase().includes('ingreso') || h.toLowerCase().includes('fecha de ingreso') || h.toLowerCase() === 'fecha_ingreso' || h.toLowerCase() === 'ingreso');
        const fecha_ingreso = ingresoKey ? String(row[ingresoKey] || '').trim() : undefined;

        const tramoKey = headers.find(h => h.toLowerCase().includes('tramo'));
        let tramo: any = tramoKey ? String(row[tramoKey] || '').trim() : undefined;
        if (tramo) {
          const tr = tramo.toLowerCase();
          if (tr.includes('inicial')) tramo = 'Inicial';
          else if (tr.includes('temprano')) tramo = 'Temprano';
          else if (tr.includes('avanzado')) tramo = 'Avanzado';
          else if (tr.includes('experto i') || tr.includes('experto 1')) tramo = 'Experto I';
          else if (tr.includes('experto ii') || tr.includes('experto 2')) tramo = 'Experto II';
          else if (tr.includes('acceso')) tramo = 'Acceso';
          else tramo = 'Sin Tramo';
        }

        const cargoKey = headers.find(h => h.toLowerCase() === 'cargo' || h.toLowerCase().includes('función') || h.toLowerCase().includes('funcion') || h.toLowerCase() === 'cargo/funcion');
        const cargoRaw = cargoKey ? String(row[cargoKey] || '').trim() : 'Docente de Aula';
        
        // Estamento detection based on Legislación Laboral or Cargo
        const legKey = headers.find(h => h.toLowerCase().includes('legislac') || h.toLowerCase().includes('laboral') || h.toLowerCase().includes('ley') || h.toLowerCase().includes('estatuto'));
        const legVal = legKey && row[legKey] ? String(row[legKey]).trim().toLowerCase() : '';

        let estamento: 'Docente' | 'Asistente de la Educación' = 'Asistente de la Educación';
        if (legVal.includes('docente') || legVal.includes('estatuto')) {
          estamento = 'Docente';
        } else if (legVal.includes('asistente') || legVal.includes('auxiliar')) {
          estamento = 'Asistente de la Educación';
        } else {
          if (forceEstamento) {
            estamento = forceEstamento;
          } else {
            const c = cargoRaw.toLowerCase();
            if (c.includes('docente') || c.includes('profesor') || c.includes('director') || c.includes('utp') || c.includes('educadora')) {
              estamento = 'Docente';
            }
          }
        }

        const cargo = estamento === 'Docente' ? normalizarCargoDocente(cargoRaw) : cargoRaw;

        const contratoKey = headers.find(h => h.toLowerCase().includes('contrato') || h.toLowerCase().includes('calidad') || h.toLowerCase() === 'tipo contrato' || h.toLowerCase() === 'calidad juridica');
        const rawContrato = contratoKey ? String(row[contratoKey] || '').trim().toLowerCase() : 'a contrata';
        let calidad_juridica: CalidadJuridica = 'A contrata';
        if (rawContrato.includes('titular')) calidad_juridica = 'Titular';
        else if (rawContrato.includes('plazo fijo')) calidad_juridica = 'Plazo fijo';
        else if (rawContrato.includes('indefinido')) calidad_juridica = 'Indefinido';
        else if (rawContrato.includes('reemplazo pie')) calidad_juridica = 'Reemplazo PIE';
        else if (rawContrato.includes('reemplazo sep')) calidad_juridica = 'Reemplazo SEP';
        else if (rawContrato.includes('reemplazo')) calidad_juridica = 'Reemplazo';
        else if (rawContrato.includes('habilitacion') || rawContrato.includes('habilitación')) calidad_juridica = 'Habilitación especial';

        const parseFormulaHours = (val: any): number => {
          if (val === undefined || val === null || val === '') return 0;
          const str = String(val).trim();
          if (str.includes('+')) {
            return str.split('+').reduce((sum, part) => sum + parseDecimalHours(part), 0);
          }
          return parseDecimalHours(val);
        };

        const hoursKey = headers.find(h => h.toLowerCase().includes('horas contrato') || h.toLowerCase().includes('horas_contrato') || h.toLowerCase().includes('horas totales') || h.toLowerCase() === 'horas');
        const horas_totales = hoursKey ? parseFormulaHours(row[hoursKey]) : 30;

        const regularKey = headers.find(h => h.toLowerCase().includes('regular') || h.toLowerCase() === 'subvencion regular' || h.toLowerCase() === 'normal');
        const sepKey = headers.find(h => h.toLowerCase() === 'sep' || h.toLowerCase().includes('sep') || h.toLowerCase() === 'subvencion sep');
        const pieKey = headers.find(h => h.toLowerCase() === 'pie' || h.toLowerCase().includes('pie') || h.toLowerCase() === 'subvencion pie');
        
        let regular = regularKey ? parseFormulaHours(row[regularKey]) : 0;
        let sep = sepKey ? parseFormulaHours(row[sepKey]) : 0;
        let pie = pieKey ? parseFormulaHours(row[pieKey]) : 0;

        const regularCols = headers.filter(h => h.toLowerCase().includes('regular') || h.toLowerCase().includes('normal'));
        if (regularCols.length > 1) {
          regular = regularCols.reduce((sum, col) => sum + parseFormulaHours(row[col]), 0);
        }
        const pieCols = headers.filter(h => h.toLowerCase().includes('pie') && h.toLowerCase() !== 'programa');
        if (pieCols.length > 1) {
          pie = pieCols.reduce((sum, col) => sum + parseFormulaHours(row[col]), 0);
        }

        // Program column logic
        if (regular === 0 && sep === 0 && pie === 0 && horas_totales > 0) {
          const programKey = headers.find(h => h.toLowerCase() === 'programa');
          const programVal = programKey && row[programKey] ? String(row[programKey]).trim().toLowerCase() : '';
          
          if (programVal.includes('pie')) {
            pie = horas_totales;
          } else if (programVal.includes('sep')) {
            sep = horas_totales;
          } else {
            regular = horas_totales;
          }
        }

        const rbdKey = headers.find(h => h.toLowerCase() === 'rbd' || h.toLowerCase().includes('rbd_establecimiento'));
        const ccKey = headers.find(h => h.toLowerCase().includes('centro costo') || h.toLowerCase().includes('centro_costo') || h.toLowerCase().includes('establecimiento') || h.toLowerCase() === 'colegio');
        const comunaKey = headers.find(h => h.toLowerCase().includes('comuna'));

        let rbd = rbdContext;
        let schoolName = '';
        let schoolComuna = 'Chillán Viejo';

        if (ccKey && row[ccKey]) {
          schoolName = String(row[ccKey]).trim();
        }
        if (comunaKey && row[comunaKey]) {
          schoolComuna = String(row[comunaKey]).trim();
        }

        const cleanString = (str: string): string => {
          return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/n[°ºo]\s*\d+/g, "") // Remove "N° XX" or "N°XX"
            .replace(/[^a-z0-9]/g, " ") // Keep only alphanumeric
            .replace(/\s+/g, " ") // Normalize spaces
            .trim();
        };

        if (rbdKey && row[rbdKey]) {
          rbd = String(row[rbdKey]).trim();
        } else if (schoolName) {
          const cleanNameKey = cleanString(schoolName);
          let foundRbd = '';
          for (const [dbName, dbRbd] of Object.entries(schoolNameToRbdMap)) {
            const cleanDbName = cleanString(dbName);
            if (cleanDbName === cleanNameKey || cleanDbName.includes(cleanNameKey) || cleanNameKey.includes(cleanDbName)) {
              foundRbd = dbRbd;
              break;
            }
          }
          if (foundRbd) {
            rbd = foundRbd;
          } else {
            let hash = 0;
            for (let i = 0; i < schoolName.length; i++) {
              hash = schoolName.charCodeAt(i) + ((hash << 5) - hash);
            }
            rbd = String(900000 + Math.abs(hash % 100000));
          }
        }

        let cleanComuna = schoolComuna.charAt(0).toUpperCase() + schoolComuna.slice(1).toLowerCase().trim();
        if (cleanComuna.toLowerCase().startsWith('chillan')) {
          cleanComuna = 'Chillán';
        } else if (cleanComuna.toLowerCase().startsWith('yungay')) {
          cleanComuna = 'Yungay';
        } else if (cleanComuna.toLowerCase().includes('carmen')) {
          cleanComuna = 'El Carmen';
        } else if (cleanComuna.toLowerCase().includes('coihueco')) {
          cleanComuna = 'Coihueco';
        } else if (cleanComuna.toLowerCase().includes('pemuco')) {
          cleanComuna = 'Pemuco';
        } else if (cleanComuna.toLowerCase().includes('pinto')) {
          cleanComuna = 'Pinto';
        } else if (cleanComuna.toLowerCase().includes('quillon') || cleanComuna.toLowerCase().includes('quillón')) {
          cleanComuna = 'Quillón';
        } else if (cleanComuna.toLowerCase().includes('san ignacio')) {
          cleanComuna = 'San Ignacio';
        }

        if (rbd && schoolName) {
          if (!establecimientos.some(e => e.rbd === rbd)) {
            establecimientos.push({
              rbd,
              nombre: schoolName,
              ivm: 75.0,
              comuna: cleanComuna,
              regimen: 'JEC'
            });
          }
        }

        if (!funcionarios.some(f => f.run === run)) {
          funcionarios.push({
            run,
            nombre,
            estamento,
            cargo,
            genero,
            fecha_ingreso_sistema: fecha_ingreso,
            fecha_ingreso_establecimiento: fecha_ingreso,
            tramo: tramo || 'Sin Tramo'
          });
        }

        const contrato_id = `csv-${rbd}-${run.replace(/[^a-zA-Z0-9]/g, '')}-${idx}`;
        const legislacion_laboral = estamento === 'Docente' ? 'Estatuto docente' : 'Asistentes de la educación';
        
        const aulaKey = headers.find(h => h.toLowerCase().includes('horas aula') || h.toLowerCase().includes('horas_aula') || h.toLowerCase() === 'aula');
        const horas_aula = aulaKey ? parseFormulaHours(row[aulaKey]) : undefined;

        contratos.push({
          id: contrato_id,
          funcionario_run: run,
          rbd,
          calidad_juridica,
          funcion_principal: cargo,
          estado: 'Activo',
          horas_totales,
          legislacion_laboral,
          horas_aula
        });

        if (regular > 0) {
          financiamientos.push({
            id: `f-${contrato_id}-Regular`,
            contrato_id,
            origen_fondo: 'Subvención Regular',
            horas: regular
          });
        }
        if (sep > 0) {
          financiamientos.push({
            id: `f-${contrato_id}-SEP`,
            contrato_id,
            origen_fondo: 'SEP',
            horas: sep
          });
        }
        if (pie > 0) {
          financiamientos.push({
            id: `f-${contrato_id}-PIE`,
            contrato_id,
            origen_fondo: 'PIE',
            horas: pie
          });
        }
      });
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

