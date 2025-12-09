#!/usr/bin/env node

/**
 * Script para ejecutar el seeder usando la API REST de Supabase
 * Requiere: VITE_SUPABASE_URL y un service_role key (no anon key)
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error("❌ Error: VITE_SUPABASE_URL no está configurado en .env");
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ Error: Necesitas SUPABASE_SERVICE_ROLE_KEY en .env");
  console.error("   Obtén el service_role key desde:");
  console.error(
    "   https://app.supabase.com → Tu proyecto → Settings → API → service_role key"
  );
  process.exit(1);
}

const seedFile = path.join(__dirname, "..", "supabase", "seed.sql");

if (!fs.existsSync(seedFile)) {
  console.error(`❌ Error: No se encontró el archivo ${seedFile}`);
  process.exit(1);
}

const sql = fs.readFileSync(seedFile, "utf8");

console.log("🌱 Ejecutando seeder de RunnerCoach...");
console.log("📡 Conectando a Supabase...\n");

// Nota: La API REST de Supabase no permite ejecutar SQL directamente
// Este script es solo una guía. La mejor opción es usar el SQL Editor.
console.log(
  "⚠️  La API REST de Supabase no permite ejecutar SQL directamente."
);
console.log("📝 Por favor, ejecuta el seeder manualmente:\n");
console.log("1. Ve a: https://app.supabase.com");
console.log("2. Selecciona tu proyecto");
console.log("3. Ve a SQL Editor");
console.log("4. Copia y pega el contenido de: supabase/seed.sql");
console.log("5. Haz clic en Run\n");
console.log(`📄 Archivo: ${seedFile}`);
