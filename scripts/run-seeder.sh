#!/bin/bash

# Script para ejecutar el seeder de Supabase
# Este script intenta ejecutar el seeder usando diferentes métodos

SEED_FILE="supabase/seed.sql"

echo "🌱 Ejecutando seeder de RunnerCoach"
echo "===================================="
echo ""

# Método 1: Intentar usar Supabase CLI si está vinculado
if command -v supabase &> /dev/null || npx supabase@latest --version &> /dev/null; then
    echo "📦 Intentando ejecutar con Supabase CLI..."
    if npx supabase@latest db execute --file "$SEED_FILE" 2>/dev/null; then
        echo "✅ Seeder ejecutado exitosamente con Supabase CLI"
        exit 0
    fi
fi

# Método 2: Usar psql si tenemos las credenciales
echo "💡 Para ejecutar el seeder, tienes dos opciones:"
echo ""
echo "OPCIÓN 1: SQL Editor de Supabase (Recomendado)"
echo "1. Ve a https://app.supabase.com"
echo "2. Selecciona tu proyecto"
echo "3. Ve a SQL Editor"
echo "4. Copia y pega el contenido de: $SEED_FILE"
echo "5. Haz clic en Run"
echo ""
echo "OPCIÓN 2: Usar psql directamente"
echo "Ejecuta:"
echo "  psql -h db.[TU-PROJECT-REF].supabase.co -U postgres -d postgres -f $SEED_FILE"
echo ""
echo "Para obtener tu PROJECT-REF:"
echo "  - Ve a https://app.supabase.com"
echo "  - Settings > General"
echo "  - Copia el 'Reference ID'"
echo ""
echo "📄 Archivo del seeder: $SEED_FILE"

