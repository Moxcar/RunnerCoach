# Instalación de Supabase CLI

Para ejecutar migraciones desde la terminal, necesitas instalar Supabase CLI.

## Opción 1: Instalación con Homebrew (recomendado para macOS/Linux)

```bash
brew install supabase/tap/supabase
```

## Opción 2: Instalación manual (Linux/WSL)

```bash
# Descargar el binario
curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz

# Extraer
tar -xzf supabase.tar.gz

# Mover a un directorio en PATH
sudo mv supabase /usr/local/bin/

# Verificar instalación
supabase --version
```

## Opción 3: Usar npx (sin instalación global)

Puedes usar Supabase CLI sin instalarlo globalmente:

```bash
npx supabase@latest --version
```

## Después de instalar

1. **Inicializar el proyecto** (si no está inicializado):

```bash
supabase init
```

2. **Vincular con tu proyecto de Supabase**:

```bash
supabase link --project-ref tu-project-ref
```

Para obtener tu `project-ref`:

- Ve a tu proyecto en https://app.supabase.com
- Settings > General
- Copia el "Reference ID"

3. **Ejecutar migraciones**:

```bash
supabase db push
```

Esto ejecutará todas las migraciones en `supabase/migrations/` que aún no se hayan aplicado.

## Comandos útiles

- `supabase db push` - Aplicar migraciones pendientes
- `supabase db reset` - Resetear la base de datos y aplicar todas las migraciones
- `supabase migration list` - Ver estado de las migraciones
- `supabase db diff` - Ver diferencias entre local y remoto







