/**
 * Servicio de Caché Reactivo para Datos Maestros en el Cliente
 * Minimiza consultas repetitivas a Supabase para catálogos estáticos (Decretos MINEDUC, Asignaturas, Escuelas).
 */

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem<any>> = new Map();

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Obtiene un elemento del caché si existe y no ha expirado.
   */
  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Almacena un elemento en caché con un tiempo de vida (TTL) en milisegundos (Por defecto: 5 minutos).
   */
  public set<T>(key: string, data: T, ttlMs: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs
    });
  }

  /**
   * Invalida una clave específica del caché.
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalida todas las claves que coincidan con un prefijo (ej. 'escuela_').
   */
  public invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpia todo el contenido del caché.
   */
  public clearAll(): void {
    this.cache.clear();
  }

  /**
   * Ejecuta la función de búsqueda únicamente si no existe una entrada válida en caché.
   */
  public async fetchWithCache<T>(
    key: string,
    fetcherFn: () => Promise<T>,
    ttlMs: number = 300000
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fetcherFn();
    this.set(key, freshData, ttlMs);
    return freshData;
  }
}

export const masterDataCache = CacheService.getInstance();
