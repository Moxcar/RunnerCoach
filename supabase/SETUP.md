# Guía de Configuración de Supabase para RunnerCoach

## Paso 1: Crear cuenta y proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en "Start your project" o "Sign in"
3. Crea una cuenta (puedes usar GitHub, Google, o email)
4. Una vez dentro del dashboard, haz clic en "New Project"
5. Completa el formulario:
   - **Name**: `runnercoach` (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura (guárdala en un lugar seguro)
   - **Region**: Elige la región más cercana a ti
   - **Pricing Plan**: Free tier es suficiente para empezar
6. Haz clic en "Create new project"
7. Espera 1-2 minutos mientras se crea el proyecto

## Paso 2: Obtener las credenciales

1. En el dashboard de tu proyecto, ve a **Settings** (⚙️) en el menú lateral
2. Haz clic en **API** en el submenú
3. Encontrarás dos valores importantes:
   - **Project URL**: Esta es tu `VITE_SUPABASE_URL`
   - **anon public key**: Esta es tu `VITE_SUPABASE_ANON_KEY`
4. Copia estos valores

## Paso 3: Configurar variables de entorno

1. En la raíz del proyecto, crea un archivo `.env`:

```bash
cp .env.example .env
```

2. Abre el archivo `.env` y pega tus credenciales:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (opcional por ahora)
```

## Paso 4: Ejecutar el esquema SQL

1. En el dashboard de Supabase, ve a **SQL Editor** en el menú lateral
2. Haz clic en **New query**
3. Abre el archivo `supabase/schema.sql` de este proyecto
4. Copia todo el contenido del archivo
5. Pégalo en el editor SQL de Supabase
6. Haz clic en **Run** (o presiona Ctrl+Enter)
7. Deberías ver un mensaje de éxito confirmando que las tablas se crearon

## Paso 5: Configurar autenticación con Google (Opcional)

1. Ve a **Authentication** > **Providers** en el menú lateral
2. Busca **Google** en la lista
3. Activa el toggle
4. Necesitarás:
   - **Client ID (for OAuth)**: Obtén esto desde [Google Cloud Console](https://console.cloud.google.com/)
   - **Client Secret (for OAuth)**: También desde Google Cloud Console
5. Guarda los cambios

### Para obtener credenciales de Google OAuth:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** > **Credentials**
4. Haz clic en **Create Credentials** > **OAuth client ID**
5. Selecciona **Web application**
6. Agrega las URLs autorizadas:
   - **Authorized JavaScript origins**: `https://tu-proyecto.supabase.co`
   - **Authorized redirect URIs**: `https://tu-proyecto.supabase.co/auth/v1/callback`
7. Copia el **Client ID** y **Client Secret** a Supabase

## Paso 6: Verificar la configuración

1. Reinicia el servidor de desarrollo:

```bash
npm run dev
```

2. Ve a `http://localhost:5173/`
3. Intenta registrarte con un nuevo usuario
4. Si todo funciona, deberías poder iniciar sesión y ver el dashboard

## Solución de problemas

### Error: "Invalid API key"

- Verifica que copiaste correctamente las credenciales en `.env`
- Asegúrate de que el archivo `.env` está en la raíz del proyecto
- Reinicia el servidor después de cambiar `.env`

### Error: "relation does not exist"

- Verifica que ejecutaste el script SQL completo
- Ve a **Table Editor** en Supabase y confirma que las tablas existen

### Error de autenticación

- Verifica que RLS (Row Level Security) está habilitado
- Revisa las políticas en **Authentication** > **Policies**

## Próximos pasos

Una vez configurado Supabase, puedes:

1. Configurar Stripe para pagos (ver README.md)
2. Personalizar las políticas de seguridad según tus necesidades
3. Agregar más funcionalidades a la aplicación
