#!/bin/bash

# Script para aplicar la migración de Storage policies
# Este script ejecuta el SQL directamente en Supabase usando psql

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_FILE="$PROJECT_DIR/supabase/migrations/20241209200009_setup_event_images_storage.sql"

# Cargar variables de entorno
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Verificar que tenemos las variables necesarias
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "❌ Error: VITE_SUPABASE_URL no está configurado en .env"
  exit 1
fi

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "❌ Error: SUPABASE_DB_PASSWORD no está configurado en .env"
  echo "💡 Puedes encontrarlo en: Supabase Dashboard → Settings → Database → Connection string"
  exit 1
fi

# Extraer el host de la URL de Supabase
# URL formato: https://xxxxx.supabase.co
SUPABASE_HOST=$(echo "$VITE_SUPABASE_URL" | sed -E 's|https?://([^.]+).*|\1|')
DB_HOST="db.${SUPABASE_HOST}"

echo "📄 Aplicando migración de Storage policies..."
echo "🔗 Conectando a: $DB_HOST"
echo ""

# Construir connection string y ejecutar SQL
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f "$MIGRATION_FILE" \
  2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migración aplicada exitosamente"
  echo ""
  echo "📋 IMPORTANTE: Asegúrate de que el bucket 'event-images' existe:"
  echo "   1. Ve a Storage en el dashboard de Supabase"
  echo "   2. Si no existe, crea el bucket 'event-images'"
  echo "   3. Márcalo como 'Public bucket' ✅"
else
  echo ""
  echo "❌ Error al aplicar la migración"
  echo ""
  echo "💡 Alternativa: Ejecuta el SQL manualmente en el SQL Editor:"
  echo "   https://app.supabase.com → Tu proyecto → SQL Editor"
  echo ""
  echo "📄 Contenido del archivo:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cat "$MIGRATION_FILE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

