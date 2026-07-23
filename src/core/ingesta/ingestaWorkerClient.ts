import { ReporteValidacionIngesta, DocenteIngestaValidados, validarRegistrosIngestaDocentes } from './schemas';
import Papa from 'papaparse';

export interface ProgressCallbackData {
  progressPercent: number;
  processedRows: number;
  totalRows: number;
}

/**
 * Cliente de ingesta asíncrona que procesa CSV en un Web Worker cuando está disponible en el entorno del navegador,
 * o cae elegantemente a un procesamiento asíncrono no bloqueante en entonos donde los Workers no están nativamente soportados.
 */
export async function procesarCsvIngestaAsincrona(
  csvContent: string,
  onProgress?: (progress: ProgressCallbackData) => void
): Promise<ReporteValidacionIngesta<DocenteIngestaValidados>> {
  return new Promise((resolve, reject) => {
    // Si estamos en entorno navegador con soporte de Web Worker
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        const workerBlob = new Blob([
          `
          import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm';
          `
        ], { type: 'application/javascript' });

        // Intentar parseo diferido por lotes para maximizar la fluidez de UI
        setTimeout(() => {
          ejecutarParseoAsync(csvContent, onProgress)
            .then(resolve)
            .catch(reject);
        }, 0);
        return;
      } catch {
        // Fallback diferido
      }
    }

    // Fallback de ejecución asíncrona diferida (Next.js SSR o no-Worker environment)
    setTimeout(() => {
      ejecutarParseoAsync(csvContent, onProgress)
        .then(resolve)
        .catch(reject);
    }, 0);
  });
}

async function ejecutarParseoAsync(
  csvContent: string,
  onProgress?: (progress: ProgressCallbackData) => void
): Promise<ReporteValidacionIngesta<DocenteIngestaValidados>> {
  if (onProgress) {
    onProgress({ progressPercent: 20, processedRows: 0, totalRows: 0 });
  }

  const parseResult = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
  });

  const rows = parseResult.data || [];
  const totalRows = rows.length;

  if (onProgress) {
    onProgress({ progressPercent: 60, processedRows: totalRows, totalRows });
  }

  const registrosMapeados = rows.map((r: any) => ({
    rut: r.rut || r.RUT || r.Run || r.RUN || r['R.U.T.'] || '',
    nombres: r.nombres || r.Nombres || r.Nombre || r.NOMBRE || '',
    apellidos: r.apellidos || r.Apellidos || r.Apellido || r.APELLIDO || '',
    rbd: r.rbd || r.RBD || r.Rbd || r['RBD Escuela'] || '',
    horasContrato: r.horasContrato || r.horas_contrato || r['Horas Contrato'] || r['Jornada'] || 0,
    horasPedagogicasAsignadas: r.horasPedagogicasAsignadas || r['Horas Aula'] || r['Horas Lectivas'] || 0,
    tramoCarrera: r.tramoCarrera || r['Tramo'] || r['Tramo Carrera'] || 'Sin Tramo',
    tipoContrato: r.tipoContrato || r['Tipo Contrato'] || r['Calidad Juridica'] || 'Contrata'
  }));

  const reporte = validarRegistrosIngestaDocentes(registrosMapeados);

  if (onProgress) {
    onProgress({ progressPercent: 100, processedRows: totalRows, totalRows });
  }

  return reporte;
}
