#!/usr/bin/env node

/**
 * Script para ejecutar migraciones SQL en Supabase
 * Uso: node scripts/run-migration.js <archivo-migracion.sql>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Necesitas VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Error: Debes especificar el archivo de migración');
  console.error('Uso: node scripts/run-migration.js <archivo-migracion.sql>');
  process.exit(1);
}

async function runMigration() {
  try {
    // Leer el archivo SQL
    const sql = readFileSync(migrationFile, 'utf-8');
    
    console.log(`📄 Ejecutando migración: ${migrationFile}`);
    console.log('⏳ Por favor espera...\n');

    // Crear cliente con service role key para poder ejecutar SQL
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Ejecutar el SQL usando RPC (si está disponible) o directamente
    // Nota: Supabase no tiene un endpoint directo para ejecutar SQL arbitrario
    // Necesitamos usar la API REST directamente
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      // Si RPC no existe, intentar método alternativo
      console.log('⚠️  RPC no disponible, usando método alternativo...');
      console.log('📋 Por favor ejecuta este SQL manualmente en el SQL Editor de Supabase:');
      console.log('\n' + '='.repeat(60));
      console.log(sql);
      console.log('='.repeat(60) + '\n');
      console.log('💡 Ve a: https://app.supabase.com → Tu proyecto → SQL Editor');
      return;
    }

    const result = await response.json();
    console.log('✅ Migración ejecutada exitosamente');
    console.log(result);
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.log('\n📋 Ejecuta este SQL manualmente en el SQL Editor de Supabase:');
    console.log('\n' + '='.repeat(60));
    const sql = readFileSync(migrationFile, 'utf-8');
    console.log(sql);
    console.log('='.repeat(60) + '\n');
    console.log('💡 Ve a: https://app.supabase.com → Tu proyecto → SQL Editor');
    process.exit(1);
  }
}

runMigration();

