import crypto from 'crypto';

// Llave pública oficial de MINEDUC EDE (RSA 2048 bits PEM)
const MINEDUC_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxfLqdKTtAFwh8lPf/sjE
6N3rPZqyjHNYglGQRPJ6sHHs0Ciw18v8R4eVEIwdGslFDvg3usP1PMQrW9Nyy16S
z4T5lUyPTZFgvQ0xyB1HH9gqyprxV7Rcdb5iRLj3HuUG8Bg/4mWvp5I69GpZcpPF
wm0T7Y8Np1ouErf6f+Yp6c4X0JQ5Cm8EIGmom0mRw93uouYXZ+P8WMd/EEdgRl8v
Jpgkewt99lm5SPsW3742bgfnsT38Z2vJMziXtVIPVsdH5yKGe0arAYIY6UHC+JnO
S/KjBZ609Px5Z785ZrppXiVEX0K4e294S5xhpzPuNLTAsYPfLWDjwaLZGN8hGvFS
CwIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Encripta una clave simétrica (ej: contraseña de la BD SQLCipher)
 * utilizando la llave pública del MINEDUC con relleno RSA-OAEP.
 *
 * @param symmetricKey Clave simétrica o contraseña a encriptar
 * @returns Buffer cifrado listo para guardarse como `_key.encryp`
 */
export function encryptKeyForMineduc(symmetricKey: string): Buffer {
  const bufferToEncrypt = Buffer.from(symmetricKey, 'utf8');
  return crypto.publicEncrypt(
    {
      key: MINEDUC_PUBLIC_KEY_PEM,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha1', // Estándar OpenSSL por defecto compatible con MINEDUC
    },
    bufferToEncrypt
  );
}

/**
 * Encripta texto utilizando AES-256-GCM con una clave simétrica.
 * Retorna el IV, el texto encriptado y el tag de autenticación en formato Base64.
 *
 * @param plaintext Texto a encriptar
 * @param keyHex Clave simétrica en formato hexadecimal (32 bytes / 64 caracteres)
 */
export function encryptPayloadAES256GCM(plaintext: string, keyHex: string) {
  // Asegurarse de tener 32 bytes para la clave
  const key = Buffer.from(keyHex.slice(0, 64), 'hex');
  const iv = crypto.randomBytes(12); // IV de 12 bytes recomendado para GCM
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag().toString('base64');
  
  return {
    iv: iv.toString('base64'),
    encryptedData: encrypted,
    authTag,
  };
}

/**
 * Genera un sobre EDE listo para fiscalización. Cifra los datos usando AES-256-GCM
 * y cifra la clave simétrica con la llave pública del MINEDUC mediante RSA-OAEP.
 * 
 * @param payloadData Objeto con los datos de matrícula, asistencia o consolidado
 */
export function createEdeEncryptedEnvelope(payloadData: object) {
  // 1. Generar una clave simétrica aleatoria de 32 bytes (256 bits) en formato hexadecimal
  const randomSymmetricKey = crypto.randomBytes(32).toString('hex');
  
  // 2. Encriptar la clave simétrica con la llave pública del MINEDUC usando RSA-OAEP
  const encryptedKey = encryptKeyForMineduc(randomSymmetricKey);
  
  // 3. Encriptar el payload serializado usando la clave simétrica con AES-256-GCM
  const jsonStr = JSON.stringify(payloadData);
  const encryptedPayload = encryptPayloadAES256GCM(jsonStr, randomSymmetricKey);
  
  return {
    version: 'EDE-MINEDUC-CIRCULAR1-ENCRYPTED',
    keyEncryptedBase64: encryptedKey.toString('base64'),
    ivBase64: encryptedPayload.iv,
    authTagBase64: encryptedPayload.authTag,
    encryptedPayloadBase64: encryptedPayload.encryptedData,
  };
}
