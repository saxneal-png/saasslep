import { describe, it, expect } from 'vitest';
import { validarRutChileno, normalizarRutChileno, DocenteIngestaSchema, validarRegistrosIngestaDocentes } from '../schemas';
import { procesarCsvIngestaAsincrona } from '../ingestaWorkerClient';

describe('Ingesta & Zod Schemas - Algoritmo Módulo 11 RUT', () => {
  it('debe validar RUTs chilenos legítimos con su dígito verificador correcto', () => {
    expect(validarRutChileno('12.345.678-5')).toBe(true);
    expect(validarRutChileno('123456785')).toBe(true);
    expect(validarRutChileno('11.111.111-1')).toBe(true);
  });

  it('debe rechazar RUTs con dígito verificador incorrecto o formato corrupto', () => {
    expect(validarRutChileno('12.345.678-9')).toBe(false);
    expect(validarRutChileno('11111111-0')).toBe(false);
    expect(validarRutChileno('abc-k')).toBe(false);
    expect(validarRutChileno('')).toBe(false);
  });

  it('debe normalizar RUTs al formato "12345678-K"', () => {
    expect(normalizarRutChileno('12.345.678-5')).toBe('12345678-5');
    expect(normalizarRutChileno('111111111')).toBe('11111111-1');
  });
});

describe('Ingesta & Zod Schemas - Validación de Docentes', () => {
  it('debe validar exitosamente un registro de docente correcto', () => {
    const rawDocente = {
      rut: '12.345.678-5',
      nombres: 'María Paz',
      apellidos: 'González López',
      rbd: '5678',
      horasContrato: 44,
      horasPedagogicasAsignadas: 38,
      tramoCarrera: 'Avanzado',
      tipoContrato: 'Planta'
    };

    const res = DocenteIngestaSchema.safeParse(rawDocente);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.rut).toBe('12345678-5');
      expect(res.data.horasContrato).toBe(44);
    }
  });

  it('debe rechazar contratos con horas fuera del margen legal (>44 hrs)', () => {
    const rawDocenteInvalido = {
      rut: '12.345.678-5',
      nombres: 'Carlos',
      apellidos: 'Muñoz',
      rbd: '5678',
      horasContrato: 45 // Excede 44 horas legales
    };

    const res = DocenteIngestaSchema.safeParse(rawDocenteInvalido);
    expect(res.success).toBe(false);
  });
});

describe('Ingesta Asíncrona - Procesamiento Masivo CSV', () => {
  it('debe procesar asincrónicamente un CSV produciendo un reporte estructurado', async () => {
    const csvContent = `rut,nombres,apellidos,rbd,horasContrato,horasPedagogicasAsignadas,tramoCarrera
12.345.678-5,Andrea,Silva,101,44,38,Experto I
11.111.111-1,Roberto,Rojas,101,30,20,Inicial
12.345.678-9,Invalido,Rut,101,44,38,Avanzado`;

    const reporte = await procesarCsvIngestaAsincrona(csvContent);

    expect(reporte.totalFilas).toBe(3);
    expect(reporte.resumen.validasCount).toBe(2);
    expect(reporte.resumen.erroresCount).toBe(1);
    expect(reporte.errores.length).toBeGreaterThan(0);
    expect(reporte.errores[0].filaIndex).toBe(3); // La fila 3 tiene RUT inválido
  });
});
