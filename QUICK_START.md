# 🚀 Inicio Rápido - RunnerCoach

## Configuración en 5 minutos

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

**Opción A: Usar el script de ayuda**

```bash
./scripts/setup-supabase.sh
```

**Opción B: Manual**

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. Copia las credenciales desde **Settings > API**
3. Crea `.env` desde `.env.example`:

```bash
cp .env.example .env
```

4. Pega tus credenciales en `.env`
5. Ejecuta `supabase/schema.sql` en el SQL Editor de Supabase

📖 **Guía detallada**: Ver `supabase/SETUP.md`

### 3. Iniciar la aplicación

```bash
npm run dev
```

### 4. Abrir en el navegador

Ve a `http://localhost:5173/`

### 5. Crear tu primera cuenta

1. Haz clic en "Registrarme como coach"
2. Completa el formulario
3. ¡Listo! Ya puedes empezar a usar la aplicación

## Próximos pasos

- ✅ Agregar clientes en la sección "Clientes"
- ✅ Registrar pagos en "Pagos"
- ✅ Crear eventos en "Eventos"
- ⚙️ Configurar Stripe en "Configuración" (opcional)

## ¿Problemas?

Consulta `supabase/SETUP.md` para solución de problemas comunes.
