#!/usr/bin/env node

/**
 * Script alternativo para obtener credenciales usando la API REST de Supabase
 * Útil cuando psql no está disponible o hay problemas de conexión
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = join(__dirname, "..");

// Cargar variables de entorno
function loadEnv() {
  const envPath = join(PROJECT_DIR, ".env");
  if (!existsSync(envPath)) {
    return {};
  }

  const envContent = readFileSync(envPath, "utf-8");
  const env = {};

  envContent.split("\n").forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith("#")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  });

  return env;
}

const env = loadEnv();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar en .env"
  );
  process.exit(1);
}

async function getCredentials() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Obtener coach
    const { data: coachData, error: coachError } = await supabase
      .from("user_profiles")
      .select("id, email:auth.users(email)")
      .eq("role", "coach")
      .limit(1)
      .single();

    // Método alternativo: usar RPC o consulta directa
    // Como no podemos hacer JOIN fácilmente, usamos una función SQL
    const { data: coachEmail, error: coachErr } = await supabase.rpc(
      "get_coach_email"
    );

    // Método más directo: consultar auth.users directamente (requiere service_role)
    // Por ahora, retornamos instrucciones

    console.log(
      "📧 Para obtener credenciales, ejecuta en Supabase SQL Editor:"
    );
    console.log("");
    console.log("SELECT");
    console.log("  'COACH' as tipo,");
    console.log("  u.email,");
    console.log("  'password123' as password");
    console.log("FROM auth.users u");
    console.log("JOIN user_profiles up ON u.id = up.id");
    console.log("WHERE up.role = 'coach'");
    console.log("LIMIT 1;");
    console.log("");
    console.log("SELECT");
    console.log("  'CLIENT' as tipo,");
    console.log("  u.email,");
    console.log("  'password123' as password");
    console.log("FROM auth.users u");
    console.log("JOIN user_profiles up ON u.id = up.id");
    console.log("WHERE up.role = 'client'");
    console.log("LIMIT 1;");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

getCredentials();
