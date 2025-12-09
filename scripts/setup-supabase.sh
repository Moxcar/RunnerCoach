#!/bin/bash

# Script de ayuda para configurar Supabase
# Este script te guiará a través del proceso de configuración

echo "🚀 Configuración de Supabase para RunnerCoach"
echo "=============================================="
echo ""

# Verificar si existe .env
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env desde .env.example..."
    cp .env.example .env
    echo "✅ Archivo .env creado"
    echo ""
fi

echo "📋 Pasos para configurar Supabase:"
echo ""
echo "1. Ve a https://supabase.com y crea una cuenta/proyecto"
echo "2. En Settings > API, copia:"
echo "   - Project URL → VITE_SUPABASE_URL"
echo "   - anon public key → VITE_SUPABASE_ANON_KEY"
echo ""
echo "3. Edita el archivo .env y pega tus credenciales"
echo ""
echo "4. En Supabase, ve a SQL Editor y ejecuta:"
echo "   supabase/schema.sql"
echo ""
echo "5. Reinicia el servidor: npm run dev"
echo ""
echo "📖 Para más detalles, consulta: supabase/SETUP.md"
echo ""

# Verificar si las variables están configuradas
if grep -q "your_supabase_url_here" .env 2>/dev/null; then
    echo "⚠️  Recuerda actualizar las credenciales en .env"
else
    echo "✅ Parece que ya tienes credenciales configuradas en .env"
fi

