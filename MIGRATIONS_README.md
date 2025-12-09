# Migraciones de Supabase

He configurado el sistema de migraciones para que puedas ejecutar los cambios de base de datos desde la terminal.

## Estructura creada

```
supabase/
└── migrations/
    ├── 20241209200000_add_event_image_price.sql
    ├── 20241209200001_fix_payments_rls.sql
    ├── 20241209200002_fix_events_rls.sql
    └── 20241209200003_fix_event_registrations_rls.sql
```

## Instalación de Supabase CLI

### Opción 1: Usar npx (sin instalación)

```bash
npx supabase@latest --version
```

### Opción 2: Instalación manual (WSL/Linux)

```bash
# Descargar binario
curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz

# Extraer
tar -xzf supabase.tar.gz

# Mover a PATH (necesita sudo)
sudo mv supabase /usr/local/bin/

# Verificar
supabase --version
```

### Opción 3: Con Homebrew (si tienes brew)

```bash
brew install supabase/tap/supabase
```

## Configuración inicial

1. **Inicializar Supabase** (si no está inicializado):

```bash
npx supabase@latest init
```

2. **Vincular con tu proyecto**:

```bash
npx supabase@latest link --project-ref tu-project-ref
```

Para obtener tu `project-ref`:

- Ve a https://app.supabase.com
- Selecciona tu proyecto
- Settings > General
- Copia el "Reference ID"

## Ejecutar migraciones

Una vez configurado, puedes ejecutar las migraciones con:

```bash
# Usando npx (sin instalación)
npx supabase@latest db push

# O si instalaste la CLI globalmente
supabase db push
```

### Scripts npm disponibles

He agregado scripts en `package.json` para facilitar el uso:

```bash
# Aplicar migraciones pendientes
npm run db:push

# Resetear base de datos y aplicar todas las migraciones
npm run db:reset

# Crear nueva migración
npm run db:migration:new nombre_de_la_migracion

# Ver estado de migraciones
npm run db:status
```

## Migraciones creadas

1. **20241209200000_add_event_image_price.sql**

   - Agrega `image_url` y `price` a la tabla `events`
   - Crea política pública para ver eventos

2. **20241209200001_fix_payments_rls.sql**

   - Corrige la política RLS de `payments` que causaba el error
   - Cambia de `EXISTS` con comparación a `IN` con subconsulta

3. **20241209200002_fix_events_rls.sql**

   - Asegura que coaches puedan insertar eventos
   - Verifica rol de usuario

4. **20241209200003_fix_event_registrations_rls.sql**
   - Asegura que clientes puedan registrarse a eventos
   - Verifica relación coach-cliente

## Flujo de trabajo

1. **Crear nueva migración**:

```bash
npm run db:migration:new nombre_descriptivo
```

2. **Editar el archivo SQL** en `supabase/migrations/`

3. **Aplicar migración**:

```bash
npm run db:push
```

4. **Verificar estado**:

```bash
npm run db:status
```

## Notas importantes

- Las migraciones se ejecutan en orden cronológico (por timestamp)
- Una vez aplicada, una migración no se vuelve a ejecutar
- Siempre prueba las migraciones en un entorno de desarrollo primero
- Las migraciones son idempotentes (usan `IF NOT EXISTS` cuando es posible)
