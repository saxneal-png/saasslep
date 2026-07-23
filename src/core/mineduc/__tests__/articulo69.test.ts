import { describe, it, expect } from 'vitest';
import { CATEGORIAS_HORAS_CRONOLOGICAS, DESCRIPCION_LEGAL_ART_69, HorasCronologicasAdicionales, Contrato } from '@/lib/types';
import { calcularDesgloseContrato, validarCargaDocente } from '@/lib/rulesEngine';

describe('Artículo 69 Ley 19.070 & Categorías de Horas Cronológicas Adicionales', () => {
  it('debe incluir las nuevas categorías requeridas en CATEGORIAS_HORAS_CRONOLOGICAS', () => {
    expect(CATEGORIAS_HORAS_CRONOLOGICAS).toContain('Horas Directivas');
    expect(CATEGORIAS_HORAS_CRONOLOGICAS).toContain('Artículo 69 Ley 19.070 (Reducción por 30 o más años de servicio)');
    expect(CATEGORIAS_HORAS_CRONOLOGICAS).toContain('Coordinación CRA');
    expect(CATEGORIAS_HORAS_CRONOLOGICAS).toContain('Otras');
  });

  it('debe contener la fundamentación legal exacta de la Ley N° 19.070', () => {
    expect(DESCRIPCION_LEGAL_ART_69).toContain('30 o más años de servicio');
    expect(DESCRIPCION_LEGAL_ART_69).toContain('máximo de 24 horas cronológicas semanales');
    expect(DESCRIPCION_LEGAL_ART_69).toContain('artículo 69 inciso 6 de la Ley N° 19.070');
  });

  it('debe limitar la capacidad máxima de aula a 24 horas cronológicas cuando se aplique el beneficio del Art. 69', () => {
    const contrato44: Contrato = {
      id: 'contrato-art69-1',
      funcionario_run: '12.345.678-5',
      rbd: '101',
      calidad_juridica: 'A contrata',
      funcion_principal: 'Docente de Aula',
      estado: 'Activo',
      horas_totales: 44
    };

    const horasAdicionalesArt69: HorasCronologicasAdicionales[] = [
      {
        id: 'h1',
        contrato_id: 'contrato-art69-1',
        tipo: 'Artículo 69 Ley 19.070 (Reducción por 30 o más años de servicio)',
        horas: 5
      }
    ];

    const desglose = calcularDesgloseContrato(contrato44, [], [], horasAdicionalesArt69);
    
    // Tope máximo de docencia debe estar limitado a 24 horas cronológicas por el Art. 69
    expect(desglose.topeMaximoDocencia).toBe(24.0);
    expect(desglose.horasCronologicasAdicionales).toBe(5);
  });

  it('debe computar correctamente Horas Directivas y Coordinación CRA sin generar errores de validación', () => {
    const contrato30: Contrato = {
      id: 'contrato-directivo-1',
      funcionario_run: '11.111.111-1',
      rbd: '101',
      calidad_juridica: 'A contrata',
      funcion_principal: 'Docente UTP',
      estado: 'Activo',
      horas_totales: 30
    };

    const horasAdicionales: HorasCronologicasAdicionales[] = [
      {
        id: 'h2',
        contrato_id: 'contrato-directivo-1',
        tipo: 'Horas Directivas (Subvención Regular - A contrata)',
        horas: 10
      },
      {
        id: 'h3',
        contrato_id: 'contrato-directivo-1',
        tipo: 'Coordinación CRA (Subvención Regular - A contrata)',
        horas: 5
      }
    ];

    const desglose = calcularDesgloseContrato(contrato30, [], [], horasAdicionales);

    expect(desglose.horasDirectivas).toBe(10);
    expect(desglose.horasCronologicasAdicionales).toBe(15);
  });
});
