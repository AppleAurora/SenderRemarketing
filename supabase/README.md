# Configurar Supabase

1. Crear un proyecto llamado `SenderRemarketing` en https://supabase.com/dashboard.
2. Elegir una contraseña fuerte para la base de datos y guardarla en un gestor de contraseñas.
3. Abrir **SQL Editor → New query**.
4. Copiar y ejecutar el contenido completo de `schema.sql`.
5. En **Project Settings → API**, copiar el **Project URL** y la **Publishable key**.
6. Configurar las variables en local y en Netlify:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   La app también acepta la clave heredada `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
7. En **Authentication → URL Configuration**, dejar como **Site URL** el dominio principal que Netlify asigne, por ejemplo `https://tu-sitio.netlify.app`.
8. Agregar como **Redirect URLs**:
   - `http://localhost:3000/auth/confirm`
   - `https://tu-sitio.netlify.app/auth/confirm`
   Reemplazar el segundo valor por el dominio real de tu sitio.
9. Mantener activada la confirmación de correo. El registro envía al usuario a `/auth/confirm` para crear la sesión y luego abrir el dashboard.

Para previews de Netlify se puede agregar un patrón wildcard específico, pero para la primera versión conviene autorizar solo el dominio principal y localhost.

No compartir ni subir al repositorio `.env.local`, contraseñas, claves secret-role ni secretos de sesiones.
