# Certificación y Cifrado de Software en EDE MINEDUC

Este documento sirve como guía técnica para el administrador de **saasslep** en el proceso de registro como software desarrollador y manejo de llaves públicas/privadas para la interoperabilidad con la Superintendencia de Educación y el MINEDUC.

---

## 1. Generación del Par de Llaves de saasslep

Para intercambiar información cifrada bidireccionalmente con el MINEDUC, **saasslep** debe contar con su propio par de llaves criptográficas RSA de 4096 bits. 

Ejecuta los siguientes comandos utilizando OpenSSL en tu terminal local para generar las llaves:

### Paso 1: Generar la Clave Privada (Mantener en estricto secreto)
```bash
openssl genrsa -out saasslep_private.pem 4096
```

### Paso 2: Extraer la Clave Pública (Para compartir con el MINEDUC)
```bash
openssl rsa -in saasslep_private.pem -out saasslep_public.pem -outform PEM -pubout
```

> [!WARNING]
> **Seguridad de la Llave Privada**: La llave privada `saasslep_private.pem` NUNCA debe subirse al repositorio de GitHub ni compartirse con nadie. Debe cargarse de forma segura en las variables de entorno de tu servidor de producción (Vercel) como `EDE_PRIVATE_KEY` para ser utilizada en descifrados entrantes.

---

## 2. Proceso de Registro en EDE MINEDUC

1. Ingresa al portal oficial de desarrolladores: [ede.mineduc.cl/desarrolladores/registrese-en-ede](https://www.ede.mineduc.cl/desarrolladores/reg%C3%ADstrese-en-ede).
2. Completa el formulario de registro de tu software (**saasslep**).
3. Carga el archivo de tu clave pública recién generada (`saasslep_public.pem`).
4. Una vez registrado, el MINEDUC te entregará sus respectivas credenciales y su **Llave Pública Oficial** (que ya se encuentra integrada en `src/lib/ede-crypto.ts`).

---

## 3. Mecanismo de Cifrado Híbrido Exigido

Toda información que viaje al MINEDUC debe seguir el siguiente flujo de seguridad híbrido:

1. **Generación del Dataset**: La API de saasslep genera el archivo JSON de matrícula o asistencia.
2. **Clave Simétrica AES**: Se genera una contraseña simétrica aleatoria de 32 bytes (256 bits).
3. **Cifrado de Datos (AES-256-GCM)**: El JSON se encripta con la clave simétrica anterior, generando un texto cifrado de alta velocidad, un vector de inicialización (`iv`) y un tag de autenticación.
4. **Cifrado de Clave (RSA-OAEP-SHA1)**: La clave simétrica de 32 bytes se cifra usando la **Llave Pública del MINEDUC**, asegurando que solo sus servidores puedan conocer la clave.
5. **Sobre de Envío**: El paquete exportado contiene tanto el texto de datos cifrado como la clave simétrica cifrada en formato Base64.
