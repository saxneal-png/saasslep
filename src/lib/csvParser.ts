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

export function normalizarRbd(rbdRaw: any): string {
  if (rbdRaw === undefined || rbdRaw === null) return '';
  const clean = String(rbdRaw).trim();
  if (!clean) return '';
  // Strip leading zeros for numeric RBDs
  if (/^\d+$/.test(clean)) {
    return String(parseInt(clean, 10));
  }
  return clean;
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

export function normalizarComuna(comunaRaw: any): string {
  if (comunaRaw === undefined || comunaRaw === null) return 'Chillán';
  const clean = String(comunaRaw).trim();
  if (!clean) return 'Chillán';
  const lower = clean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (lower.includes('chillan viejo') || lower.includes('chillanviejo')) return 'Chillán Viejo';
  if (lower.includes('san ignacio') || lower.includes('sanignacio')) return 'San Ignacio';
  if (lower.includes('el carmen') || lower.includes('elcarmen')) return 'El Carmen';
  if (lower.includes('chillan')) return 'Chillán';
  if (lower.includes('bulnes')) return 'Bulnes';
  if (lower.includes('pemuco')) return 'Pemuco';
  if (lower.includes('yungay')) return 'Yungay';
  if (lower.includes('quillon')) return 'Quillón';

  // Fallback to title case
  return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function generarUuidDeterminista(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0xfae12f34, h4 = 0x12345678;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3241249767);
    h4 = Math.imul(h4 ^ ch, 2468101213);
  }
  const hex = (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0')
  ).toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
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

  rows.forEach((rawRow: any, index: number) => {
    // Normalize keys to lowercase, trimmed, without accents or special chars
    const row: any = {};
    Object.keys(rawRow).forEach(k => {
      const cleanKey = String(k || '').trim().toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\.\-\s_]/g, "");
      row[cleanKey] = rawRow[k];
    });

    let runRaw = row.run || '';
    if (!runRaw && row.docrun) {
      const docRun = row.docrun;
      const docDv = row.docdv || '';
      runRaw = `${docRun}-${docDv}`;
    } else if (!runRaw && row.asistenterun) {
      const asisRun = row.asistenterun;
      const asisDv = row.asistentedv || '';
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

    let nombre = 'SIN NOMBRE REGISTRADO';
    if (row.nombre) {
      nombre = limpiarCaracteresCorruptos(row.nombre.trim()) || 'SIN NOMBRE REGISTRADO';
    } else if (row.docnombre) {
      const nom = (row.docnombre || '').trim();
      const pat = (row.docpaterno || '').trim();
      const mat = (row.docmaterno || '').trim();
      nombre = limpiarCaracteresCorruptos(`${nom} ${pat} ${mat}`.replace(/\s+/g, ' ').trim()) || 'SIN NOMBRE REGISTRADO';
    } else if (row.asistentenombre) {
      const nom = (row.asistentenombre || '').trim();
      const pat = (row.asistentepaterno || '').trim();
      const mat = (row.asistentematerno || '').trim();
      nombre = limpiarCaracteresCorruptos(`${nom} ${pat} ${mat}`.replace(/\s+/g, ' ').trim()) || 'SIN NOMBRE REGISTRADO';
    }

    const rbd = normalizarRbd(row.rbd);
    if (!rbd) {
      alertas.push({
        id: generarUuidDeterminista(`alerta-missing-rbd-${run}-${index}`),
        run,
        nombre_funcionario: nombre,
        rbd: '99999',
        tipo: 'rbd_vacio',
        nivel_alerta: 'critica',
        mensaje: `Fila ${index + 1}: RBD no especificado o vacío`,
        detalle: `La fila no contiene un RBD válido y no será procesada.`,
        resuelta: false
      });
      return;
    }
    
    // Quality mapping logic: map to expanded CalidadJuridica
    const rawCal = String(row.calidadjuridica || 'A contrata').trim();
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
      row.funcion || 
      row.funcionprincipal || 
      row.funcionuno || 
      'Auxiliar de Servicios'
    ).trim());

    let estamento: 'Docente' | 'Asistente de la Educación' = 'Asistente de la Educación';
    if (forceEstamento) {
      estamento = forceEstamento === 'Docente' ? 'Docente' : 'Asistente de la Educación';
    } else {
      const isAsisHeader = row.asistenterun !== undefined;
      const rawEst = String(row.estamento || '').trim().toLowerCase();
      if (!isAsisHeader && (rawEst.includes('docente') || rawEst.includes('profesor') || raw_funcion_principal.toLowerCase().includes('docente') || raw_funcion_principal.toLowerCase().includes('profesor'))) {
        estamento = 'Docente';
      }
    }

    const funcion_principal = raw_funcion_principal && raw_funcion_principal.trim() !== ''
      ? raw_funcion_principal.toUpperCase().trim()
      : (estamento === 'Docente' ? 'DOCENTE DE AULA' : 'ASISTENTE DE LA EDUCACIÓN');
    
    const horas_totales = parseDecimalHours(row.horastotales || row.horascontrato || row.horas_totales_sige || row.horas_totales_remun);

    const checkHasValue = (val: any) => val !== undefined && val !== null && val !== '';
    const horas_directivas = checkHasValue(row.horasdirectivas) ? parseDecimalHours(row.horasdirectivas)
      : checkHasValue(row.horasdirectiva) ? parseDecimalHours(row.horasdirectiva)
      : undefined;

    const horas_aula = checkHasValue(row.horasaula) ? parseDecimalHours(row.horasaula)
      : checkHasValue(row.horascronologicas) ? parseDecimalHours(row.horascronologicas)
      : undefined;

    const horas_tecnico_pedagogicas = checkHasValue(row.horastecnicopedagogicas) ? parseDecimalHours(row.horastecnicopedagogicas)
      : checkHasValue(row.horastecnicopedagogica) ? parseDecimalHours(row.horastecnicopedagogica)
      : checkHasValue(row.horastecnica) ? parseDecimalHours(row.horastecnica)
      : checkHasValue(row.horastecnico) ? parseDecimalHours(row.horastecnico)
      : undefined;

    const dias_trabajados = checkHasValue(row.diastrabajados) ? parseInt(row.diastrabajados, 10) : undefined;
    const dias_licencia_medica = checkHasValue(row.diaslicenciamedica) ? parseInt(row.diaslicenciamedica, 10) : undefined;
    const inasistencias = checkHasValue(row.inasistencias) ? parseInt(row.inasistencias, 10) : undefined;
    
    let legislacion_laboral: any = estamento === 'Docente' ? 'Estatuto docente' : 'Asistentes de la educación';
    const legRaw = String(row.legislacionlaboral || '').trim().toLowerCase();
    if (legRaw) {
      if (legRaw.includes('docente')) {
        legislacion_laboral = 'Estatuto docente';
      } else if (legRaw.includes('asistente')) {
        legislacion_laboral = 'Asistentes de la educación';
      }
    }

    // Sum subvenciones using float (parseFloat representation)
    let regular = parseDecimalHours(row.subvencionregular || row.regular);
    const sep = parseDecimalHours(row.sep);
    const pie = parseDecimalHours(row.pie);
    const reforzamiento = parseDecimalHours(row.reforzamiento);
    const proRetencion = parseDecimalHours(row.proretencion);
    const otro = parseDecimalHours(row.otro);

    let sumaSubvenciones = regular + sep + pie + reforzamiento + proRetencion + otro;
    if (sumaSubvenciones === 0 && horas_totales > 0) {
      regular = horas_totales;
      sumaSubvenciones = horas_totales;
    }

    // Create unique ID for contract
    const contrato_id = generarUuidDeterminista(`contrato-${rbd}-${run.replace(/[^a-zA-Z0-9]/g, '')}`);

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
      row.titulo || 
      row.doctitulo || 
      row.asistentetitulo || 
      row.tituloprofesional
    );

    const genero = cleanDiscardValue(row.asistentegenero || row.genero);
    const fecha_nacimiento = cleanDiscardValue(row.fechanacimiento || row.fechanac);

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

    // Add Contrato with merge logic (using Math.max for repeating contract-level hours)
    const existingContratoIdx = contratos.findIndex(c => c.id === contrato_id);
    if (existingContratoIdx >= 0) {
      const existing = contratos[existingContratoIdx];
      existing.horas_totales = Math.max(existing.horas_totales || 0, horas_totales || 0);
      if (horas_directivas !== undefined) {
        existing.horas_directivas = Math.max(existing.horas_directivas || 0, horas_directivas);
      }
      if (horas_aula !== undefined) {
        existing.horas_aula = Math.max(existing.horas_aula || 0, horas_aula);
      }
      if (horas_tecnico_pedagogicas !== undefined) {
        existing.horas_tecnico_pedagogicas = Math.max(existing.horas_tecnico_pedagogicas || 0, horas_tecnico_pedagogicas);
      }
    } else {
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
    }

    // Add Financiamientos with merge logic
    const agregarFondo = (origen: OrigenFondo, hrs: number) => {
      if (hrs > 0) {
        const finId = generarUuidDeterminista(`financiamiento-${contrato_id}-${origen.replace(/\s+/g, '')}`);
        const existingFinIdx = financiamientos.findIndex(f => f.id === finId);
        if (existingFinIdx >= 0) {
          financiamientos[existingFinIdx].horas = (financiamientos[existingFinIdx].horas || 0) + hrs;
        } else {
          financiamientos.push({
            id: finId,
            contrato_id,
            origen_fondo: origen,
            horas: hrs
          });
        }
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
        id: generarUuidDeterminista(`alerta-descalce-${contrato_id}`),
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
          id: generarUuidDeterminista(`alerta-ley20903-${contrato_id}`),
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
          id: generarUuidDeterminista(`alerta-ley20903-warn-${contrato_id}`),
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
            id: generarUuidDeterminista(`alerta-funcion-${contrato_id}`),
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
            id: generarUuidDeterminista(`alerta-horasprevias-${contrato_id}`),
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
  schoolNameToRbdMap: Record<string, string> = {},
  forceEstablecimientos?: boolean
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

  // --- Forced establishments mode: parse first sheet directly regardless of name ---
  if (forceEstablecimientos) {
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
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: '' });
    // Find header row (first row with a column containing 'rbd')
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
      const row = rawRows[i];
      if (row && Array.isArray(row)) {
        const hasRbd = row.some(cell => {
          const val = String(cell || '').trim().toLowerCase();
          return val === 'rbd' || val.includes('rbd');
        });
        if (hasRbd) {
          headerRowIdx = i;
          break;
        }
      }
    }
    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      for (let i = 0; i < Math.min(rawRows.length, 8); i++) {
        if (rawRows[i] && rawRows[i].filter((c: any) => String(c || '').trim() !== '').length > 1) {
          headerRowIdx = i;
          break;
        }
      }
    }
    const headers = rawRows[headerRowIdx].map((h: any) =>
      String(h || '').trim().toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\.\-\s_]/g, '')
    );
    const idxRbd    = getIndex(headers, ['rbd']);
    const idxNombre = getIndex(headers, ['nombre', 'establecimiento', 'establecimientos', 'escuela']);
    const idxComuna = getIndex(headers, ['comuna']);
    const idxIvm    = getIndex(headers, ['indicevulnerabilidad', 'ivm', 'vulnerabilidad']);
    const idxRegimen = getIndex(headers, ['regimen', 'tipo']);
    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row) continue;
      const rbd = normalizarRbd(row[idxRbd]);
      if (!rbd) continue;
      const establecimientos_arr = establecimientos as Establecimiento[];
      establecimientos_arr.push({
        rbd,
        nombre: idxNombre !== -1 && row[idxNombre] ? String(row[idxNombre]).trim() : `Establecimiento RBD ${rbd}`,
        ivm: idxIvm !== -1 && row[idxIvm] ? parseFloat(String(row[idxIvm]).replace(',', '.')) || 70 : 70,
        comuna: idxComuna !== -1 && row[idxComuna] ? normalizarComuna(row[idxComuna]) : 'Chillán',
        regimen: idxRegimen !== -1 && row[idxRegimen] ? (String(row[idxRegimen]).toUpperCase().includes('NO') ? 'No JEC' : 'JEC') : 'JEC'
      });
    }
    return { funcionarios, contratos, financiamientos, alertas, establecimientos, planesEstudio, cursosDinamicos, asignaturasDinamicas, remuneraciones, reemplazosLicencias };
  }
  
  // Detect if the workbook contains sheet names corresponding to the 3 planillas
  let hasRecognizedSheets = false;
  const sheetNamesNorm = workbook.SheetNames.map(s => 
    s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\.\-\s_]/g, "")
  );

  const targetSheetKeys = [
    'establecimientos', 'planesdeestudio', 'cursos', 'asignaturas', 
    'funcionarios', 'contratos', 'cargahoraria', 'remuneraciones', 'licenciasyreemplazos',
    'dotacion', 'dotacionycontratos'
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
      let foundHeader = false;
      if (normName === 'establecimientos') {
        for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
          const row = rawRows[i];
          if (row && Array.isArray(row) && row.some(cell => String(cell || '').trim().toLowerCase().includes('rbd'))) {
            headerRowIdx = i;
            foundHeader = true;
            break;
          }
        }
      }
      if (!foundHeader) {
        for (let i = 0; i < Math.min(rawRows.length, 8); i++) {
          const row = rawRows[i];
          if (row && row.filter(c => String(c || '').trim() !== '').length > 2) {
            headerRowIdx = i;
            break;
          }
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
        const idxNombre = getIndex(headers, ['nombre', 'establecimiento', 'establecimientos', 'escuela']);
        const idxIvm = getIndex(headers, ['indicevulnerabilidad', 'ivm', 'vulnerabilidad']);
        const idxComuna = getIndex(headers, ['comuna']);
        const idxRegimen = getIndex(headers, ['regimen', 'tipo']);

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxRbd]) continue;
          const rbd = normalizarRbd(row[idxRbd]);
          if (!rbd) continue;

          establecimientos.push({
            rbd,
            nombre: idxNombre !== -1 && row[idxNombre] ? String(row[idxNombre]).trim() : `Establecimiento RBD ${rbd}`,
            ivm: idxIvm !== -1 && row[idxIvm] ? parseFloat(String(row[idxIvm]).replace(',', '.')) || 70 : 70,
            comuna: idxComuna !== -1 && row[idxComuna] ? normalizarComuna(row[idxComuna]) : 'Chillán',
            regimen: idxRegimen !== -1 && row[idxRegimen] ? (String(row[idxRegimen]).toUpperCase().includes('NO') ? 'No JEC' : 'JEC') : 'JEC'
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
          const rbd = normalizarRbd(row[idxRbd] || rbdContext);
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
          const rbd = normalizarRbd(row[idxRbd] || rbdContext);
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

      else if (normName === 'funcionarios' || normName === 'contratos' || normName === 'dotacionycontratos' || normName === 'dotacion') {
        const idxRun = getIndex(headers, ['run', 'rut']);
        const idxNom = getIndex(headers, ['nombres', 'nombre', 'nombredocente']);
        const idxPat = getIndex(headers, ['apellidopaterno', 'paterno', 'apellidopat', 'pat']);
        const idxMat = getIndex(headers, ['apellidomaterno', 'materno', 'apellidomat', 'mat']);
        const idxRbd = getIndex(headers, ['rbd']);
        const idxEstablecimiento = getIndex(headers, ['establecimiento', 'escuela', 'centrodecosto']);
        const idxFuncion = getIndex(headers, ['funcionprincipal', 'funcion', 'cargo']);
        const idxCalidad = getIndex(headers, ['calidadjuridica', 'calidad', 'tipo']);
        const idxHorasRegular = getIndex(headers, ['horasregular', 'regular', 'corriente', 'subvencioncorriente', 'subvencionregular', 'horascorriente', 'horasregular']);
        const idxHorasSep = getIndex(headers, ['horassep', 'sep', 'horasep']);
        const idxHorasPie = getIndex(headers, ['horaspie', 'pie', 'horaspie']);
        const idxHorasTotales = getIndex(headers, ['horastotales', 'horas']);
        const idxTramo = getIndex(headers, ['tramodocente', 'tramo']);
        const idxFechaIngreso = getIndex(headers, ['fechaingreso', 'ingreso']);
        const idxEmail = getIndex(headers, ['email', 'correo']);
        const idxTel = getIndex(headers, ['telefono', 'fono']);
        const idxGen = getIndex(headers, ['genero', 'sexo']);
        const idxNac = getIndex(headers, ['fechanacimiento', 'nacimiento']);
        const idxEstamento = getIndex(headers, ['estamento']);

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxRun]) continue;
          const run = normalizarRun(row[idxRun]);
          if (!run) continue;

          let nombre = '';
          if (idxNom !== -1 && row[idxNom]) {
            nombre = String(row[idxNom]).trim();
          }
          const apePat = idxPat !== -1 ? String(row[idxPat] || '').trim() : '';
          const apeMat = idxMat !== -1 ? String(row[idxMat] || '').trim() : '';
          
          let nombreCompleto = nombre;
          if (apePat || apeMat) {
            nombreCompleto = `${nombre} ${apePat} ${apeMat}`.replace(/\s+/g, ' ').trim();
          }
          if (!nombreCompleto) {
            nombreCompleto = 'SIN NOMBRE REGISTRADO';
          }

          const rbd = idxRbd !== -1 ? normalizarRbd(row[idxRbd]) : rbdContext;
          const estNombre = idxEstablecimiento !== -1 ? String(row[idxEstablecimiento]).trim() : '';
          
          const cargoRaw = idxFuncion !== -1 ? String(row[idxFuncion]).trim() : '';
          const estRaw = idxEstamento !== -1 ? String(row[idxEstamento] || '').toLowerCase() : '';
          const estamento = (estRaw.includes('docente') || cargoRaw.toLowerCase().includes('docente') || cargoRaw.toLowerCase().includes('profesor') || cargoRaw.toLowerCase().includes('director') || cargoRaw.toLowerCase().includes('pie')) 
            ? 'Docente' 
            : 'Asistente de la Educación';

          const cargo = cargoRaw || (estamento === 'Docente' ? 'Docente de Aula' : 'Asistente de la Educación');
          
          const calClean = idxCalidad !== -1 ? String(row[idxCalidad] || '').toLowerCase() : '';
          let calidad_juridica: CalidadJuridica = 'A contrata';
          if (calClean.includes('titular')) calidad_juridica = 'Titular';
          else if (calClean.includes('plazo fijo')) calidad_juridica = 'Plazo fijo';
          else if (calClean.includes('indefinido')) calidad_juridica = 'Indefinido';
          else if (calClean.includes('reemplazo')) calidad_juridica = 'Reemplazo';

          const regular = idxHorasRegular !== -1 ? parseDecimalHours(row[idxHorasRegular]) : 0;
          const sep = idxHorasSep !== -1 ? parseDecimalHours(row[idxHorasSep]) : 0;
          const pie = idxHorasPie !== -1 ? parseDecimalHours(row[idxHorasPie]) : 0;
          
          let horas_totales = regular + sep + pie;
          if (horas_totales === 0 && idxHorasTotales !== -1) {
            horas_totales = parseDecimalHours(row[idxHorasTotales]);
          }

          const trRaw = idxTramo !== -1 ? String(row[idxTramo] || '').toLowerCase() : '';
          let tramo: 'Sin Tramo' | 'Acceso' | 'Inicial' | 'Temprano' | 'Avanzado' | 'Experto I' | 'Experto II' = 'Sin Tramo';
          if (trRaw.includes('acceso')) tramo = 'Acceso';
          else if (trRaw.includes('inicial')) tramo = 'Inicial';
          else if (trRaw.includes('temprano')) tramo = 'Temprano';
          else if (trRaw.includes('avanzado')) tramo = 'Avanzado';
          else if (trRaw.includes('experto i') || trRaw.includes('experto 1')) tramo = 'Experto I';
          else if (trRaw.includes('experto ii') || trRaw.includes('experto 2')) tramo = 'Experto II';

          let existingFunc = funcionarios.find(f => f.run === run);
          if (!existingFunc) {
            existingFunc = {
              run,
              nombre: nombreCompleto,
              email: idxEmail !== -1 ? String(row[idxEmail] || '').trim() || undefined : undefined,
              telefono: idxTel !== -1 ? String(row[idxTel] || '').trim() || undefined : undefined,
              genero: idxGen !== -1 ? String(row[idxGen] || '').trim() || undefined : undefined,
              fecha_nacimiento: idxNac !== -1 ? normalizarFecha(row[idxNac]) || undefined : undefined,
              fecha_ingreso_establecimiento: idxFechaIngreso !== -1 ? normalizarFecha(row[idxFechaIngreso]) || undefined : undefined,
              estamento,
              cargo,
              tramo
            };
            funcionarios.push(existingFunc);
          } else {
            if (nombreCompleto !== 'SIN NOMBRE REGISTRADO') existingFunc.nombre = nombreCompleto;
            if (idxEmail !== -1 && row[idxEmail]) existingFunc.email = String(row[idxEmail]).trim();
            if (idxTel !== -1 && row[idxTel]) existingFunc.telefono = String(row[idxTel]).trim();
            if (idxGen !== -1 && row[idxGen]) existingFunc.genero = String(row[idxGen]).trim();
            if (idxNac !== -1 && row[idxNac]) existingFunc.fecha_nacimiento = normalizarFecha(row[idxNac]);
            if (idxFechaIngreso !== -1 && row[idxFechaIngreso]) existingFunc.fecha_ingreso_establecimiento = normalizarFecha(row[idxFechaIngreso]);
            if (tramo !== 'Sin Tramo') existingFunc.tramo = tramo;
          }

          if (rbd && estNombre && !establecimientos.some(e => e.rbd === rbd)) {
            establecimientos.push({
              rbd,
              nombre: estNombre,
              ivm: 75,
              comuna: 'Chillán Viejo',
              regimen: 'JEC'
            });
          }

          const contrato_id = generarUuidDeterminista(`contrato-${rbd}-${run.replace(/[^a-zA-Z0-9]/g, '')}`);
          // Add Contrato with merge logic (using Math.max for repeating contract-level hours)
          const existingContratoIdx = contratos.findIndex(c => c.id === contrato_id);
          if (existingContratoIdx >= 0) {
            const existing = contratos[existingContratoIdx];
            existing.horas_totales = Math.max(existing.horas_totales || 0, horas_totales || 0);
            if (regular > 0) {
              existing.horas_aula = Math.max(existing.horas_aula || 0, regular);
            }
          } else {
            contratos.push({
              id: contrato_id,
              funcionario_run: run,
              rbd,
              calidad_juridica,
              funcion_principal: cargo,
              estado: 'Activo',
              horas_totales,
              horas_aula: regular
            });
          }

          const agregarFondo = (origen: OrigenFondo, hrs: number) => {
            if (hrs > 0) {
              const finId = generarUuidDeterminista(`financiamiento-${contrato_id}-${origen.replace(/\s+/g, '')}`);
              const existingFinIdx = financiamientos.findIndex(f => f.id === finId);
              if (existingFinIdx >= 0) {
                financiamientos[existingFinIdx].horas = (financiamientos[existingFinIdx].horas || 0) + hrs;
              } else {
                financiamientos.push({
                  id: finId,
                  contrato_id,
                  origen_fondo: origen,
                  horas: hrs
                });
              }
            }
          };

          agregarFondo('Subvención Regular', regular);
          agregarFondo('SEP', sep);
          agregarFondo('PIE', pie);
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
    const idxTipoContrato = getIndex(['tipocontrato', 'calidad', 'calidadjuridica', 'calidadjuridicap02', 'tipo'], -1);
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
      let nombreCompleto = `${nombres} ${apePat} ${apeMat}`.replace(/\s+/g, ' ').trim();
      if (!nombreCompleto) {
        nombreCompleto = 'SIN NOMBRE REGISTRADO';
      }
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
      const rbdVal = idxRbd !== -1 ? normalizarRbd(row[idxRbd]) : '';
      const tipoContrato = idxTipoContrato !== -1 ? String(row[idxTipoContrato] || '').trim() : '';
      const idxTermino = headers.findIndex(h => h === 'termino');
      const fechaTerminoRaw = idxTermino !== -1 ? String(row[idxTermino] || '').trim() : '';

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
      if (!rbd) {
        alertasFallback.push({
          id: generarUuidDeterminista(`alerta-missing-rbd-fallback-${run}-${i}`),
          run,
          nombre_funcionario: nombreCompleto,
          rbd: '99999',
          tipo: 'rbd_vacio',
          nivel_alerta: 'critica',
          mensaje: `Fila ${i + 1}: RBD no especificado o vacío`,
          detalle: `La fila no contiene un RBD válido y no será procesada.`,
          resuelta: false
        });
        continue;
      }

      let comuna = comunaRaw ? normalizarComuna(comunaRaw) : '';
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

      const funcion_principal = estamento === 'Docente' 
        ? normalizarCargoDocente(cargoRaw) 
        : cargoRaw || 'Asistente de la Educación';

      if (!func) {
        func = {
          run,
          nombre: nombreCompleto,
          estamento,
          cargo: funcion_principal,
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
        if (tipoContrato) {
          const tipoContClean = tipoContrato.toLowerCase();
          if (tipoContClean.includes('titular')) calidad_juridica = 'Titular';
          else if (tipoContClean.includes('reemplazo')) calidad_juridica = 'Reemplazo';
          else if (tipoContClean.includes('indefinido')) calidad_juridica = 'Indefinido';
          else if (tipoContClean.includes('plazo fijo')) calidad_juridica = 'Plazo fijo';
        } else {
          // Inferencia inteligente chilena de calidad contractual basada en fecha de término
          const termClean = fechaTerminoRaw.toLowerCase();
          if (!termClean || termClean === '' || termClean === 'nan' || termClean === '--' || termClean === 'null' || termClean === 'undefined') {
            calidad_juridica = estamento === 'Docente' ? 'Titular' : 'Indefinido';
          } else {
            calidad_juridica = estamento === 'Docente' ? 'A contrata' : 'Plazo fijo';
          }
        }

        let contrato = contratosFallback.find(c => c.funcionario_run === run && c.rbd === rbd);
        const horasRegular = idxRegular !== -1 ? parseDecimalHours(row[idxRegular]) : 0;
        const horasPIE = idxPIE !== -1 ? parseDecimalHours(row[idxPIE]) : 0;
        const horasSEP = idxSEP !== -1 ? parseDecimalHours(row[idxSEP]) : 0;
        const hasDirectDotaciones = idxRegular !== -1 || idxPIE !== -1 || idxSEP !== -1;
        
        let totalRowHoras = hasDirectDotaciones ? (horasRegular + horasPIE + horasSEP) : parseDecimalHours(row[idxHoras]);

        if (!contrato) {
          const contrato_id = generarUuidDeterminista(`contrato-${rbd}-${run.replace(/[^a-zA-Z0-9]/g, '')}`);
          contrato = {
            id: contrato_id,
            funcionario_run: run,
            rbd,
            calidad_juridica,
            funcion_principal: funcion_principal,
            estado,
            horas_totales: 0,
            legislacion_laboral
          };
          contratosFallback.push(contrato);
        }
        contrato.horas_totales = Math.max(contrato.horas_totales || 0, totalRowHoras || 0);

        const upsertFinanciamiento = (origen: OrigenFondo, hrs: number) => {
          if (hrs <= 0) return;
          const finId = generarUuidDeterminista(`financiamiento-${contrato.id}-${origen.replace(/\s+/g, '')}`);
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
      ['RBD', 'Establecimiento', 'Comuna'],
      ['3638', 'LICEO BICENTENARIO MARTA BRUNET CÁRAVES', 'Chillán'],
      ['3639', 'LICEO NARCISO TONDREAU', 'Chillán']
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
      ['RUN', 'Nombres', 'Apellido Paterno', 'Apellido Materno', 'RBD', 'Establecimiento', 'Función Principal', 'Calidad Jurídica', 'Horas Regular', 'Horas SEP', 'Horas PIE', 'Tramo Docente', 'Fecha Ingreso', 'Estamento'],
      ['12345678-9', 'María Loreto', 'González', 'Soto', '10201', 'Liceo Polivalente Manuel Bulnes', 'Docente de Aula', 'Titular', 30, 14, 0, 'Avanzado', '2018-03-01', 'Docente'],
      ['15432987-K', 'Carlos Andrés', 'Muñoz', 'Riquelme', '10202', 'Escuela E-250 San Ignacio', 'Docente de Aula', 'A contrata', 0, 0, 38, 'Inicial', '2020-03-01', 'Docente']
    ];
    const wsFunc = XLSX.utils.aoa_to_sheet(dataFunc);
    XLSX.utils.book_append_sheet(wb, wsFunc, 'Dotación y Contratos');

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

