import { describe, it, expect } from 'vitest';
import { DocenteItem } from '../ListaDinamicaDocentes';
import { calcularJornadaMinutos } from '@/core/mineduc/calculoJornada';

const MOCK_DOCENTES: DocenteItem[] = [
  {
    rut: '12345678-5',
    nombres: 'María Paz',
    apellidos: 'González',
    rbd: '101',
    horasContrato: 44,
    horasPedagogicasAsignadas: 38,
    tramoCarrera: 'Avanzado',
    tipoContrato: 'Planta'
  },
  {
    rut: '11111111-1',
    nombres: 'Carlos',
    apellidos: 'Rojas',
    rbd: '101',
    horasContrato: 44,
    horasPedagogicasAsignadas: 39, // Sobreasignado
    tramoCarrera: 'Inicial',
    tipoContrato: 'Contrata'
  },
  {
    rut: '9876543-2',
    nombres: 'Patricia',
    apellidos: 'Silva',
    rbd: '102',
    horasContrato: 30,
    horasPedagogicasAsignadas: 15, // Vacante
    tramoCarrera: 'Experto I',
    tipoContrato: 'Contrata'
  }
];

describe('Componente ListaDinamicaDocentes - Filtrado & Agrupación', () => {
  it('debe calcular la distribución horaria para cada docente de la lista', () => {
    const doc1 = MOCK_DOCENTES[0];
    const res1 = calcularJornadaMinutos(doc1.horasContrato, doc1.horasPedagogicasAsignadas);
    expect(res1.cumple65_35).toBe(true);
    expect(res1.esSobreasignado).toBe(false);

    const doc2 = MOCK_DOCENTES[1];
    const res2 = calcularJornadaMinutos(doc2.horasContrato, doc2.horasPedagogicasAsignadas);
    expect(res2.esSobreasignado).toBe(true);
    expect(res2.minutosSobreasignados).toBe(45);
  });

  it('debe filtrar docentes por consulta de búsqueda', () => {
    const query = 'María';
    const filtrados = MOCK_DOCENTES.filter(d => 
      `${d.nombres} ${d.apellidos}`.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtrados.length).toBe(1);
    expect(filtrados[0].nombres).toBe('María Paz');
  });

  it('debe clasificar docentes según semáforo de riesgo', () => {
    const sobreasignados = MOCK_DOCENTES.filter(d => {
      const res = calcularJornadaMinutos(d.horasContrato, d.horasPedagogicasAsignadas);
      return res.esSobreasignado;
    });

    const vacantes = MOCK_DOCENTES.filter(d => {
      const res = calcularJornadaMinutos(d.horasContrato, d.horasPedagogicasAsignadas);
      return !res.esSobreasignado && res.horasPedagogicasVacantes > 0;
    });

    expect(sobreasignados.length).toBe(1);
    expect(sobreasignados[0].rut).toBe('11111111-1');

    expect(vacantes.length).toBe(1);
    expect(vacantes[0].rut).toBe('9876543-2');
  });
});
