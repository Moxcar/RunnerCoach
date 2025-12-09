# RunnerCoach - Plataforma de Gestión para Entrenadores de Running

Una aplicación web moderna para coaches y entrenadores de corredores que permite gestionar clientes, pagos y eventos desde un solo lugar.

## 🚀 Características

- **Gestión de Clientes**: Organiza información de tus clientes, estados de pago y notas
- **Control de Pagos**: Integración con Stripe para pagos automáticos y registro manual
- **Gestión de Eventos**: Crea y administra eventos, gestiona inscripciones
- **Dashboard Analítico**: Visualiza estadísticas y gráficos de ingresos mensuales
- **Autenticación Segura**: Login con email/password y Google OAuth

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: TailwindCSS + shadcn/ui
- **Animaciones**: Framer Motion
- **Gráficos**: Recharts
- **Backend**: Supabase (Auth, Database)
- **Pagos**: Stripe
- **Despliegue**: Vercel compatible

## 📦 Instalación

1. Clona el repositorio:

```bash
git clone <repository-url>
cd runnercoach
```

2. Instala las dependencias:

```bash
npm install
```

3. Configura las variables de entorno:

```bash
cp .env.example .env
```

Edita `.env` y agrega tus credenciales:

- `VITE_SUPABASE_URL`: URL de tu proyecto Supabase
- `VITE_SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `VITE_STRIPE_PUBLISHABLE_KEY`: Clave pública de Stripe

4. Inicia el servidor de desarrollo:

```bash
npm run dev
```

## 🗄️ Configuración de Supabase

**📖 Guía completa de configuración**: Consulta `supabase/SETUP.md` para instrucciones detalladas paso a paso.

### Resumen rápido:

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Obtén tus credenciales en **Settings > API**
3. Configura las variables en `.env`
4. Ejecuta el script SQL en `supabase/schema.sql`

### Esquema de base de datos:

El archivo `supabase/schema.sql` contiene todas las tablas necesarias:

- `clients` - Información de clientes
- `payments` - Registro de pagos
- `events` - Eventos creados por coaches
- `event_registrations` - Inscripciones de clientes a eventos

El script SQL incluye:

- ✅ Creación de todas las tablas
- ✅ Políticas de seguridad RLS (Row Level Security)
- ✅ Índices para optimización
- ✅ Triggers para actualización automática de timestamps

## 🎨 Diseño

El diseño está inspirado en el logo proporcionado, utilizando:

- Color primario: `#e9540d` (naranja)
- Color secundario: `#b07a1e` (dorado/bronce)
- Estilo moderno, limpio y deportivo
- Microinteracciones con Framer Motion

## 📝 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo
- `npm run build`: Construye la aplicación para producción
- `npm run preview`: Previsualiza la build de producción
- `npm run lint`: Ejecuta el linter

## 🚢 Despliegue

La aplicación es compatible con Vercel. Para desplegar:

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en el dashboard de Vercel
3. Despliega automáticamente en cada push a la rama principal

## 📄 Licencia

Este proyecto es privado y está destinado para uso personal/comercial.
