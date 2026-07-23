import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../cacheService';

describe('Servicio de Caché Reactivo de Datos Maestros', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = CacheService.getInstance();
    cache.clearAll();
  });

  it('debe guardar y recuperar elementos dentro del TTL permitido', () => {
    cache.set('decretos_mineduc', { nivel: '1° Básico', horas: 38 }, 60000);
    const data = cache.get<{ nivel: string; horas: number }>('decretos_mineduc');

    expect(data).not.toBeNull();
    expect(data?.nivel).toBe('1° Básico');
    expect(data?.horas).toBe(38);
  });

  it('debe devolver null cuando la entrada de caché ha expirado', async () => {
    vi.useFakeTimers();
    cache.set('clave_corta', 'dato_sensible', 1000); // 1 segundo TTL

    expect(cache.get('clave_corta')).toBe('dato_sensible');

    // Avanzar tiempo 1.5 segundos
    vi.advanceTimersByTime(1500);

    expect(cache.get('clave_corta')).toBeNull();
    vi.useRealTimers();
  });

  it('debe invalidar claves individuales y claves con prefijos especificados', () => {
    cache.set('escuela_101', 'Liceo A');
    cache.set('escuela_102', 'Escuela B');
    cache.set('docente_11111111-1', 'Juan Pérez');

    cache.invalidatePrefix('escuela_');

    expect(cache.get('escuela_101')).toBeNull();
    expect(cache.get('escuela_102')).toBeNull();
    expect(cache.get('docente_11111111-1')).toBe('Juan Pérez');
  });

  it('fetchWithCache debe invocar la función remota solo una vez mientras el caché esté activo', async () => {
    const mockFetcher = vi.fn().mockResolvedValue(['Lenguaje', 'Matemática', 'Historia']);

    const res1 = await cache.fetchWithCache('asignaturas_base', mockFetcher, 60000);
    const res2 = await cache.fetchWithCache('asignaturas_base', mockFetcher, 60000);

    expect(res1).toEqual(['Lenguaje', 'Matemática', 'Historia']);
    expect(res2).toEqual(['Lenguaje', 'Matemática', 'Historia']);
    expect(mockFetcher).toHaveBeenCalledTimes(1); // Invocado únicamente la primera vez
  });
});
