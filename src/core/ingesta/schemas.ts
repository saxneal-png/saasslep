import { z } from 'zod';

/**
 * Algoritmo Módulo 11 para la validación estricta de RUT chileno.
 */
export function validarRutChileno(rutRaw: string): boolean {
  if (!rutRaw || typeof rutRaw !== 'string') return false;
  
  // Limpiar caracteres especiales (puntos, guiones, espacios)
  const clean = rutRaw.replace(/[\.\-\s]/g, '').trim().toUpperCase();
  if (clean.length < 2) return false;

  const dvIngresado = clean.slice(-1);
  const cuerpo = clean.slice(0, -1);

  // Verificar que el cuerpo sea puramente numérico
  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let multiplicador = 2;

  // Recorrer el cuerpo de derecha a izquierda
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = suma % 11;
  const dvEsperadoCalculado = 11 - resto;

  let dvEsperadoStr = '';
  if (dvEsperadoCalculado === 11) dvEsperadoStr = '0';
  else if (dvEsperadoCalculado === 10) dvEsperadoStr = 'K';
  else dvEsperadoStr = dvEsperadoCalculado.toString();

  return dvIngresado === dvEsperadoStr;
}

/**
 * Formatea y normaliza un RUT al formato estándar "12345678-K".
 */
export function normalizarRutChileno(rutRaw: string): string {
  const clean = String(rutRaw || '').replace(/[\.\-\s]/g, '').trim().toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const cuerpo = parseInt(clean.slice(0, -1), 10);
  if (isNaN(cuerpo)) return clean;
  return `${cuerpo}-${dv}`;
}

/** Validador Zod para RUTs chilenos con mensaje personalizado */
export const RutSchema = z.coerce.string()
  .min(1, 'El RUT es obligatorio')
  .transform(normalizarRutChileno)
  .refine(validarRutChileno, { message: 'RUT chileno inválido o dígito verificador incorrecto' });

/** Validador Zod para filas de docentes procesadas en la ingesta */
export const DocenteIngestaSchema = z.object({
  rut: RutSchema,
  nombres: z.coerce.string().min(1, 'El nombre del docente es obligatorio'),
  apellidos: z.coerce.string().min(1, 'Los apellidos del docente son obligatorios'),
  rbd: z.coerce.string().min(1, 'El RBD del establecimiento es obligatorio'),
  horasContrato: z.coerce.number()
    .int('Las horas de contrato deben ser un número entero')
    .min(1, 'La jornada contractual debe ser de al menos 1 hora semanal')
    .max(44, 'La jornada contractual no puede exceder las 44 horas semanales legales'),
  horasPedagogicasAsignadas: z.coerce.number()
    .min(0, 'Las horas pedagógicas asignadas no pueden ser negativas')
    .default(0),
  tramoCarrera: z.enum(['Acceso', 'Inicial', 'Temprano', 'Avanzado', 'Experto I', 'Experto II', 'Sin Tramo'])
    .catch('Sin Tramo'),
  tipoContrato: z.enum(['Planta', 'Contrata', 'Reemplazo', 'Honorarios'])
    .catch('Contrata')
});

export type DocenteIngestaValidados = z.infer<typeof DocenteIngestaSchema>;

export interface FilaErrorValidador {
  filaIndex: number;
  campo: string;
  mensaje: string;
  valorRaw: any;
}

export interface ReporteValidacionIngesta<T> {
  totalFilas: number;
  filasValidas: T[];
  errores: FilaErrorValidador[];
  resumen: {
    validasCount: number;
    erroresCount: number;
    porcentajeValido: number;
  };
}

/**
 * Función que procesa y valida un lote de registros crudos produciendo un reporte estructurado.
 */
export function validarRegistrosIngestaDocentes(
  registrosRaw: any[]
): ReporteValidacionIngesta<DocenteIngestaValidados> {
  const filasValidas: DocenteIngestaValidados[] = [];
  const errores: FilaErrorValidador[] = [];

  registrosRaw.forEach((row, index) => {
    const parseResult = DocenteIngestaSchema.safeParse(row);
    if (parseResult.success) {
      filasValidas.push(parseResult.data);
    } else {
      parseResult.error.issues.forEach(issue => {
        errores.push({
          filaIndex: index + 1,
          campo: issue.path.join('.'),
          mensaje: issue.message,
          valorRaw: row[issue.path[0]]
        });
      });
    }
  });

  const totalFilas = registrosRaw.length;
  const validasCount = filasValidas.length;
  const erroresCount = totalFilas - validasCount;
  const porcentajeValido = totalFilas > 0 ? Math.round((validasCount / totalFilas) * 100) : 100;

  return {
    totalFilas,
    filasValidas,
    errores,
    resumen: {
      validasCount,
      erroresCount,
      porcentajeValido
    }
  };
}
