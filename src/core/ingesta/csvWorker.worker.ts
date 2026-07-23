import Papa from 'papaparse';
import { validarRegistrosIngestaDocentes, ReporteValidacionIngesta, DocenteIngestaValidados } from './schemas';

export interface WorkerInputMessage {
  type: 'PARSE_CSV';
  payload: {
    csvContent: string;
  };
}

export interface WorkerProgressMessage {
  type: 'PROGRESS';
  progressPercent: number;
  processedRows: number;
  totalRows: number;
}

export interface WorkerSuccessMessage {
  type: 'SUCCESS';
  reporte: ReporteValidacionIngesta<DocenteIngestaValidados>;
}

export interface WorkerErrorMessage {
  type: 'ERROR';
  message: string;
}

export type WorkerOutputMessage = WorkerProgressMessage | WorkerSuccessMessage | WorkerErrorMessage;

// Manejador de eventos en el Worker thread
self.onmessage = (event: MessageEvent<WorkerInputMessage>) => {
  const { type, payload } = event.data;

  if (type === 'PARSE_CSV') {
    try {
      const csvText = payload.csvContent;
      const parseResult = Papa.parse<Record<string, any>>(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });

      if (parseResult.errors && parseResult.errors.length > 0 && parseResult.data.length === 0) {
        const errorMsg = parseResult.errors.map(e => e.message).join('; ');
        self.postMessage({ type: 'ERROR', message: `Error leyendo estructura CSV: ${errorMsg}` } as WorkerErrorMessage);
        return;
      }

      const rows = parseResult.data;
      const totalRows = rows.length;

      // Reportar 25% de avance tras lectura inicial de estructura
      self.postMessage({
        type: 'PROGRESS',
        progressPercent: 25,
        processedRows: 0,
        totalRows
      } as WorkerProgressMessage);

      // Mapear campos flexibles del CSV (headers variables como RUT, Run, Horas, etc.)
      const registrosMapeados = rows.map((r: any) => {
        return {
          rut: r.rut || r.RUT || r.Run || r.RUN || r['R.U.T.'] || '',
          nombres: r.nombres || r.Nombres || r.Nombre || r.NOMBRE || '',
          apellidos: r.apellidos || r.Apellidos || r.Apellido || r.APELLIDO || '',
          rbd: r.rbd || r.RBD || r.Rbd || r['RBD Escuela'] || '',
          horasContrato: r.horasContrato || r.horas_contrato || r['Horas Contrato'] || r['Jornada'] || 0,
          horasPedagogicasAsignadas: r.horasPedagogicasAsignadas || r['Horas Aula'] || r['Horas Lectivas'] || 0,
          tramoCarrera: r.tramoCarrera || r['Tramo'] || r['Tramo Carrera'] || 'Sin Tramo',
          tipoContrato: r.tipoContrato || r['Tipo Contrato'] || r['Calidad Juridica'] || 'Contrata'
        };
      });

      // Reportar 50% de avance tras normalización
      self.postMessage({
        type: 'PROGRESS',
        progressPercent: 50,
        processedRows: Math.floor(totalRows / 2),
        totalRows
      } as WorkerProgressMessage);

      // Ejecutar validaciones Zod estStrict
      const reporte = validarRegistrosIngestaDocentes(registrosMapeados);

      // Reportar 100% de éxito y devolver reporte final
      self.postMessage({
        type: 'SUCCESS',
        reporte
      } as WorkerSuccessMessage);
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        message: err?.message || 'Error desconocido procesando la planilla CSV'
      } as WorkerErrorMessage);
    }
  }
};
