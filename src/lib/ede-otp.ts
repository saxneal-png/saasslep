export interface MineducOtpValidationResponse {
  isValid: boolean;
  message?: string;
  rawResponse?: unknown;
}

/**
 * Formatea una fecha en formato ISO 8601 con el desfase de zona horaria actual de Chile (America/Santiago).
 * Ejemplo de salida: 2026-08-07T14:30:00-04:00
 */
export function getChileIsoString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const findPart = (type: string) => parts.find(p => p.type === type)?.value ?? '00';

    const yyyy = findPart('year');
    const mm = findPart('month');
    const dd = findPart('day');
    const hh = findPart('hour');
    const mi = findPart('minute');
    const ss = findPart('second');

    // Determinar desfase dinámico comparando la hora UTC con la hora de Chile
    const santiagoString = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
    
    // Obtener fecha UTC
    const tempUtc = new Date(date.toISOString().replace('Z', ''));
    // Formateador UTC de comparación
    const utcFormatter = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const utcParts = utcFormatter.formatToParts(date);
    const findUtcPart = (type: string) => utcParts.find(p => p.type === type)?.value ?? '00';

    const utcDate = new Date(
      `${findUtcPart('year')}-${findUtcPart('month')}-${findUtcPart('day')}T${findUtcPart('hour')}:${findUtcPart('minute')}:${findUtcPart('second')}`
    );
    const santiagoDate = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`);
    
    const diffHours = Math.round((santiagoDate.getTime() - utcDate.getTime()) / 3600000);
    const offsetSign = diffHours >= 0 ? '+' : '-';
    const offsetHours = String(Math.abs(diffHours)).padStart(2, '0');
    const offsetString = `${offsetSign}${offsetHours}:00`;

    return `${santiagoString}${offsetString}`;
  } catch {
    // Fallback básico en caso de que Intl no esté totalmente soportado en el entorno
    return date.toISOString().replace('Z', '-04:00');
  }
}

/**
 * Valida la firma transaccional OTP de un docente contra los servidores de MINEDUC EDE.
 *
 * @param rut RUN del docente (ej. "14206906-3")
 * @param otp Código OTP de 6 dígitos ingresado por el usuario
 * @returns Promesa con resultado de validación
 */
export async function verifyMineducTeacherOtp(
  rut: string,
  otp: string
): Promise<MineducOtpValidationResponse> {
  try {
    // Formatear timestamp actual con la zona horaria de Chile continental
    const dateWithTimeZone = getChileIsoString(new Date());
    
    const url = new URL('https://apiede.mineduc.cl/otp/verify-otp');
    url.searchParams.append('rut', rut.trim());
    url.searchParams.append('otp', otp.trim());
    url.searchParams.append('DateWithTimeZone', dateWithTimeZone);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        isValid: false,
        message: `Error en la API del MINEDUC: Status ${response.status}`,
      };
    }

    const data = await response.json();
    
    // La API de MINEDUC retorna un indicador booleano sobre la validez
    const isValid = typeof data === 'boolean' ? data : Boolean(data?.status || data?.valid);
    
    return {
      isValid,
      rawResponse: data,
    };
  } catch (error) {
    console.error('Error al verificar OTP en MINEDUC:', error);
    return {
      isValid: false,
      message: 'No se pudo establecer conexión con el servidor de autenticación EDE MINEDUC',
    };
  }
}
