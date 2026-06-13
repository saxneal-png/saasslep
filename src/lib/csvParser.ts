// @ts-ignore
import Papa from 'papaparse';
import { Funcionario, Contrato, FinanciamientoContrato, OrigenFondo, AlertaConciliacion, RegistroRemuneracion } from './types';

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
}

export interface ParseResult {
  funcionarios: Funcionario[];
  contratos: Contrato[];
  financiamientos: FinanciamientoContrato[];
  alertas: AlertaConciliacion[];
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
    }

    if (!runRaw) return;

    const run = normalizarRun(runRaw);
    
    let nombre = 'Funcionario Sin Nombre';
    if (row.Nombre || row.nombre) {
      nombre = (row.Nombre || row.nombre).trim();
    } else if (row.DOC_NOMBRE || row.doc_nombre) {
      const nom = (row.DOC_NOMBRE || row.doc_nombre || '').trim();
      const pat = (row.DOC_PATERNO || row.doc_paterno || '').trim();
      const mat = (row.DOC_MATERNO || row.doc_materno || '').trim();
      nombre = `${nom} ${pat} ${mat}`.replace(/\s+/g, ' ').trim();
    }

    const rbd = String(row.RBD || row.rbd || rbdContext).trim();
    const calidad_juridica = ((row.CalidadJuridica || row.calidad_juridica || row.CALIDAD_JURIDICA) === 'Titular' ? 'Titular' : 'Contrata');
    const funcion_principal = (row.Funcion || row.funcion || row.FUNCION_PRINCIPAL || row.funcion_principal || 'Docente de Aula').trim();
    const estamento = forceEstamento || (row.Estamento || row.estamento || (funcion_principal.toLowerCase().includes('docente') || funcion_principal.toLowerCase().includes('profesor') ? 'Docente' : 'Asistente de la Educación'));
    
    const horas_totales = parseDecimalHours(row.HorasTotales || row.horas_totales || row.HORAS_CONTRATO || row.horas_contrato);

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

    // Add unique Funcionario with estamento
    const titulo = String(row.Titulo || row.titulo || row.TITULO || row.DOC_TITULO || row.doc_titulo || row.TituloProfesional || row.titulo_profesional || '').trim();
    if (!funcionarios.some(f => f.run === run)) {
      funcionarios.push({ 
        run, 
        nombre, 
        estamento: estamento === 'Docente' ? 'Docente' : 'Asistente de la Educación',
        cargo: funcion_principal,
        titulo: titulo || undefined
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
      horas_totales
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

    // 2. Control Previo Discrepancies
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

    result.push({
      id: `rem-${run.replace(/[^a-zA-Z0-9]/g, '')}-${idx}`,
      funcionario_run: run,
      nombre_esta: row.NombreEsta || row.nombre_esta || row.Establecimiento || row.establecimiento || undefined,
      horas_pagadas,
      total_haberes,
      mes_pago,
      grupo_estamento
    });
  });

  return result;
}

