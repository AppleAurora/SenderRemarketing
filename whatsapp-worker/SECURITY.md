# Seguridad de la conexión Netlify ↔ servidor WhatsApp

## Qué se puede dejar listo hoy (sin Docker)

1. Descargar el ZIP actualizado del repositorio y extraerlo.
2. Abrir PowerShell en `SenderRemarketing-main\whatsapp-worker`.
3. Ejecutar `powershell -ExecutionPolicy Bypass -File .\prepare-secrets.ps1` (o `.\prepare-secrets.ps1` si la política lo permite).
4. El script crea `.env` con una clave aleatoria criptográficamente segura. Si ya existe, **no la reemplaza**.
5. Guardar ese archivo en tu PC. No subirlo a GitHub, no compartir capturas con su contenido y no copiarlo al frontend.

## Configuración pendiente en Netlify

**No configurar todavía la URL**: el túnel de Cloudflare solo estará disponible cuando el servidor local esté encendido.

Cuando Docker y Cloudflare funcionen, entrar a Netlify → Site configuration → Environment variables y cargar:

- `WHATSAPP_SESSION_SERVICE_URL`: dirección HTTPS completa del túnel, sin barra final.
- `WHATSAPP_SESSION_SERVICE_TOKEN`: exactamente el valor de la variable del archivo `.env` (solo el valor, sin el nombre).

Configurar las variables para el entorno de producción que usa el sitio y realizar un redeploy. Estas variables **no deben comenzar con** `NEXT_PUBLIC_`.

## Modelo de protección actual

- El navegador no recibe el token del servidor.
- Next.js autentica al usuario con Supabase y verifica que la línea pertenezca a su organización antes de consultar al worker.
- El worker exige un token Bearer para las rutas de vinculación y estado.
- El puerto Docker queda restringido a `127.0.0.1:3001` en la PC.
- No abrir el puerto 3001 en el router.
- El túnel temporal HTTPS de Cloudflare es para **pruebas**, no para producción.
- No reutilizar la clave en otras aplicaciones. Si se filtra, reemplazarla en el `.env` local y en Netlify y reiniciar el servicio.
- Las credenciales de sesión de WhatsApp permanecen en un volumen Docker: proteger el equipo, sus copias de seguridad y el acceso a Docker.

**Limitaciones importantes:** el worker es experimental y usa una biblioteca no oficial. El token es compartido por todo el worker; para varias empresas reales hará falta aislamiento adicional, auditoría y control de acceso. El worker no envía mensajes todavía.
