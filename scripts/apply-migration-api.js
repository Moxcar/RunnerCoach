#!/usr/bin/env node

/**
 * Script para mostrar la migración SQL que debe ejecutarse
 */

const { readFileSync } = require('fs');
const { join, dirname } = require('path');

const scriptDir = __dirname;
const projectDir = join(scriptDir, '..');
const migrationFile = join(projectDir, 'supabase/migrations/20241209200009_setup_event_images_storage.sql');

function showMigration() {
  try {
    const sql = readFileSync(migrationFile, 'utf-8');
    
    console.log('\n📋 Migración de Storage Policies para event-images');
    console.log('━'.repeat(70));
    console.log('');
    console.log('💡 Ejecuta este SQL en el SQL Editor de Supabase:');
    console.log('');
    console.log('🔗 https://app.supabase.com → Tu proyecto → SQL Editor');
    console.log('');
    console.log('━'.repeat(70));
    console.log(sql);
    console.log('━'.repeat(70));
    console.log('');
    console.log('📝 Pasos:');
    console.log('   1. Copia el SQL de arriba');
    console.log('   2. Ve al SQL Editor en Supabase');
    console.log('   3. Pega el SQL y haz clic en "Run"');
    console.log('');
    console.log('⚠️  IMPORTANTE: Asegúrate de crear el bucket "event-images" primero:');
    console.log('   Storage → New bucket → Name: event-images → Public bucket ✅');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error leyendo el archivo de migración:', error.message);
    process.exit(1);
  }
}

showMigration();
