#!/usr/bin/env node

/**
 * Script para obtener credenciales usando la API REST de Supabase
 * Útil cuando psql no está disponible o hay problemas de conexión (como en WSL)
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
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ Error: VITE_SUPABASE_URL debe estar en .env");
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY debe estar en .env");
  console.error(
    "   Obtén la service_role key desde: https://app.supabase.com/project/[tu-proyecto]/settings/api"
  );
  process.exit(1);
}

async function getCredentials() {
  // Usar service_role_key para tener acceso completo a auth.users
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Obtener usuarios
    const { data: coachUsers, error: coachError } =
      await supabase.auth.admin.listUsers();

    if (coachError) {
      console.error("❌ Error obteniendo usuarios:", coachError.message);
      process.exit(1);
    }

    // Obtener perfiles de usuario para filtrar por rol
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, role");

    if (profilesError) {
      console.error("❌ Error obteniendo perfiles:", profilesError.message);
      process.exit(1);
    }

    // Crear un mapa de id -> role
    const roleMap = {};
    if (profiles) {
      profiles.forEach((profile) => {
        roleMap[profile.id] = profile.role;
      });
    }

    // Buscar admin
    let adminEmail = null;
    for (const user of coachUsers.users || []) {
      if (roleMap[user.id] === "admin") {
        adminEmail = user.email;
        break;
      }
    }

    // Buscar usuario
    let userEmail = null;
    for (const user of coachUsers.users || []) {
      if (roleMap[user.id] === "user") {
        userEmail = user.email;
        break;
      }
    }

    // Imprimir resultados en formato que el script bash pueda parsear
    if (adminEmail) {
      console.log(`ADMIN_EMAIL=${adminEmail}`);
    } else {
      console.error("❌ No se encontró ningún admin en la base de datos");
    }

    if (userEmail) {
      console.log(`USER_EMAIL=${userEmail}`);
    } else {
      console.error("❌ No se encontró ningún usuario en la base de datos");
    }

    // Retornar código de salida apropiado
    if (adminEmail && userEmail) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

getCredentials();
