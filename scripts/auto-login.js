#!/usr/bin/env node

/**
 * Script para automatizar el login en Chrome usando Playwright
 * Este script hace login automáticamente y luego abre Chrome con la sesión guardada
 */

import { chromium } from "playwright";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

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
const APP_URL = process.env.APP_URL || env.APP_URL || "http://localhost:5173";
const LOGIN_URL = `${APP_URL}/login`;

async function autoLogin(email, password, profileDir, profileName) {
  console.log(`🔐 Iniciando login automático para: ${email}`);

  // Usar launchPersistentContext para mantener el perfil de Chrome
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: "chrome", // Usar Chrome instalado
    args: [`--profile-directory=${profileName}`],
  });

  const page = await context.newPage();

  try {
    // Ir a la página de login
    console.log(`📄 Navegando a: ${LOGIN_URL}`);
    await page.goto(LOGIN_URL, { waitUntil: "networkidle" });

    // Esperar a que los campos estén disponibles
    console.log("⏳ Esperando campos de formulario...");
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    // Rellenar email
    console.log("✍️  Rellenando email...");
    await page.fill('input[type="email"]', email);

    // Rellenar password
    console.log("✍️  Rellenando password...");
    await page.fill('input[type="password"]', password);

    // Hacer click en el botón de submit
    console.log("🚀 Enviando formulario...");
    await page.click('button[type="submit"]');

    // Esperar a que se complete el login (redirección)
    console.log("⏳ Esperando redirección después del login...");

    try {
      await page.waitForURL(/^\/(dashboard|client\/dashboard)/, {
        timeout: 20000,
      });
      console.log("✅ Login exitoso!");
      console.log(`📍 URL actual: ${page.url()}`);
    } catch (timeoutError) {
      // Verificar si hay mensajes de error en la página
      const errorMessage = await page
        .locator("text=/error|invalid|incorrect/i")
        .first()
        .textContent()
        .catch(() => null);

      if (errorMessage) {
        console.error(`❌ Error de login: ${errorMessage}`);
        throw new Error(`Login falló: ${errorMessage}`);
      }

      // Verificar la URL actual
      const currentUrl = page.url();
      console.log(`📍 URL actual: ${currentUrl}`);

      if (currentUrl.includes("/login")) {
        console.error(
          "❌ Aún estamos en la página de login. El login puede haber fallado."
        );
        console.error(
          "   Verifica las credenciales y que el servidor esté corriendo."
        );
        throw new Error("Login falló - aún en página de login");
      } else {
        console.log(
          "✅ Parece que el login fue exitoso (URL diferente a /login)"
        );
      }
    }

    // Mantener el navegador abierto
    console.log("🌐 Manteniendo navegador abierto...");
    console.log("   Presiona Ctrl+C para cerrar");

    console.log("✅ Login completado! El navegador permanecerá abierto.");
    console.log("   Presiona Ctrl+C en esta terminal para detener el script");
    console.log("   (El navegador seguirá abierto)");

    // Mantener el proceso vivo indefinidamente
    // El navegador permanecerá abierto
    await new Promise(() => {}); // Esperar indefinidamente
  } catch (error) {
    console.error("❌ Error durante el login:", error.message);
    if (error.message.includes("timeout")) {
      console.error(
        "   El login puede haber fallado o tomado demasiado tiempo"
      );
      console.error(
        "   Verifica las credenciales y que el servidor esté corriendo"
      );
    }
    // Cerrar el contexto solo si hay error
    await context.close();
    throw error;
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.error(
      "Uso: node scripts/auto-login.js <email> <password> <profileDir> <profileName>"
    );
    process.exit(1);
  }

  const [email, password, profileDir, profileName] = args;

  try {
    await autoLogin(email, password, profileDir, profileName);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
