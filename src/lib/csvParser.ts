// @ts-ignore
import Papa from 'papaparse';
import { Funcionario, Contrato, FinanciamientoContrato, OrigenFondo, AlertaConciliacion } from './types';

// Normalization function for RUN
export function normalizarRun(runRaw: string): string {
  if (!runRaw) return '';
  // Remove points, spaces, and hyphens
  let clean = runRaw.replace(/[\.\-\s]/g, '').trim();
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
  controlPrevioJson?: Array<{ run: string; funcion?: string; horas?: number }>
): ParseResult {
  const parsed = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const funcionarios: Funcionario[] = [];
  const contratos: Contrato[] = [];
  const financiamientos: FinanciamientoContrato[] = [];
  const alertas: AlertaConciliacion[] = [];

  parsed.data.forEach((row: any, index: number) => {
    const runRaw = row.RUN || '';
    if (!runRaw) return;

    const run = normalizarRun(runRaw);
    const nombre = (row.Nombre || 'Funcionario Sin Nombre').trim();
    const rbd = (row.RBD || rbdContext).trim();
    const calidad_juridica = (row.CalidadJuridica === 'Titular' ? 'Titular' : 'Contrata');
    const funcion_principal = (row.Funcion || 'Docente de Aula').trim();
    
    const horas_totales = parseDecimalHours(row.HorasTotales);

    // Sum subvenciones using float (parseFloat representation)
    const regular = parseDecimalHours(row.SubvencionRegular);
    const sep = parseDecimalHours(row.SEP);
    const pie = parseDecimalHours(row.PIE);
    const reforzamiento = parseDecimalHours(row.Reforzamiento);
    const proRetencion = parseDecimalHours(row.ProRetencion);
    const otro = parseDecimalHours(row.Otro);

    const sumaSubvenciones = regular + sep + pie + reforzamiento + proRetencion + otro;

    // Create unique ID for contract
    const contrato_id = `csv-${rbd}-${run.replace(/[^a-zA-Z0-9]/g, '')}`;

    // Add unique Funcionario
    if (!funcionarios.some(f => f.run === run)) {
      funcionarios.push({ run, nombre });
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
    // We compare with a small tolerance for floating point representations (0.01)
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

    // 2. Control Previo Discrepancies (Compare SIGE data with internal controls if provided)
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
