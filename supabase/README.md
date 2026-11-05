# Configurar la base de datos

1. Crear un proyecto en Supabase.
2. Abrir **SQL Editor → New query**.
3. Copiar y ejecutar el contenido de `schema.sql`.
4. En **Project Settings → API**, copiar el Project URL y la publishable key (o anon key heredada).
5. En local, crear `.env.local` a partir de `.env.example` y completar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. En **Authentication → URL Configuration**, configurar el Site URL y los Redirect URLs para localhost y el dominio de producción.
7. Probar el registro con un correo propio. El trigger crea automáticamente un perfil, una organización y el rol owner.

No compartir ni subir al repositorio `.env.local`, contraseñas, claves service-role ni secretos de sesiones.
