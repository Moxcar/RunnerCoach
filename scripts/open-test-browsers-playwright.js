#!/usr/bin/env node

/**
 * Script para abrir Chrome con perfiles de admin y usuario para pruebas
 * Usa Playwright para automatizar el login
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir, platform } from "os";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = join(__dirname, "..");

// Colores para output
const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const YELLOW = "\x1b[33m";
const NC = "\x1b[0m"; // No Color

// URL de la aplicación
const APP_URL = process.env.APP_URL || "http://localhost:5173";
const LOGIN_URL = `${APP_URL}/login`;
const PASSWORD = "password123";

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

// Obtener credenciales de Supabase
async function getCredentials() {
  const env = loadEnv();
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      `${YELLOW}⚠️  No se encontraron credenciales de Supabase${NC}`
    );
    return { adminEmail: null, userEmail: null };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Obtener usuarios
    const { data: users, error: usersError } =
      await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error(`❌ Error obteniendo usuarios: ${usersError.message}`);
      return { adminEmail: null, userEmail: null };
    }

    // Obtener perfiles de usuario para filtrar por rol
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, role");

    if (profilesError) {
      console.error(`❌ Error obteniendo perfiles: ${profilesError.message}`);
      return { adminEmail: null, userEmail: null };
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
    for (const user of users.users || []) {
      if (roleMap[user.id] === "admin") {
        adminEmail = user.email;
        break;
      }
    }

    // Buscar usuario
    let userEmail = null;
    for (const user of users.users || []) {
      if (roleMap[user.id] === "user") {
        userEmail = user.email;
        break;
      }
    }

    return { adminEmail, userEmail };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { adminEmail: null, userEmail: null };
  }
}

// Función para hacer login automático
async function autoLogin(page, email, password, label) {
  try {
    console.log(`${BLUE}   Navegando a ${LOGIN_URL}...${NC}`);
    await page.goto(LOGIN_URL, { waitUntil: "networkidle" });

    console.log(`${BLUE}   Esperando campos del formulario...${NC}`);

    // Esperar a que los campos estén disponibles
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });

    console.log(`${GREEN}   ✍️  Rellenando formulario...${NC}`);

    // Llenar el formulario
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Esperar un momento para que React procese los cambios
    await page.waitForTimeout(300);

    console.log(`${GREEN}   🚀 Enviando formulario...${NC}`);

    // Hacer clic en el botón de submit
    await page.click('button[type="submit"]');

    // Esperar a que la navegación ocurra (login exitoso)
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10000,
    });

    console.log(`${GREEN}   ✅ Login exitoso para ${label}${NC}`);
    return true;
  } catch (error) {
    console.error(
      `${YELLOW}   ⚠️  Error en auto-login para ${label}: ${error.message}${NC}`
    );
    return false;
  }
}

// Función principal
async function main() {
  console.log(`${BLUE}🚀 Abriendo Chrome para pruebas${NC}`);
  console.log(`${BLUE}================================${NC}\n`);

  // Verificar si el servidor está corriendo
  try {
    const response = await fetch(APP_URL);
    if (!response.ok) {
      throw new Error("Server not responding");
    }
  } catch (error) {
    console.error(
      `${YELLOW}⚠️  El servidor no está corriendo en ${APP_URL}${NC}`
    );
    console.error(`${YELLOW}   Inicia el servidor con: npm run dev${NC}\n`);
    process.exit(1);
  }

  // Obtener credenciales
  console.log(`${BLUE}📧 Obteniendo credenciales...${NC}`);
  let { adminEmail, userEmail } = await getCredentials();

  // Si no se obtuvieron de la API, usar variables de entorno
  adminEmail = process.env.ADMIN_EMAIL || adminEmail;
  userEmail = process.env.USER_EMAIL || userEmail;

  if (!adminEmail || !userEmail) {
    console.error(
      `${YELLOW}❌ No se pueden abrir los navegadores sin emails válidos${NC}`
    );
    console.error(
      `${YELLOW}   Por favor, proporciona los emails manualmente:${NC}`
    );
    console.error(
      `${BLUE}   ADMIN_EMAIL='email@runnercoach.test' USER_EMAIL='email@runnercoach.test' node scripts/open-test-browsers-playwright.js${NC}`
    );
    process.exit(1);
  }

  console.log(`${GREEN}✅ Credenciales obtenidas:${NC}`);
  console.log(`   Admin:  ${BLUE}${adminEmail}${NC} / ${PASSWORD}`);
  console.log(`   Usuario: ${BLUE}${userEmail}${NC} / ${PASSWORD}\n`);

  // Detectar si estamos en WSL
  let isWSL = false;
  try {
    if (platform() === "linux") {
      const version = readFileSync("/proc/version", "utf-8").toLowerCase();
      isWSL =
        version.includes("microsoft") ||
        version.includes("wsl") ||
        !!process.env.WSL_DISTRO_NAME ||
        !!process.env.WSLENV;
    }
  } catch (e) {
    // Si no podemos leer /proc/version, asumimos que no es WSL
  }

  // Directorios para perfiles de Chrome
  let adminProfileDir, userProfileDir;
  let chromeExecutablePath = null;

  let useWindowsChrome = false;
  let chromeWindowsPath = null;
  let windowsUserProfile = null;

  if (isWSL) {
    console.log(
      `${BLUE}🔍 Detectado WSL, intentando usar Chrome de Windows...${NC}`
    );

    try {
      // Obtener USERPROFILE de Windows
      try {
        const userProfileWin = execSync("cmd.exe /c echo %USERPROFILE%", {
          encoding: "utf-8",
        }).trim();
        windowsUserProfile = userProfileWin;
      } catch (e) {
        try {
          const wslVar = execSync("wslvar USERPROFILE", {
            encoding: "utf-8",
          }).trim();
          windowsUserProfile = execSync(`wslpath -w "${wslVar}"`, {
            encoding: "utf-8",
          }).trim();
        } catch (e2) {
          throw new Error("No se pudo obtener USERPROFILE de Windows");
        }
      }

      // Buscar Chrome de Windows
      const possibleChromePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        `${windowsUserProfile}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
      ];

      for (const chromePath of possibleChromePaths) {
        try {
          // Verificar si existe usando cmd
          const result = execSync(
            `cmd.exe /c if exist "${chromePath}" echo exists`,
            { encoding: "utf-8", stdio: "pipe" }
          );
          if (result.trim() === "exists") {
            chromeWindowsPath = chromePath;
            break;
          }
        } catch (e) {
          // Continuar buscando
        }
      }

      if (chromeWindowsPath) {
        console.log(
          `${GREEN}✅ Chrome de Windows encontrado: ${chromeWindowsPath}${NC}`
        );
        useWindowsChrome = true;
      } else {
        console.log(
          `${YELLOW}⚠️  No se encontró Chrome de Windows, usando Chrome de Linux${NC}\n`
        );
      }
    } catch (error) {
      console.log(
        `${YELLOW}⚠️  Error configurando Chrome de Windows: ${error.message}${NC}`
      );
      console.log(`${YELLOW}   Usando Chrome de Linux como fallback${NC}\n`);
    }
  }

  // Configurar directorios de perfiles
  if (useWindowsChrome && windowsUserProfile) {
    // Usar perfiles de Windows
    adminProfileDir = `${windowsUserProfile}\\AppData\\Local\\Google\\Chrome\\User Data\\Admin`;
    userProfileDir = `${windowsUserProfile}\\AppData\\Local\\Google\\Chrome\\User Data\\User`;
  } else {
    // Usar perfiles de Linux
    adminProfileDir = join(homedir(), ".config", "google-chrome-admin");
    userProfileDir = join(homedir(), ".config", "google-chrome-user");
  }

  // Configuración de lanzamiento del navegador
  let launchOptions;
  if (useWindowsChrome && chromeWindowsPath) {
    // Usar Chrome de Windows con remote debugging
    launchOptions = {
      headless: false,
      executablePath: chromeWindowsPath,
      args: [
        `--user-data-dir=${adminProfileDir}`, // Se sobrescribirá por contexto
        "--remote-debugging-port=9222",
      ],
    };
  } else {
    // Usar Chrome de Linux
    launchOptions = {
      headless: false,
      channel: "chrome",
    };
  }

  // Función helper para convertir rutas de Windows a WSL
  function windowsToWslPath(windowsPath) {
    if (!windowsPath) return windowsPath;
    // Convertir C:\... a /mnt/c/...
    return windowsPath
      .replace(/^([A-Z]):\\/, (match, drive) => `/mnt/${drive.toLowerCase()}/`)
      .replace(/\\/g, "/");
  }

  // Función helper para lanzar Chrome de Windows y conectarse vía CDP
  async function launchChromeWindowsAndConnect(profileDir, label, port) {
    // Construir argumentos de Chrome
    // Escapar comillas dobles en rutas para cmd.exe (doblar las comillas)
    const escapedProfileDir = profileDir.replace(/"/g, '""');
    const escapedChromePath = chromeWindowsPath.replace(/"/g, '""');
    
    const chromeArgs = [
      `--user-data-dir="${escapedProfileDir}"`,
      `--remote-debugging-port=${port}`,
      "--new-window",
      LOGIN_URL,
    ];

    console.log(`${BLUE}   Lanzando Chrome de Windows...${NC}`);

    // Lanzar Chrome usando cmd.exe con start
    // start "" "ruta" args... - el "" es el título de ventana (vacío)
    const argsString = chromeArgs.join(" ");
    const launchCommand = `cmd.exe /c start "" "${escapedChromePath}" ${argsString}`;

    try {
      execSync(launchCommand, {
        stdio: "ignore",
        windowsHide: true,
        timeout: 10000,
      });
    } catch (error) {
      console.log(
        `${YELLOW}   ⚠️  Error al lanzar Chrome: ${error.message}${NC}`
      );
      console.log(
        `${YELLOW}   Continuando... Chrome puede haberse lanzado correctamente${NC}`
      );
      // Continuar de todas formas, puede que Chrome se haya lanzado
    }

    // Esperar un momento inicial para que Chrome inicie
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Esperar a que Chrome inicie y el puerto esté disponible
    console.log(`${BLUE}   Esperando a que Chrome inicie (puerto ${port})...${NC}`);
    let connected = false;
    let attempts = 0;
    const maxAttempts = 40; // Aumentar intentos para dar más tiempo

    while (!connected && attempts < maxAttempts) {
      try {
        // Intentar conectarse vía CDP
        const browser = await chromium.connectOverCDP(
          `http://127.0.0.1:${port}`
        );
        const contexts = browser.contexts();
        let page = null;

        if (contexts.length > 0 && contexts[0].pages().length > 0) {
          page = contexts[0].pages()[0];
        } else {
          if (contexts.length === 0) {
            throw new Error("No contexts available");
          }
          page = await contexts[0].newPage();
        }

        // Navegar a la URL si la página está en blanco
        const currentUrl = page.url();
        if (currentUrl === "about:blank" || !currentUrl.includes(APP_URL)) {
          await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
        }

        // Esperar a que la página esté lista
        try {
          await page.waitForLoadState("networkidle", { timeout: 5000 });
        } catch (e) {
          // Si no está en networkidle, al menos esperar a que cargue
          await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
        }

        connected = true;
        console.log(`${GREEN}   ✅ Conectado a Chrome${NC}`);
        return { browser, page };
      } catch (error) {
        attempts++;
        if (attempts % 5 === 0) {
          console.log(
            `${BLUE}   Esperando... (${attempts}/${maxAttempts})${NC}`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!connected) {
      throw new Error(
        `No se pudo conectar a Chrome en el puerto ${port} después de ${maxAttempts} intentos. ` +
        `Asegúrate de que Chrome se haya lanzado correctamente y que el puerto ${port} no esté en uso.`
      );
    }
  }

  // Iniciar Playwright
  let browser;
  if (useWindowsChrome && chromeWindowsPath) {
    console.log(`${BLUE}🚀 Lanzando Chrome de Windows con Playwright...${NC}`);
    console.log(`${BLUE}   Chrome path: ${chromeWindowsPath}${NC}`);
    console.log(`${BLUE}   Admin profile: ${adminProfileDir}${NC}`);

    console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
    console.log(`${BLUE}  ADMIN${NC}`);
    console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
    console.log(`${GREEN}Abriendo Chrome - Admin...${NC}`);

    // Lanzar Chrome de Windows para Admin en puerto 9222
    const { browser: adminBrowser, page: adminPage } =
      await launchChromeWindowsAndConnect(adminProfileDir, "Admin", 9222);

    await autoLogin(adminPage, adminEmail, PASSWORD, "Admin");
    console.log("");

    // Esperar un poco antes de abrir el segundo perfil
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
    console.log(`${BLUE}  USUARIO${NC}`);
    console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
    console.log(`${GREEN}Abriendo Chrome - Usuario...${NC}`);

    // Lanzar Chrome de Windows para Usuario en puerto 9223
    const { browser: userBrowser, page: userPage } =
      await launchChromeWindowsAndConnect(userProfileDir, "Usuario", 9223);

    await autoLogin(userPage, userEmail, PASSWORD, "Usuario");
    console.log("");

    // No cerrar los navegadores, dejarlos abiertos
    browser = { close: async () => {} }; // Dummy browser object
  } else {
    // Usar método normal para Chrome de Linux
    browser = await chromium.launch(launchOptions);

    try {
      // Crear contexto para Admin
      console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
      console.log(`${BLUE}  ADMIN${NC}`);
      console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
      console.log(`${GREEN}Abriendo Chrome - Admin...${NC}`);

      const adminContext = await browser.newContext({
        userDataDir: adminProfileDir,
        viewport: { width: 1280, height: 720 },
      });
      const adminPage = await adminContext.newPage();
      await autoLogin(adminPage, adminEmail, PASSWORD, "Admin");
      console.log("");

      // Esperar un poco antes de abrir el segundo perfil
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Crear contexto para Usuario
      console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
      console.log(`${BLUE}  USUARIO${NC}`);
      console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
      console.log(`${GREEN}Abriendo Chrome - Usuario...${NC}`);

      const userContext = await browser.newContext({
        userDataDir: userProfileDir,
        viewport: { width: 1280, height: 720 },
      });
      const userPage = await userContext.newPage();
      await autoLogin(userPage, userEmail, PASSWORD, "Usuario");
      console.log("");
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      await browser.close();
      process.exit(1);
    }
  }

  try {
    console.log(`${GREEN}✅ Chrome abierto con dos perfiles${NC}`);
    console.log("");
    console.log(`${YELLOW}📝 Instrucciones:${NC}`);
    console.log(
      `   Los navegadores están abiertos y han iniciado sesión automáticamente`
    );
    console.log("");
    console.log(`   Los perfiles están guardados en:`);
    console.log(`   ${BLUE}Admin:${NC}  ${adminProfileDir}`);
    console.log(`   ${BLUE}Usuario:${NC} ${userProfileDir}`);
    console.log("");
    console.log(`${GREEN}✨ Listo para pruebas!${NC}`);

    // No cerrar el navegador, dejarlo abierto
    // El proceso se mantendrá activo hasta que el usuario cierre los navegadores
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await browser.close();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`❌ Error fatal: ${error.message}`);
  process.exit(1);
});
