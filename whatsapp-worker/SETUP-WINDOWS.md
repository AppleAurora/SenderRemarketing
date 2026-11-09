# Preparación de WhatsApp en Windows (sin costos)

Esta etapa prepara los archivos. Para iniciar el contenedor hace falta habilitar la virtualización en BIOS/UEFI y tener Docker Desktop funcionando.

## 1. Obtener el proyecto
Descargar el ZIP actualizado del repositorio y extraerlo. Abrir PowerShell en la carpeta `whatsapp-worker`.

## 2. Crear una clave privada
En PowerShell, dentro de `whatsapp-worker`:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$token = [Convert]::ToBase64String($bytes)
"WHATSAPP_SESSION_SERVICE_TOKEN=$token" | Set-Content -Path .env -Encoding ascii
```

No compartir `.env`. La clave se usará también como variable privada en Netlify cuando configuremos el túnel HTTPS.

## 3. Cuando Docker funcione

```powershell
docker compose up -d --build
docker compose ps
Invoke-RestMethod http://localhost:3001/health
```

Para ver registros: `docker compose logs -f whatsapp`.

Para detener: `docker compose down`. El volumen `whatsapp_sessions` conserva los datos. **No ejecutar** `docker compose down -v` si se quieren conservar sesiones.

## 4. Conectar Netlify más adelante
Con el contenedor activo, iniciar un túnel HTTPS de Cloudflare al puerto 3001. En Netlify configurar `WHATSAPP_SESSION_SERVICE_URL` con la URL HTTPS del túnel y `WHATSAPP_SESSION_SERVICE_TOKEN` con la misma clave de `.env`. Volver a desplegar Netlify.

El túnel rápido cambia de dirección cuando se reinicia. Es únicamente para pruebas.

## Seguridad y límites
- Puerto local publicado solo en `127.0.0.1`; no abrir el router.
- Un único número de prueba (`MAX_SESSIONS=1`).
- Los datos de autenticación quedan en un volumen Docker persistente; proteger la cuenta de Windows y los respaldos.
- La librería WhatsApp Web es no oficial y puede dejar de funcionar o causar restricciones de cuenta.
- El servicio actual **solo vincula** y consulta el estado; no envía campañas.

## 5. Gestión de sesiones desde el panel
- **Conectar QR:** inicia la sesión; pulsar Consultar estado hasta que aparezca el código.
- **Código:** intenta solicitar un código de vinculación. La disponibilidad depende de WhatsApp Web.
- **Detener:** cierra el cliente en el servidor y deja las credenciales locales para un posible reinicio. **No garantiza desvincular el dispositivo del teléfono**; para hacerlo por completo, usar WhatsApp → Dispositivos vinculados.
- **Reintentar:** si el worker informa desconexión o error, volver a pulsar Conectar QR.
- Para cambiar de QR a código en una sesión pendiente, primero usar Detener.

## 6. Qué NO está implementado
- No se ha ejecutado una prueba real de vinculación ni de persistencia.
- No existe envío automático desde el worker; las campañas quedan programadas en la base de datos.
- No se ha conectado aún Netlify al túnel local.
- Para producción con múltiples empresas y líneas se requiere mayor aislamiento y control operativo.
